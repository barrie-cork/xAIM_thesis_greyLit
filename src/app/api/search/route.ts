import { NextResponse } from 'next/server';
import { createServerSupabaseClient, requireAuth } from '@/lib/auth/server';
import { prisma } from '@/server/db/client';

export async function POST(request: Request) {
  try {
    // Ensure user is authenticated
    const session = await requireAuth();
    
    // Get request body
    const body = await request.json();
    
    // Validate request body
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Create search request in database
    const searchRequest = await prisma.searchRequest.create({
      data: {
        query_id: crypto.randomUUID(),
        user_id: session.user.id,
        query: body.query,
        source: body.source || 'api',
        filters: body.filters || {},
        search_title: body.search_title || `Search: ${body.query.substring(0, 30)}...`,
        is_saved: body.is_saved || false,
        timestamp: new Date().toISOString(),
      },
    });
    
    return NextResponse.json({ success: true, data: searchRequest });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Ensure user is authenticated
    const session = await requireAuth();
    
    // Get saved searches for the user
    const savedSearches = await prisma.searchRequest.findMany({
      where: {
        user_id: session.user.id,
        is_saved: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    
    return NextResponse.json({ success: true, data: savedSearches });
  } catch (error) {
    console.error('Get saved searches API error:', error);
    return NextResponse.json(
      { error: 'An error occurred retrieving saved searches' },
      { status: 500 }
    );
  }
}
