import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';

// Cloudflare proxy agent to bypass broken ISP DNS (NXDOMAIN) on Windows
const agent = new https.Agent({
  lookup: (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    const ip = '104.18.38.10';
    if (options && options.all) {
      callback(null, [{ address: ip, family: 4 }]);
    } else {
      callback(null, ip, 4);
    }
  }
});

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: {
      '/supabase-api': {
        target: 'https://fxgyxtdwzcgkajrvdgro.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-api/, ''),
        secure: true,
        agent: agent,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('sec-fetch-mode');
            proxyReq.removeHeader('sec-fetch-site');
            proxyReq.removeHeader('sec-fetch-dest');
            proxyReq.setHeader('User-Agent', 'Node-Supabase-Backend/1.0');
          });
        }
      }
    }
  }
});
