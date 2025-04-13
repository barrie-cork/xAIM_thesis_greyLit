import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

import { Context } from './context';

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

// Basic procedure
export const publicProcedure = t.procedure;

// Reusable middleware to check if user is authenticated
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session },
      userId: ctx.userId
    },
  });
});

// Protected procedure
export const protectedProcedure = t.procedure.use(isAuthenticated);

// Export router creator
export const router = t.router;