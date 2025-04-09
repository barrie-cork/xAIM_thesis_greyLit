import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';
import { 
  searchRequestInputSchema, 
  searchRequestUpdateSchema, 
  searchRequestByIdSchema 
} from '../../../schemas/search-request.schema';

/**
 * Search router
 * Handles search request management
 */
export const searchRouter = router({
  // Create a new search request
  create: protectedProcedure
    .input(searchRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // Create search request in database
        const searchRequest = await ctx.prisma.searchRequest.create({
          data: {
            query_id: crypto.randomUUID(),
            user_id: userId,
            query: input.query,
            source: input.source,
            filters: input.filters,
            search_title: input.search_title,
            is_saved: input.is_saved,
            timestamp: new Date().toISOString(),
          },
        });

        return searchRequest;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create search request',
          cause: error,
        });
      }
    }),

  // Get user's search history
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    try {
      const searchHistory = await ctx.prisma.searchRequest.findMany({
        where: { user_id: userId },
        orderBy: { timestamp: 'desc' },
      });

      return searchHistory;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get search history',
        cause: error,
      });
    }
  }),

  // Get saved searches
  getSaved: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    try {
      const savedSearches = await ctx.prisma.searchRequest.findMany({
        where: { 
          user_id: userId,
          is_saved: true,
        },
        orderBy: { timestamp: 'desc' },
      });

      return savedSearches;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get saved searches',
        cause: error,
      });
    }
  }),

  // Get search request by ID
  getById: protectedProcedure
    .input(searchRequestByIdSchema)
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        const searchRequest = await ctx.prisma.searchRequest.findUnique({
          where: { 
            query_id: input.query_id,
          },
        });

        if (!searchRequest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        // Verify ownership
        if (searchRequest.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this search request',
          });
        }

        return searchRequest;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get search request',
          cause: error,
        });
      }
    }),

  // Update search request (e.g., title, saved status)
  update: protectedProcedure
    .input(searchRequestUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search request exists and belongs to the user
        const existingSearch = await ctx.prisma.searchRequest.findUnique({
          where: { query_id: input.query_id },
        });

        if (!existingSearch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (existingSearch.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this search request',
          });
        }

        // Update the search request
        const updatedSearch = await ctx.prisma.searchRequest.update({
          where: { query_id: input.query_id },
          data: {
            search_title: input.search_title,
            is_saved: input.is_saved,
          },
        });

        return updatedSearch;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update search request',
          cause: error,
        });
      }
    }),

  // Delete search request
  delete: protectedProcedure
    .input(searchRequestByIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search request exists and belongs to the user
        const existingSearch = await ctx.prisma.searchRequest.findUnique({
          where: { query_id: input.query_id },
        });

        if (!existingSearch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search request not found',
          });
        }

        if (existingSearch.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this search request',
          });
        }

        // Delete the search request
        await ctx.prisma.searchRequest.delete({
          where: { query_id: input.query_id },
        });

        return { success: true, message: 'Search request deleted successfully' };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete search request',
          cause: error,
        });
      }
    }),
}); 