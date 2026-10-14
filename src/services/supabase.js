import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or runtime config
const getStoredCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem('infoyashonand_supabase_url');
  const localKey = localStorage.getItem('infoyashonand_supabase_key');

  let supabaseUrl = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || '';
  const supabaseKey = (localKey && localKey.trim()) || (envKey && envKey.trim()) || '';

  // Route through proxy (/supabase-api) on any browser/device (phone, tablet, PC)
  // to prevent Origin secret key rejection, CORS blocks, and ISP DNS failures
  if (
    typeof window !== 'undefined' &&
    window.location &&
    (import.meta.env.DEV ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.') ||
      window.location.port !== '')
  ) {
    supabaseUrl = `${window.location.origin}/supabase-api`;
  }

  return { supabaseUrl, supabaseKey };
};

let clientInstance = null;
let currentUrl = '';
let currentKey = '';

export const getSupabaseClient = () => {
  const { supabaseUrl, supabaseKey } = getStoredCredentials();

  // Validate format
  const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http') || supabaseUrl.startsWith('/'));
  const isValidKey = supabaseKey && supabaseKey.length > 20;

  if (!isValidUrl || !isValidKey) {
    return null;
  }

  if (!clientInstance || currentUrl !== supabaseUrl || currentKey !== supabaseKey) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseKey);
      currentUrl = supabaseUrl;
      currentKey = supabaseKey;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
};

export const setCustomSupabaseCredentials = (url, key) => {
  if (url) localStorage.setItem('infoyashonand_supabase_url', url.trim());
  else localStorage.removeItem('infoyashonand_supabase_url');

  if (key) localStorage.setItem('infoyashonand_supabase_key', key.trim());
  else localStorage.removeItem('infoyashonand_supabase_key');

  clientInstance = null;
  return getSupabaseClient();
};

export const getSupabaseConfigStatus = () => {
  const { supabaseUrl, supabaseKey } = getStoredCredentials();
  const isConfigured = Boolean(supabaseUrl && supabaseKey && supabaseKey.length > 20);
  return {
    isConfigured,
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseKey ? (supabaseKey.slice(0, 10) + '...' + supabaseKey.slice(-5)) : ''
  };
};
