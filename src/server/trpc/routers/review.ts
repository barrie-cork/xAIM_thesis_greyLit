import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';

// Validation schema for review tags
const createReviewTagSchema = z.object({
  resultId: z.string().uuid(),
  tag: z.enum(['include', 'exclude', 'maybe']),
  exclusionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  retrieved: z.boolean().optional().nullable(),
});

// Validation schema for updating review tags
const updateReviewTagSchema = z.object({
  id: z.string().uuid(),
  tag: z.enum(['include', 'exclude', 'maybe']).optional(),
  exclusionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  retrieved: z.boolean().optional().nullable(),
});

/**
 * Review router
 * Handles result review tagging and management
 */
export const reviewRouter = router({
  // Create a new review tag
  create: protectedProcedure
    .input(createReviewTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search result exists
        const searchResult = await ctx.prisma.searchResult.findUnique({
          where: { id: input.resultId },
          include: {
            searchRequest: true, // Include the search request to check ownership
          },
        });

        if (!searchResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search result not found',
          });
        }

        // Verify ownership of the search via the search request
        if (searchResult.searchRequest.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to review this search result',
          });
        }

        // Check if a review tag already exists for this result by this user
        const existingTag = await ctx.prisma.reviewTag.findFirst({
          where: {
            resultId: input.resultId,
            reviewerId: userId,
          },
        });

        if (existingTag) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You have already tagged this result',
          });
        }

        // Create review tag in database
        const reviewTag = await ctx.prisma.reviewTag.create({
          data: {
            id: crypto.randomUUID(),
            resultId: input.resultId,
            tag: input.tag,
            exclusionReason: input.exclusionReason,
            notes: input.notes,
            retrieved: input.retrieved,
            reviewerId: userId,
            createdAt: new Date(),
            updatedAt: null,
          },
        });

        return reviewTag;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create review tag',
          cause: error,
        });
      }
    }),

  // Update an existing review tag
  update: protectedProcedure
    .input(updateReviewTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // Find the existing review tag
        const existingTag = await ctx.prisma.reviewTag.findUnique({
          where: { id: input.id },
        });

        if (!existingTag) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review tag not found',
          });
        }

        // Verify ownership
        if (existingTag.reviewerId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this review tag',
          });
        }

        // Update the review tag
        const updatedTag = await ctx.prisma.reviewTag.update({
          where: { id: input.id },
          data: {
            tag: input.tag,
            exclusionReason: input.exclusionReason,
            notes: input.notes,
            retrieved: input.retrieved,
            updatedAt: new Date(),
          },
        });

        return updatedTag;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update review tag',
          cause: error,
        });
      }
    }),

  // Get all review tags for a specific search query
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
            message: 'You do not have access to reviews for this search',
          });
        }

        // Get all review tags for results of this search query
        const reviewTags = await ctx.prisma.reviewTag.findMany({
          where: {
            result: {
              queryId: input.queryId,
            },
          },
          include: {
            result: true, // Include the search result data
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return reviewTags;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get review tags',
          cause: error,
        });
      }
    }),

  // Get review tags for a specific result
  getByResultId: protectedProcedure
    .input(z.object({ resultId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // First check if the search result exists
        const searchResult = await ctx.prisma.searchResult.findUnique({
          where: { id: input.resultId },
          include: {
            searchRequest: true, // Include the search request to check ownership
          },
        });

        if (!searchResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Search result not found',
          });
        }

        // Verify ownership of the search via the search request
        if (searchResult.searchRequest.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to reviews for this result',
          });
        }

        // Get all review tags for this result
        const reviewTags = await ctx.prisma.reviewTag.findMany({
          where: {
            resultId: input.resultId,
          },
          include: {
            reviewer: true, // Include reviewer information
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return reviewTags;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get review tags',
          cause: error,
        });
      }
    }),

  // Delete a review tag
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // Find the existing review tag
        const existingTag = await ctx.prisma.reviewTag.findUnique({
          where: { id: input.id },
        });

        if (!existingTag) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Review tag not found',
          });
        }

        // Verify ownership
        if (existingTag.reviewerId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this review tag',
          });
        }

        // Delete the review tag
        await ctx.prisma.reviewTag.delete({
          where: { id: input.id },
        });

        return { success: true, message: 'Review tag deleted successfully' };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete review tag',
          cause: error,
        });
      }
    }),
}); 