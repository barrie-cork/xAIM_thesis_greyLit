import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/router';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { prisma } from '@/server/db/client';

const handler = async (req: Request) => {
  // Create Supabase server client
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // We don't need to set cookies in a fetch handler
        },
        remove() {
          // We don't need to remove cookies in a fetch handler
        },
      },
    }
  );

  // Get the user's session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Create context
  const createContext = async () => {
    return {
      req,
      prisma,
      supabase,
      session,
      userId: session?.user?.id,
    };
  };

  // Handle the request
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
