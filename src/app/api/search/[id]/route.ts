import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/server/db/client';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure user is authenticated
    const session = await requireAuth();
    
    // Get the search ID from the URL
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      );
    }
    
    // Find the search request
    const searchRequest = await prisma.searchRequest.findUnique({
      where: {
        query_id: id,
      },
    });
    
    // Check if the search request exists
    if (!searchRequest) {
      return NextResponse.json(
        { error: 'Search request not found' },
        { status: 404 }
      );
    }
    
    // Check if the search request belongs to the user
    if (searchRequest.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this search request' },
        { status: 403 }
      );
    }
    
    // Delete the search request
    await prisma.searchRequest.delete({
      where: {
        query_id: id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete search API error:', error);
    return NextResponse.json(
      { error: 'An error occurred deleting the search request' },
      { status: 500 }
    );
  }
}
