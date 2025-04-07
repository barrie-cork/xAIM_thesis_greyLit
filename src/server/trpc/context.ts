import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { NextRequest } from 'next/server';
import { prisma } from '../db/client';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../lib/supabase/types';

// Define the options for our context creation function
export interface CreateContextOptions {
  req: NextRequest;
  requestId?: string;
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async (opts: CreateContextOptions) => {
  const { req, requestId } = opts;
  
  // Create Supabase server client using cookies from the request
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set() {
          // We don't need to set cookies in this context
          // The response will be handled separately
        },
        remove() {
          // We don't need to remove cookies in this context
        },
      },
    }
  );

  // Get the user's session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    req,
    prisma,
    supabase,
    session,
    userId: session?.user?.id,
    requestId,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>; 