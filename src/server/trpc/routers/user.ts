import { TRPCError } from '@trpc/server';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { userProfileSchema } from '../../../schemas/user.schema';

/**
 * User router
 * Handles user profile and management
 */
export const userRouter = router({
  // Get current user profile
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(userProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      try {
        // Update user in database
        const updatedUser = await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            ...input,
          },
        });

        // If email was updated, update it in Supabase Auth
        if (input.email) {
          await ctx.supabase.auth.updateUser({ email: input.email });
        }

        return updatedUser;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user profile',
          cause: error,
        });
      }
    }),

  // Get user session status
  getSession: publicProcedure.query(async ({ ctx }) => {
    try {
      const { data } = await ctx.supabase.auth.getSession();
      return {
        session: data.session,
        user: data.session?.user ?? null,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get session',
        cause: error,
      });
    }
  }),

  // Log out the current user
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await ctx.supabase.auth.signOut();
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to log out',
        cause: error,
      });
    }
  }),
}); 