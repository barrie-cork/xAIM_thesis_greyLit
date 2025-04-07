import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { Context } from './context';

/**
 * Initialize tRPC
 * @link https://trpc.io/docs/init
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Improved error formatting for Zod validation errors
    const zodError = error.cause instanceof ZodError ? error.cause.flatten() : null;
    
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError,
        // Add more detailed information for validation errors
        validationErrors: zodError 
          ? Object.entries(zodError.fieldErrors).map(([path, errors]) => ({
              path,
              message: errors?.[0] || 'Invalid input',
            }))
          : [],
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware to enforce user is authenticated
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  // Check if user is authenticated
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      // Infers the `session` as non-nullable
      session: ctx.session,
      // Infers the `user` as non-nullable
      userId: ctx.userId,
    },
  });
});

/**
 * Protected procedure for authenticated users only
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed); 