import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let supabaseBrowserInstance: SupabaseClient<any> | null = null;

/**
 * Returns a Supabase client for use in browser/client components.
 * Reuses the singleton instance across client renders.
 */
export function getSupabaseBrowserClient(): SupabaseClient<any> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (supabaseBrowserInstance) {
    return supabaseBrowserInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key missing from environment.');
    return null;
  }

  supabaseBrowserInstance = createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseBrowserInstance;
}


export const supabase = typeof window !== 'undefined' ? getSupabaseBrowserClient() : null;
