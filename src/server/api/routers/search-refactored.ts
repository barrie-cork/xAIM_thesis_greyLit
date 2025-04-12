import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { SearchService } from '@/lib/search/search-service-refactored';
import { SearchProviderType } from '@/lib/search/factory';
import { StorageService } from '@/lib/search/services/storage-service';
import { BackgroundProcessor } from '@/lib/search/services/background-processor';
import { DeduplicationOptions } from '@/lib/search/utils/deduplication';
import { TRPCError } from '@trpc/server';

// Initialize services
const storageService = new StorageService();
const searchService = new SearchService({
  providers: {
    [SearchProviderType.SERPER]: {
      apiKey: process.env.SERPER_API_KEY
    },
    [SearchProviderType.SERPAPI]: {
      apiKey: process.env.SERPAPI_API_KEY
    }
  },
  defaultProvider: SearchProviderType.SERPER,
  storageService
});

// Initialize background processor
const backgroundProcessor = new BackgroundProcessor(storageService);

export const searchRouter = createTRPCRouter({
  /**
   * Execute a search and store raw results
   */
  execute: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      provider: z.enum(['SERPER', 'SERPAPI']).optional(),
      maxResults: z.number().min(1).max(100).optional(),
      fileTypes: z.array(z.string()).optional(),
      domain: z.string().optional(),
      deduplicationOptions: z.object({
        titleSimilarityThreshold: z.number().min(0).max(1).optional(),
        strictUrlMatching: z.boolean().optional(),
        ignoredDomains: z.array(z.string()).optional()
      }).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Execute search with the specified provider
        const results = await searchService.search({
          query: input.query,
          providers: input.provider ? [input.provider as SearchProviderType] : undefined,
          maxResults: input.maxResults,
          fileTypes: input.fileTypes,
          domain: input.domain,
          deduplication: input.deduplicationOptions,
          userId: ctx.session.user.id
        });

        // Queue for background processing
        if (results.length > 0) {
          backgroundProcessor.queueForProcessing(results[0].searchRequestId);
        }

        return {
          searchRequestId: results[0]?.searchRequestId,
          provider: results[0]?.provider,
          rawResultsCount: results[0]?.metadata.rawResultsCount || 0
        };
      } catch (error) {
        console.error('Search execution error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to execute search',
          cause: error
        });
      }
    }),

  /**
   * Get search results for a search request
   */
  getResults: protectedProcedure
    .input(z.object({
      searchRequestId: z.string().uuid(),
      includeDuplicates: z.boolean().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Get search results from storage
        const results = await storageService.getSearchResults(
          input.searchRequestId,
          false, // Don't include raw results
          input.includeDuplicates || false
        );

        return {
          results,
          totalResults: results.length,
          includingDuplicates: input.includeDuplicates || false
        };
      } catch (error) {
        console.error('Get search results error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get search results',
          cause: error
        });
      }
    }),

  /**
   * Get raw search results for a search request
   */
  getRawResults: protectedProcedure
    .input(z.object({
      searchRequestId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Get raw search results from storage
        const results = await storageService.getRawResults(input.searchRequestId);

        return {
          results,
          totalResults: results.length
        };
      } catch (error) {
        console.error('Get raw search results error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get raw search results',
          cause: error
        });
      }
    }),

  /**
   * Process a search request immediately
   */
  processResults: protectedProcedure
    .input(z.object({
      searchRequestId: z.string().uuid(),
      deduplicationOptions: z.object({
        titleSimilarityThreshold: z.number().min(0).max(1).optional(),
        strictUrlMatching: z.boolean().optional(),
        ignoredDomains: z.array(z.string()).optional()
      }).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Process the search request immediately
        const result = await backgroundProcessor.processImmediately(
          input.searchRequestId,
          input.deduplicationOptions as DeduplicationOptions
        );

        return result;
      } catch (error) {
        console.error('Process search results error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process search results',
          cause: error
        });
      }
    }),

  /**
   * Get processing status
   */
  getProcessingStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return backgroundProcessor.getStatus();
      } catch (error) {
        console.error('Get processing status error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get processing status',
          cause: error
        });
      }
    }),

  /**
   * Get duplicate relationships for a search result
   */
  getDuplicateRelationships: protectedProcedure
    .input(z.object({
      resultId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Get duplicate relationships from storage
        const relationships = await storageService.getDuplicateRelationships(input.resultId);

        return {
          relationships,
          totalRelationships: relationships.length
        };
      } catch (error) {
        console.error('Get duplicate relationships error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get duplicate relationships',
          cause: error
        });
      }
    })
});
