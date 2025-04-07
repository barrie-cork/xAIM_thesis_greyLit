import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../../server/trpc/router';
import { createContext } from '../../../../../server/trpc/context';
import { NextRequest } from 'next/server';

const handler = async (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }: { path: string | undefined; error: Error }) => {
            console.error(`❌ tRPC error on ${path ?? '<no-path>'}: ${error.message}`);
          }
        : undefined,
  });
};

export { handler as GET, handler as POST }; 