import { router } from './procedures';

/**
 * Main router for all tRPC routes
 */
export const appRouter = router({
  // Routes go here
});

// export type definition of API
export type AppRouter = typeof appRouter; 