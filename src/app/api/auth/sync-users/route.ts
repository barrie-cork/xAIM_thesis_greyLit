/**
 * API route to synchronize users from Supabase Auth to the user database table
 */

import { NextResponse } from 'next/server';
import { syncAllUsersToDatabase, syncUserToDatabase } from '@/lib/auth/user-sync';
import { createServerSupabaseClient } from '@/lib/auth/server';

/**
 * POST /api/auth/sync-users
 * 
 * Synchronize users from Supabase Auth to the user database table
 * 
 * @param request The request object
 * @returns A response with the number of users synchronized
 */
export async function POST(request: Request) {
  try {
    // Get the current user
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if the user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to perform this action' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { userId } = body;

    // If a specific user ID is provided, synchronize only that user
    if (userId) {
      const syncedUser = await syncUserToDatabase(userId);
      
      if (!syncedUser) {
        return NextResponse.json(
          { error: 'Not Found', message: `User ${userId} not found or could not be synchronized` },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: `User ${userId} synchronized successfully`,
        user: syncedUser,
      });
    }

    // Otherwise, synchronize all users
    const syncCount = await syncAllUsersToDatabase();
    
    return NextResponse.json({
      message: `Synchronized ${syncCount} users successfully`,
      count: syncCount,
    });
  } catch (error: any) {
    console.error('Error in sync-users API route:', error);
    
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
