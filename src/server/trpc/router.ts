import { router } from './trpc';
import { healthRouter } from './routers/health';
import { userRouter } from './routers/user';
import { searchRouter } from './routers/search';
import { resultsRouter } from './routers/results';
import { reviewRouter } from './routers/review';

/**
 * Main application router
 * @link https://trpc.io/docs/router
 */
export const appRouter = router({
  health: healthRouter,
  user: userRouter,
  search: searchRouter,
  results: resultsRouter,
  review: reviewRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter; 