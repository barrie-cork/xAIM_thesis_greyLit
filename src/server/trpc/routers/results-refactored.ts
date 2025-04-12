import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';
import { StorageService } from '@/lib/search/services/storage-service';
import { getSearchResultsWithCompatibility } from '@/lib/search/utils/migration-helpers';

// Initialize storage service
const storageService = new StorageService();

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
  // Get search results for a query
  getByQueryId: protectedProcedure
    .input(z.object({ queryId: z.string().uuid(), includeDuplicates: z.boolean().optional() }))
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

        // Get search results with compatibility for both old and new formats
        const searchResults = await getSearchResultsWithCompatibility(
          input.queryId,
          storageService,
          input.includeDuplicates || false
        );

        return {
          results: searchResults,
          totalResults: searchResults.length,
          includingDuplicates: input.includeDuplicates || false,
        };
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

  // Get duplicate relationships for a result
  getDuplicateRelationships: protectedProcedure
    .input(z.object({ resultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search result exists and belongs to the user
        const searchResult = await ctx.prisma.searchResult.findUnique({
          where: { id: input.resultId },
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

        // Get duplicate relationships
        const relationships = await storageService.getDuplicateRelationships(input.resultId);

        return {
          relationships,
          totalRelationships: relationships.length,
          isOriginal: relationships.some(r => r.originalResultId === input.resultId),
          isDuplicate: relationships.some(r => r.duplicateResultId === input.resultId),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get duplicate relationships',
          cause: error,
        });
      }
    }),
});
