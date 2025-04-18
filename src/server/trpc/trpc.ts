import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { Context } from './context';
import logger, { logError } from '../../utils/logger';

/**
 * Initialize tRPC
 * @link https://trpc.io/docs/init
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Log all errors at the global error formatter level
    const zodError = error.cause instanceof ZodError ? error.cause.flatten() : null;
    
    // Only log non-validation errors as actual errors
    // For validation errors, log at warn level as they're client mistakes
    if (zodError) {
      logger.warn({ 
        path: shape.data?.path, 
        zodError, 
        zodFieldErrors: zodError.fieldErrors 
      }, 'Validation error in request');
    } else {
      // For all other errors, log with the full error context
      logError(error, { 
        path: shape.data?.path, 
        code: shape.data?.code,
        httpStatus: shape.data?.httpStatus
      });
    }
    
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
export const middleware = t.middleware;
export const procedure = t.procedure;

/**
 * Create base logger middleware
 * This logs information about all requests
 */
const loggerMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  
  // Add request metadata to child logger
  const requestLogger = logger.child({
    trpc: {
      path,
      type,
      userId: ctx.userId || 'unauthenticated',
    },
  });

  // Log the incoming request
  requestLogger.info({ path, type }, `TRPC ${type} ${path} request`);

  // Execute the request
  const result = await next();
  
  // Log completion and timing
  const durationMs = Date.now() - start;
  requestLogger.debug(
    { durationMs },
    `TRPC ${type} ${path} completed in ${durationMs}ms`
  );

  return result;
});

// Apply logger middleware to all procedures
const baseProcedure = procedure.use(loggerMiddleware);
export const publicProcedure = baseProcedure;

/**
 * Middleware to enforce user is authenticated
 */
const enforceUserIsAuthed = middleware(({ ctx, next }) => {
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
 * This is already using the logger middleware via baseProcedure
 */
export const protectedProcedure = baseProcedure.use(enforceUserIsAuthed); 