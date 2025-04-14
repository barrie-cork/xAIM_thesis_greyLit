/**
 * This file is a compatibility layer for the new auth implementation.
 * It re-exports the functions from @/lib/supabase/client to maintain backward compatibility.
 */

import { createClient as createClientFromLib } from '@/lib/supabase/client';

/**
 * Create a Supabase client for client components
 * @returns A Supabase client
 */
export function createClient() {
  return createClientFromLib();
}
