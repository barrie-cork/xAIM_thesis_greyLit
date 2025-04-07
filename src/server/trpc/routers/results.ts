import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';

// Validation schema for creating a search result
const createResultSchema = z.object({
  queryId: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().optional().nullable(),
  rank: z.number().optional().nullable(),
  resultType: z.string().optional().nullable(),
  searchEngine: z.string().optional().nullable(),
  device: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  totalResults: z.number().optional().nullable(),
  creditsUsed: z.number().optional().nullable(),
  searchId: z.string().optional().nullable(),
  searchUrl: z.string().optional().nullable(),
  relatedSearches: z.any().optional().nullable(),
  similarQuestions: z.any().optional().nullable(),
  rawResponse: z.any().optional().nullable(),
  deduped: z.boolean().default(true),
});

/**
 * Results router
 * Handles search results management
 */
export const resultsRouter = router({
  // Create a new search result
  create: protectedProcedure
    .input(createResultSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search request exists and belongs to the user
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { queryId: input.queryId },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (searchRequest.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to add results to this search',
          });
        }

        // Create search result in database
        const searchResult = await ctx.prisma.searchResult.create({
          data: {
            id: crypto.randomUUID(),
            queryId: input.queryId,
            title: input.title,
            url: input.url,
            snippet: input.snippet,
            rank: input.rank,
            resultType: input.resultType,
            searchEngine: input.searchEngine,
            device: input.device,
            location: input.location,
            language: input.language,
            totalResults: input.totalResults,
            creditsUsed: input.creditsUsed,
            searchId: input.searchId,
            searchUrl: input.searchUrl,
            relatedSearches: input.relatedSearches,
            similarQuestions: input.similarQuestions,
            timestamp: new Date(),
            rawResponse: input.rawResponse,
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
    .input(z.array(createResultSchema))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      if (input.length === 0) {
        return { count: 0, message: 'No results to create' };
      }

      const queryId = input[0].queryId;

      try {
        // First check if the search request exists and belongs to the user
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { queryId },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (searchRequest.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to add results to this search',
          });
        }

        // Create search results in database
        const searchResults = await ctx.prisma.searchResult.createMany({
          data: input.map(result => ({
            id: crypto.randomUUID(),
            queryId: result.queryId,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            rank: result.rank,
            resultType: result.resultType,
            searchEngine: result.searchEngine,
            device: result.device,
            location: result.location,
            language: result.language,
            totalResults: result.totalResults,
            creditsUsed: result.creditsUsed,
            searchId: result.searchId,
            searchUrl: result.searchUrl,
            relatedSearches: result.relatedSearches,
            similarQuestions: result.similarQuestions,
            timestamp: new Date(),
            rawResponse: result.rawResponse,
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
    .input(z.object({ queryId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search request exists and belongs to the user
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { queryId: input.queryId },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (searchRequest.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to results for this search',
          });
        }

        // Get search results
        const searchResults = await ctx.prisma.searchResult.findMany({
          where: { 
            queryId: input.queryId,
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
    .input(z.object({ id: z.string().uuid() }))
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
        if (searchResult.searchRequest.userId !== userId) {
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