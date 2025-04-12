import { protectedProcedure, publicProcedure, router as createRouter } from './procedures';
import { z } from 'zod';
import { prisma } from '../db/client';
import { TRPCError } from '@trpc/server';
import { DEFAULT_SEARCH_CONFIG, FileType, SearchProviderType, SearchService } from '@/lib/search';

// Initialize the search service with default configuration
const searchService = new SearchService(DEFAULT_SEARCH_CONFIG);

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
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter; 