import https from 'node:https';

export default async function handler(req, res) {
  // Global CORS headers for seamless browser access from Chrome, mobile, etc.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let subPath = req.url || '';

    // Strip /supabase-api or /api prefix if present in req.url
    if (subPath.startsWith('/supabase-api/')) subPath = subPath.slice(13);
    else if (subPath.startsWith('/supabase-api')) subPath = subPath.slice(12);
    else if (subPath.startsWith('/api/')) subPath = subPath.slice(4);
    else if (subPath.startsWith('/api')) subPath = subPath.slice(3);

    // If routed to proxy endpoint without path segment, retrieve path from rewrite query
    if (subPath.startsWith('/proxy') || subPath.startsWith('proxy') || !subPath || subPath === '/') {
      const p = req.query?.path || req.query?.match || '';
      const joined = Array.isArray(p) ? p.join('/') : p;
      subPath = joined ? (joined.startsWith('/') ? joined : '/' + joined) : '';
      const qIndex = req.url.indexOf('?');
      if (qIndex !== -1) {
        subPath += req.url.slice(qIndex);
      }
    }

    if (!subPath.startsWith('/')) subPath = '/' + subPath;

    // Strip routing query params (match, path) so PostgREST never parses them as SQL/table filters
    if (subPath.includes('?')) {
      const [pathPart, queryPart] = subPath.split('?');
      const params = new URLSearchParams(queryPart);
      params.delete('path');
      params.delete('match');
      const remaining = params.toString();
      subPath = pathPart + (remaining ? '?' + remaining : '');
    }

    const targetPath = subPath;

    // Collect request body for POST/PUT/PATCH/DELETE
    let bodyData = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string') {
        bodyData = Buffer.from(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        bodyData = req.body;
      } else if (req.body && typeof req.body === 'object') {
        bodyData = Buffer.from(JSON.stringify(req.body));
      } else {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        if (chunks.length > 0) {
          bodyData = Buffer.concat(chunks);
        }
      }
    }

    // Strip browser identifiers so Supabase Gateway accepts the API key without 401
    const headers = {};
    for (const [key, val] of Object.entries(req.headers)) {
      const k = key.toLowerCase();
      if (
        k === 'host' ||
        k === 'user-agent' ||
        k === 'origin' ||
        k === 'referer' ||
        k.startsWith('sec-') ||
        k.startsWith('x-vercel-') ||
        k.startsWith('x-forwarded-')
      ) {
        continue;
      }
      headers[key] = val;
    }

    headers['host'] = 'fxgyxtdwzcgkajrvdgro.supabase.co';
    headers['user-agent'] = 'Node-Supabase-Backend/1.0';

    if (bodyData && !headers['content-length']) {
      headers['content-length'] = bodyData.length;
    }

    const executeRequest = (targetHost, isIpFallback = false) => {
      return new Promise((resolve) => {
        const reqOptions = {
          method: req.method,
          host: targetHost,
          servername: 'fxgyxtdwzcgkajrvdgro.supabase.co',
          path: targetPath,
          headers,
          timeout: 10000
        };

        const proxyReq = https.request(reqOptions, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
          resolve(true);
        });

        proxyReq.on('error', (err) => {
          if (!isIpFallback) {
            console.warn('Proxy DNS lookup failed, falling back to direct Cloudflare IP:', err.message);
            executeRequest('104.18.38.10', true).then(resolve);
          } else {
            console.error('Supabase proxy error:', err);
            res.writeHead(502, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'Supabase proxy connection failed: ' + err.message }));
            resolve(false);
          }
        });

        if (bodyData) {
          proxyReq.write(bodyData);
        }
        proxyReq.end();
      });
    };

    await executeRequest('fxgyxtdwzcgkajrvdgro.supabase.co', false);
  } catch (err) {
    console.error('Proxy handler caught error:', err);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
