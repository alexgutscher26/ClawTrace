import { createClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';
const supabaseUrl = isBrowser
  ? window.location.origin + '/api/supabase-proxy'
  : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (isBrowser) {
  console.log('[Supabase] Initializing client with URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
