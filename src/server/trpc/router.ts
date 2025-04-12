import { protectedProcedure, publicProcedure, router as createRouter } from './procedures';
import { z } from 'zod';
import { prisma } from '../db/client';
import { TRPCError } from '@trpc/server';
import {
  DEFAULT_SEARCH_CONFIG,
  FileType,
  SearchProviderType,
  SearchService as OriginalSearchService,
  SearchService as RefactoredSearchService,
  StorageService,
  BackgroundProcessor
} from '@/lib/search';
import { migrateExistingResults, getSearchResultsWithCompatibility } from '@/lib/search/utils/migration-helpers';

// Initialize services
const storageService = new StorageService();
const backgroundProcessor = new BackgroundProcessor(storageService);

// Initialize the original search service for backward compatibility
const searchService = new OriginalSearchService(DEFAULT_SEARCH_CONFIG);

// Initialize the refactored search service
const refactoredSearchService = new RefactoredSearchService({
  ...DEFAULT_SEARCH_CONFIG,
  storageService
});

/**
 * Main router for all tRPC routes
 */
export const appRouter = createRouter({
  // Search routes
  search: createRouter({
    // Create a new search request
    create: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          source: z.string(),
          filters: z.any().optional(),
          search_title: z.string().optional(),
          is_saved: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate user is authenticated
        if (!ctx.session?.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to create a search request',
          });
        }

        // Create the search request
        return prisma.searchRequest.create({
          data: {
            query: input.query,
            source: input.source,
            filters: input.filters,
            searchTitle: input.search_title,
            isSaved: input.is_saved,
            userId: ctx.session.userId,
          },
        });
      }),

    // Get all saved searches for the current user
    getSavedSearches: protectedProcedure.query(async ({ ctx }) => {
      // Validate user is authenticated
      if (!ctx.session?.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to get saved searches',
        });
      }

      // Get all saved searches for the user
      return prisma.searchRequest.findMany({
        where: {
          userId: ctx.session.userId,
          isSaved: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });
    }),

    // Execute a search using configured providers
    execute: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          maxResults: z.number().min(1).max(100).optional(),
          fileType: z.nativeEnum(FileType).optional(),
          fileTypes: z.array(z.nativeEnum(FileType)).optional(),
          page: z.number().min(1).optional(),
          domain: z.string().optional(),
          providers: z.array(z.nativeEnum(SearchProviderType)).optional(),
          saveToDB: z.boolean().optional(),
          searchTitle: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate user is authenticated
        if (!ctx.session?.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to execute a search',
          });
        }

        try {
          // Combine fileType and fileTypes
          const fileTypes = input.fileTypes || (input.fileType ? [input.fileType] : undefined);

          // Execute the search
          const searchResponses = await searchService.search({
            query: input.query,
            maxResults: input.maxResults,
            fileType: fileTypes,
            page: input.page,
            domain: input.domain,
            providers: input.providers,
          });

          // If the user wants to save the search to the database
          if (input.saveToDB) {
            // Create a search request in the database
            const searchRequest = await prisma.searchRequest.create({
              data: {
                query: input.query,
                source: searchResponses.map(r => r.metadata.searchEngine).join(','),
                filters: {
                  fileTypes: fileTypes?.map(ft => ft.toString()),
                  domain: input.domain,
                  maxResults: input.maxResults,
                },
                searchTitle: input.searchTitle || `Search: ${input.query.substring(0, 50)}`,
                isSaved: true,
                userId: ctx.session.userId,
              },
            });

            // Save all search results to the database
            for (const response of searchResponses) {
              await Promise.all(
                response.results.map((result, index) => {
                  return prisma.searchResult.create({
                    data: {
                      queryId: searchRequest.queryId,
                      title: result.title,
                      url: result.url,
                      snippet: result.snippet,
                      rank: result.rank || index + 1,
                      resultType: result.resultType,
                      searchEngine: result.searchEngine,
                      device: result.device,
                      location: result.location,
                      language: result.language,
                      totalResults: response.pagination?.totalResults,
                      creditsUsed: response.metadata.creditsUsed,
                      searchId: response.metadata.searchId,
                      searchUrl: response.metadata.searchUrl,
                      relatedSearches: response.metadata.searchEngine === 'Google'
                        ? { searches: response.results.map(r => r.title) } as any
                        : undefined,
                      timestamp: new Date(),
                      rawResponse: result.rawResponse,
                    },
                  });
                })
              );
            }

            // Return both search responses and database info
            return {
              searchResponses,
              searchRequestId: searchRequest.queryId,
              savedToDB: true,
            };
          }

          // Return just the search responses if not saving to DB
          return {
            searchResponses,
            savedToDB: false,
          };
        } catch (error: any) {
          console.error('Search execution error:', error);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to execute search',
            cause: error,
          });
        }
      }),

    // Get available search providers
    getProviders: publicProcedure.query(async () => {
      return {
        providers: searchService.getAvailableProviders(),
        defaultProvider: DEFAULT_SEARCH_CONFIG.defaultProvider,
      };
    }),

    // Execute a search using the refactored search service
    executeV2: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          maxResults: z.number().min(1).max(100).optional(),
          fileType: z.nativeEnum(FileType).optional(),
          fileTypes: z.array(z.nativeEnum(FileType)).optional(),
          page: z.number().min(1).optional(),
          domain: z.string().optional(),
          providers: z.array(z.nativeEnum(SearchProviderType)).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate user is authenticated
        if (!ctx.session?.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to execute a search',
          });
        }

        try {
          // Combine fileType and fileTypes
          const fileTypes = input.fileTypes || (input.fileType ? [input.fileType] : undefined);

          // Execute the search with the refactored service
          const searchResponses = await refactoredSearchService.search({
            query: input.query,
            maxResults: input.maxResults,
            fileTypes: fileTypes,
            page: input.page,
            domain: input.domain,
            providers: input.providers,
            userId: ctx.session.userId,
          });

          // Queue the search request for background processing
          if (searchResponses.length > 0) {
            backgroundProcessor.queueForProcessing(searchResponses[0].searchRequestId);
          }

          return {
            searchResponses,
            searchRequestId: searchResponses[0]?.searchRequestId,
            processingQueued: true,
          };
        } catch (error: any) {
          console.error('Search execution error:', error);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to execute search',
            cause: error,
          });
        }
      }),

    // Get processed search results
    getProcessedResults: protectedProcedure
      .input(z.object({ searchRequestId: z.string().uuid(), includeDuplicates: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        // Validate user is authenticated
        if (!ctx.session?.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to get search results',
          });
        }

        try {
          // Get processed search results
          const results = await storageService.getSearchResults(
            input.searchRequestId,
            false, // Don't include raw results
            input.includeDuplicates || false
          );

          return {
            results,
            totalResults: results.length,
            includingDuplicates: input.includeDuplicates || false,
          };
        } catch (error: any) {
          console.error('Get search results error:', error);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to get search results',
            cause: error,
          });
        }
      }),

    // Process search results immediately
    processResults: protectedProcedure
      .input(z.object({
        searchRequestId: z.string().uuid(),
        deduplicationOptions: z.object({
          titleSimilarityThreshold: z.number().min(0).max(1).optional(),
          strictUrlMatching: z.boolean().optional(),
          ignoredDomains: z.array(z.string()).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate user is authenticated
        if (!ctx.session?.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to process search results',
          });
        }

        try {
          // Process the search results immediately
          const result = await backgroundProcessor.processImmediately(
            input.searchRequestId,
            input.deduplicationOptions
          );

          return result;
        } catch (error: any) {
          console.error('Process search results error:', error);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to process search results',
            cause: error,
          });
        }
      }),

    // Migrate existing search results to the new format
    migrateResults: protectedProcedure
      .input(z.object({
        searchRequestId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate user is authenticated
        if (!ctx.session?.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to migrate search results',
          });
        }

        try {
          // Migrate the search results
          const result = await migrateExistingResults(
            input.searchRequestId,
            storageService,
            backgroundProcessor
          );

          return result;
        } catch (error: any) {
          console.error('Migrate search results error:', error);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to migrate search results',
            cause: error,
          });
        }
      }),
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;