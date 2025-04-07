import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

/**
 * Health check router
 * Provides basic API status endpoints
 */
export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return {
      status: 'success',
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }),
  
  echo: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        status: 'success',
        message: `You said: ${input.text}`,
        timestamp: new Date().toISOString(),
      };
    }),

  status: publicProcedure.query(async ({ ctx }) => {
    // Test database connection
    let dbStatus = 'connected';
    let dbError = null;
    
    try {
      // Simple query to check database connection
      await ctx.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'disconnected';
      dbError = error instanceof Error ? error.message : String(error);
    }
    
    // Check Supabase connection
    let authStatus = 'connected';
    let authError = null;
    
    try {
      // Get service status
      await ctx.supabase.auth.getSession();
    } catch (error) {
      authStatus = 'disconnected';
      authError = error instanceof Error ? error.message : String(error);
    }
    
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'running',
        },
        database: {
          status: dbStatus,
          error: dbError,
        },
        auth: {
          status: authStatus,
          error: authError,
        },
      },
    };
  }),
}); 