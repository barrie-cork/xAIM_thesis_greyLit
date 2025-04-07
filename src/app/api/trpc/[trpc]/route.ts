import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../server/trpc/router';
import { createContext } from '../../../../server/trpc/context';
import { NextRequest } from 'next/server';
import logger, { apiLogger, logError } from '../../../../utils/logger';

/**
 * tRPC API route handler
 * Processes all tRPC requests with proper error handling and logging
 */
const handler = async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  
  // Extract path from URL for logging
  const url = new URL(req.url);
  const path = url.searchParams.get('batch') 
    ? 'batch'
    : url.searchParams.get('trpc');
  
  // Create a logger for this specific request
  const trpcLogger = apiLogger('trpc', path || 'unknown', requestId);
  
  // Log incoming request
  trpcLogger.info(`tRPC request: ${path || 'unknown'}`);
  
  // Track timing
  const start = Date.now();
  
  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => createContext({ req, requestId }),
      onError: ({ path, error }: { path: string | undefined; error: Error }) => {
        // Log all errors regardless of environment
        logError(error, { 
          path: path || 'unknown', 
          requestId 
        }, trpcLogger);
      },
    });
    
    // Log successful completion with timing
    const durationMs = Date.now() - start;
    trpcLogger.debug({ durationMs }, `tRPC request completed in ${durationMs}ms`);
    
    return response;
  } catch (error) {
    // Catch any unexpected errors in the handler itself
    const durationMs = Date.now() - start;
    logError(error, { 
      path: path || 'unknown', 
      requestId,
      durationMs 
    }, trpcLogger);
    
    // Re-throw to let the platform handle it
    throw error;
  }
};

export { handler as GET, handler as POST }; 