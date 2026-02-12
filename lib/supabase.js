import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof window !== 'undefined'
    ? window.location.origin + '/_supabase'
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
