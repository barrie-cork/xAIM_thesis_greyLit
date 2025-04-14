/**
 * User synchronization functions
 *
 * These functions ensure that user data is properly synchronized between
 * Supabase Auth and the application's user database table.
 */

import { prisma } from '@/server/db/client';
import { createServerSupabaseClient } from './server';

/**
 * Synchronize a user from Supabase Auth to the user database table
 *
 * @param userId The user ID to synchronize
 * @returns The synchronized user data
 */
export async function syncUserToDatabase(userId: string) {
  try {
    // Check if the user already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (existingUser) {
      console.log(`User ${userId} already exists in the database`);
      return existingUser;
    }

    // Get the user data from Supabase Auth
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !user) {
      console.error(`Error getting user ${userId} from Supabase Auth:`, error);
      return null;
    }

    // Create the user in the database
    const newUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email || '',
        createdAt: new Date(user.created_at),
        lastLogin: new Date(),
      },
    });

    console.log(`User ${userId} synchronized to the database`);
    return newUser;
  } catch (error) {
    console.error(`Error synchronizing user ${userId} to the database:`, error);
    return null;
  }
}

/**
 * Synchronize all users from Supabase Auth to the user database table
 *
 * @returns The number of users synchronized
 */
export async function syncAllUsersToDatabase() {
  try {
    // Get all users from Supabase Auth
    const supabase = await createServerSupabaseClient();
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error || !users) {
      console.error('Error getting users from Supabase Auth:', error);
      return 0;
    }

    // Synchronize each user
    let syncCount = 0;
    for (const user of users) {
      const syncedUser = await syncUserToDatabase(user.id);
      if (syncedUser) {
        syncCount++;
      }
    }

    console.log(`Synchronized ${syncCount} users to the database`);
    return syncCount;
  } catch (error) {
    console.error('Error synchronizing users to the database:', error);
    return 0;
  }
}
