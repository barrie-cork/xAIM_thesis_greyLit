import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';
import { 
  searchResultInputSchema, 
  searchResultBulkCreateSchema, 
  searchResultByIdSchema, 
  searchResultByQueryIdSchema 
} from '../../../schemas/search-result.schema';

/**
 * Results router
 * Handles search results management
 */
export const resultsRouter = router({
  // Create a new search result
  create: protectedProcedure
    .input(searchResultInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search request exists and belongs to the user
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { query_id: input.queryId },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (searchRequest.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to add results to this search',
          });
        }

        // Create search result in database
        const searchResult = await ctx.prisma.searchResult.create({
          data: {
            id: crypto.randomUUID(),
            query_id: input.queryId,
            title: input.title,
            url: input.url,
            snippet: input.snippet,
            rank: input.rank,
            result_type: input.resultType,
            search_engine: input.searchEngine,
            device: input.device,
            location: input.location,
            language: input.language,
            total_results: input.totalResults,
            credits_used: input.creditsUsed,
            search_id: input.searchId,
            search_url: input.searchUrl,
            related_searches: input.relatedSearches,
            similar_questions: input.similarQuestions,
            timestamp: new Date(),
            raw_response: input.rawResponse,
            deduped: input.deduped,
          },
        });

        return searchResult;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create search result',
          cause: error,
        });
      }
    }),

  // Create multiple search results in bulk
  createBulk: protectedProcedure
    .input(searchResultBulkCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      if (input.length === 0) {
        return { count: 0, message: 'No results to create' };
      }

      const queryId = input[0].queryId;

      try {
        // First check if the search request exists and belongs to the user
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { query_id: queryId },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (searchRequest.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to add results to this search',
          });
        }

        // Create search results in database
        const searchResults = await ctx.prisma.searchResult.createMany({
          data: input.map(result => ({
            id: crypto.randomUUID(),
            query_id: result.queryId,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            rank: result.rank,
            result_type: result.resultType,
            search_engine: result.searchEngine,
            device: result.device,
            location: result.location,
            language: result.language,
            total_results: result.totalResults,
            credits_used: result.creditsUsed,
            search_id: result.searchId,
            search_url: result.searchUrl,
            related_searches: result.relatedSearches,
            similar_questions: result.similarQuestions,
            timestamp: new Date(),
            raw_response: result.rawResponse,
            deduped: result.deduped,
          })),
        });

        return { count: searchResults.count, message: 'Results created successfully' };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create search results',
          cause: error,
        });
      }
    }),

  // Get search results for a query
  getByQueryId: protectedProcedure
    .input(searchResultByQueryIdSchema)
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search request exists and belongs to the user
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { query_id: input.queryId },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (searchRequest.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to results for this search',
          });
        }

        // Get search results
        const searchResults = await ctx.prisma.searchResult.findMany({
          where: { 
            query_id: input.queryId,
            deduped: true, // Only return non-duplicated results
          },
          orderBy: { rank: 'asc' },
        });

        return searchResults;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get search results',
          cause: error,
        });
      }
    }),

  // Get a specific search result by ID
  getById: protectedProcedure
    .input(searchResultByIdSchema)
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // Find the search result
        const searchResult = await ctx.prisma.searchResult.findUnique({
          where: { id: input.id },
          include: {
            searchRequest: true, // Include the related search request
          },
        });

        if (!searchResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search result not found',
          });
        }

        // Verify ownership via the search request
        if (searchResult.searchRequest.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this search result',
          });
        }

        return searchResult;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get search result',
          cause: error,
        });
      }
    }),
}); 