import { protectedProcedure, publicProcedure, router as createRouter } from './trpc';
import { z } from 'zod';
import { prisma } from '../db/client';
import { TRPCError } from '@trpc/server';
import { 
  DEFAULT_SEARCH_CONFIG, 
  FileType, 
  SearchProviderType, 
  SerpExecutorService, 
  ResultsProcessorService, 
  SearchRequest as LibSearchRequest // Alias to avoid conflict 
} from '@/lib/search';

// Initialize the new services with default configuration
// Pass only the relevant parts of the config to each service
const serpExecutor = new SerpExecutorService({ 
  providers: DEFAULT_SEARCH_CONFIG.providers, 
  defaultProvider: DEFAULT_SEARCH_CONFIG.defaultProvider 
});
const resultsProcessor = new ResultsProcessorService({ 
  deduplication: DEFAULT_SEARCH_CONFIG.deduplication, 
  cache: DEFAULT_SEARCH_CONFIG.cache 
}, prisma);

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
        // Correctly access userId from the session context
        if (!ctx.session?.user?.id) {
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
            userId: ctx.session.user.id,
          },
        });
      }),

    // Get all saved searches for the current user
    getSavedSearches: protectedProcedure.query(async ({ ctx }) => {
      // Correctly access userId
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to get saved searches',
        });
      }

      // Get all saved searches for the user
      return prisma.searchRequest.findMany({
        where: {
          userId: ctx.session.user.id,
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
          saveToDB: z.boolean().optional().default(false),
          searchTitle: z.string().optional(),
          useCache: z.boolean().optional().default(true),
          deduplication: z.union([
            z.boolean(),
            z.object({
              threshold: z.number().optional(),
            })
          ]).optional().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Correctly access userId
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        
        try {
          // Combine fileType and fileTypes
          const fileTypes = input.fileTypes || (input.fileType ? [input.fileType] : undefined);
          
          // Construct the SearchRequest object for the library services
          const searchRequest: LibSearchRequest = {
            query: input.query,
            maxResults: input.maxResults,
            fileType: fileTypes,
            page: input.page,
            domain: input.domain,
            providers: input.providers,
            useCache: input.useCache,
            deduplication: input.deduplication,
          };

          let searchRequestId: string | undefined = undefined;
          
          // --- Step 1: Create DB record if saving ---
          if (input.saveToDB) {
            const createdRequest = await prisma.searchRequest.create({
              data: {
                query: input.query,
                source: input.providers?.join(',') || 'default', // Indicate source providers
                filters: {
                  fileTypes: fileTypes?.map(ft => ft.toString()),
                  domain: input.domain,
                  maxResults: input.maxResults,
                  page: input.page,
                },
                searchTitle: input.searchTitle || `Search: ${input.query.substring(0, 50)}`,
                isSaved: true,
                userId: ctx.session.user.id,
                status: 'pending', // Initial status
              },
              select: { queryId: true } // Select only the ID
            });
            searchRequestId = createdRequest.queryId;
            
            // Update status to processing
            await prisma.searchRequest.update({
                where: { queryId: searchRequestId },
                data: { status: 'processing' }
            });
          }

          // --- Step 2: Execute search via SerpExecutorService ---
          console.log(`Executing search for query: ${searchRequest.query}`);
          const initialResults = await serpExecutor.execute(searchRequest);
          console.log(`Executor returned ${initialResults.length} initial results.`);
          
          // --- Step 3: Process results via ResultsProcessorService ---
          console.log(`Processing ${initialResults.length} results...`);
          const processingContext = {
            searchRequestId: searchRequestId, // Pass ID if saving
            userId: ctx.session.user.id
          };
          const processingResult = await resultsProcessor.process(
            initialResults, 
            searchRequest, 
            processingContext
          );
          console.log(`Processor finished. Unique results: ${processingResult.uniqueResults.length}, CacheHit: ${processingResult.cacheHit}`);

          // --- Step 4: Update DB record status if saving ---
          if (searchRequestId) {
              await prisma.searchRequest.update({
                  where: { queryId: searchRequestId },
                  data: {
                      status: 'completed',
                      metadata: { // Store processing metadata
                          originalCount: initialResults.length,
                          uniqueCount: processingResult.uniqueResults.length,
                          duplicatesRemoved: processingResult.duplicatesRemoved,
                          cacheHit: processingResult.cacheHit,
                          completedAt: new Date().toISOString()
                      }
                  }
              });
          }

          // --- Step 5: Return result ---
          return {
            results: processingResult.uniqueResults,
            meta: {
                searchRequestId: searchRequestId, // Return ID if saved
                savedToDB: !!searchRequestId,
                cacheHit: processingResult.cacheHit,
                duplicatesRemoved: processingResult.duplicatesRemoved,
                originalCount: initialResults.length,
                uniqueCount: processingResult.uniqueResults.length
            }
          };

        } catch (error: any) {
          console.error('Search execution pipeline error:', error);
          // If saving, update the DB record status to error
          if (searchRequestId) {
             try {
                await prisma.searchRequest.update({
                    where: { queryId: searchRequestId },
                    data: {
                        status: 'error',
                        metadata: { 
                           ...(await prisma.searchRequest.findUnique({ where: { queryId: searchRequestId }, select: { metadata: true } })?.metadata || {}),
                           error: error.message || 'Unknown error',
                           failedAt: new Date().toISOString()
                         }
                    }
                });
             } catch (updateError) {
                 console.error('Failed to update search request status to error:', updateError);
             }
          }
          
          throw new TRPCError({
            code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to execute search pipeline',
            cause: error,
          });
        }
      }),
      
    // Get available search providers
    getProviders: publicProcedure.query(async () => {
      return {
        providers: serpExecutor.getAvailableProviders(),
        defaultProvider: DEFAULT_SEARCH_CONFIG.defaultProvider,
      };
    }),
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter; 