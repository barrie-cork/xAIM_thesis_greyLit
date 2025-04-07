import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { type AppRouter } from '@/server/trpc/router';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
}); 