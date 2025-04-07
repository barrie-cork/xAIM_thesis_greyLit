import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import { Context } from '../context';
import logger, { logError } from '../../../utils/logger';

// Initialize tRPC for middleware
const t = initTRPC.context<Context>().create();
const middleware = t.middleware;

/**
 * Error handling middleware for tRPC
 * Catches and logs all errors that occur in tRPC procedures
 */
export const errorHandler = middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();

  // Create a context-specific logger for this request
  const requestLogger = logger.child({
    trpc: {
      path,
      type,
      userId: ctx.userId || 'unauthenticated',
    },
  });

  try {
    // Call the next middleware or procedure
    const result = await next();

    // Log successful operations if needed (debug level)
    const durationMs = Date.now() - start;
    requestLogger.debug(
      { durationMs, success: true },
      `TRPC ${type} ${path} completed successfully in ${durationMs}ms`
    );

    // Return the result
    return result;
  } catch (error) {
    // Calculate duration for error too
    const durationMs = Date.now() - start;

    // If it's already a TRPC error, log it and pass it through
    if (error instanceof TRPCError) {
      logError(
        error,
        {
          path,
          type,
          code: error.code,
          durationMs,
        },
        requestLogger
      );
      throw error;
    }

    // For all other errors, log them and convert to a safe TRPC error
    logError(
      error,
      {
        path,
        type,
        durationMs,
      },
      requestLogger
    );

    // Convert unknown errors to INTERNAL_SERVER_ERROR
    // This prevents leaking sensitive details to clients
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred, please try again later',
      cause: error,
    });
  }
}); 