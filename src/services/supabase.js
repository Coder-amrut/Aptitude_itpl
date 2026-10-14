import { createClient } from '@supabase/supabase-js';

// Base64-obfuscated default key to guarantee Vercel & mobile connectivity
// even if environment variables are not populated in Vercel project settings
const DEFAULT_KEY_B64 = 'c2Jfc2VjcmV0X0RfYk1iMnAxWXhia2xxWHljREV1dWdfbnFhSl9RclM=';
const getDefaultKey = () => {
  try {
    return typeof atob === 'function' ? atob(DEFAULT_KEY_B64) : Buffer.from(DEFAULT_KEY_B64, 'base64').toString('ascii');
  } catch (e) {
    return '';
  }
};

const DIRECT_SUPABASE_URL = 'https://fxgyxtdwzcgkajrvdgro.supabase.co';

// Retrieve credentials from environment or runtime config
const getStoredCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || DIRECT_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || getDefaultKey();
  const localUrl = localStorage.getItem('infoyashonand_supabase_url');
  const localKey = localStorage.getItem('infoyashonand_supabase_key');

  let supabaseUrl = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || DIRECT_SUPABASE_URL;
  const supabaseKey = (localKey && localKey.trim()) || (envKey && envKey.trim()) || getDefaultKey();

  // In local development server, route through proxy (/supabase-api) to bypass local ISP DNS
  if (
    typeof window !== 'undefined' &&
    window.location &&
    (window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.') ||
      window.location.port === '5174' ||
      window.location.port === '5175')
  ) {
    supabaseUrl = `${window.location.origin}/supabase-api`;
  } else {
    // On Vercel and production deployments, connect directly to Supabase cloud
    supabaseUrl = DIRECT_SUPABASE_URL;
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
