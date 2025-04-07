import { protectedProcedure, publicProcedure, router } from '../trpc';
import { z } from 'zod';

// Define Zod schema for profile updates
const UserProfileUpdateInput = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
  // Add other updatable profile fields here
});

export const userRouter = router({
  // Example: Get current user (protected)
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is available thanks to the isAuthed middleware
    return ctx.user;
  }),

  // Update user profile (protected mutation)
  updateUserProfile: protectedProcedure
    .input(UserProfileUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { name, avatarUrl } = input;
      const userMetadata: { name?: string; avatar_url?: string } = {};

      if (name) {
        userMetadata.name = name;
      }
      if (avatarUrl) {
        userMetadata.avatar_url = avatarUrl;
      }

      if (Object.keys(userMetadata).length === 0) {
        // Or throw an error if needed
        return ctx.user; 
      }

      const { data, error } = await ctx.supabase.auth.updateUser({
        data: userMetadata,
      });

      if (error) {
        // Consider more specific error handling
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      // Supabase returns the updated user object in data.user
      return data.user;
    }),

  // Sign out user (protected mutation)
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase.auth.signOut();

    if (error) {
      // Consider more specific error handling
      throw new Error(`Failed to sign out: ${error.message}`);
    }

    return { success: true };
  }),

  // Add more user-related procedures here...
}); 