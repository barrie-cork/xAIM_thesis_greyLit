import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { prisma } from '../db/client';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../lib/supabase/types';

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  
  // Create Supabase server client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = req.cookies[name];
          return cookie;
        },
        set(name: string, value: string, options: any) {
          res.setHeader('Set-Cookie', `${name}=${value}; Path=${options.path || '/'}; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''}`);
        },
        remove(name: string, options: any) {
          res.setHeader('Set-Cookie', `${name}=; Path=${options.path || '/'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''}`);
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
    res,
    prisma,
    supabase,
    session,
    userId: session?.user?.id,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>; 