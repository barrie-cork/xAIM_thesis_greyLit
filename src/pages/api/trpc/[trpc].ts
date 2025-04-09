import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@/server/trpc/router';
import superjson from 'superjson';

// Context factory
const createContext = async ({ req, res }: any) => {
  // For demonstration purposes, we'll simulate a simple session
  // In a real app, you would get this from your auth provider
  const session = {
    userId: req.headers['x-user-id'] || undefined
  };

  return {
    session: session || null
  };
};

// Export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext,
  transformer: superjson,
  onError:
    process.env.NODE_ENV === 'development'
      ? ({ path, error }) => {
          console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
        }
      : undefined,
}); 