import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let adminClientInstance: SupabaseClient<any> | null = null;

/**
 * Check whether Supabase environment variables are properly configured.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Returns a privileged Supabase client using the Service Role Secret Key.
 * Suitable for server-side API routes, background workers, and RPC calls.
 */
export function getSupabaseAdmin(): SupabaseClient<any> {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'
    );
  }

  adminClientInstance = createClient<any>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClientInstance;
}

/**
 * Singleton instance of the admin Supabase client.
 */
export const supabaseAdmin = {
  get client(): SupabaseClient<any> {
    return getSupabaseAdmin();
  },
};

