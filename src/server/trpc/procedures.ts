import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import logger, { logError } from '../../utils/logger';
import { toCamelCase } from '../../schemas/common';

/**
 * Context type containing session information
 */
export interface Context {
  session: {
    userId?: string;
  } | null;
}

// Initialize tRPC
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
 * Middleware to convert snake_case to camelCase in response data
 * This ensures consistent casing between database and API
 */
const caseConversionMiddleware = t.middleware(async ({ next }) => {
  const result = await next();
  
  // Function to recursively convert object properties
  const convertData = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(item => convertData(item));
    } else if (data !== null && typeof data === 'object') {
      return toCamelCase(data);
    }
    return data;
  };

  // Handle successful result by converting the data
  if (result.ok) {
    return {
      ...result,
      data: convertData(result.data)
    };
  }
  
  // Return error results as is
  return result;
});

// Apply the middleware to the base procedure
const baseProcedure = t.procedure.use(caseConversionMiddleware);

// Basic procedure
export const publicProcedure = baseProcedure;

// Reusable middleware to check if user is authenticated
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session }
    },
  });
});

// Protected procedure
export const protectedProcedure = baseProcedure.use(isAuthenticated);

// Export router creator
export const router = t.router; 