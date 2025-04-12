import type { NextApiRequest, NextApiResponse } from 'next';
import { SearchService, DEFAULT_SEARCH_CONFIG, SearchProviderType } from '@/lib/search';
import { DeduplicationService } from '@/lib/search/deduplication';

// In-memory storage for batch queries (this would be a database in production)
const batchSearches = new Map<string, string[]>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      query, 
      maxResults = 20, 
      deduplication = true, 
      batchId, 
      batchIndex,
      useGoogleScholar = false,
      query_type = 'broad'
    } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // If this is part of a batch and we don't already have the batch stored
    if (batchId && batchIndex !== undefined && !batchSearches.has(batchId)) {
      // Store the batch queries
      if (req.body.batchQueries && Array.isArray(req.body.batchQueries)) {
        batchSearches.set(batchId, req.body.batchQueries);
      }
    }

    // Initialize services
    const searchService = new SearchService(DEFAULT_SEARCH_CONFIG);
    const deduplicationService = deduplication ? new DeduplicationService() : null;

    // Determine which provider to use (Google Scholar or default)
    const providers = [SearchProviderType.SERPER]; // Default to Serper

    // Modify the query based on the query type
    let modifiedQuery = query;
    
    // If it's a Scholar query and doesn't already have a site: prefix
    const isScholar = useGoogleScholar || query_type === 'scholar';
    if (isScholar && !query.includes('site:scholar.google.com')) {
      // For Google Scholar, we add the site restriction in the API
      modifiedQuery = `${query} site:scholar.google.com`;
    }

    // Perform the search
    const results = await searchService.search({
      query: modifiedQuery,
      maxResults: Number(maxResults),
      providers,
      deduplication: deduplicationService ? true : false
    });

    // Add batch information to the response
    const response = [...results];
    if (batchId && batchSearches.has(batchId)) {
      const batchQueries = batchSearches.get(batchId);
      if (batchQueries) {
        // Add metadata about batch to each result
        response.forEach(result => {
          // Type assertion to allow adding custom properties
          (result.metadata as any).batch = {
            id: batchId,
            currentIndex: Number(batchIndex) || 0,
            totalQueries: batchQueries.length,
            hasMore: (Number(batchIndex) || 0) < batchQueries.length - 1,
            hasPrevious: (Number(batchIndex) || 0) > 0
          };
          
          // Add query type to metadata
          (result.metadata as any).queryType = query_type;
        });
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

// API endpoint to get batch information
export async function getBatchInfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { batchId } = req.query;
  
  if (!batchId || typeof batchId !== 'string') {
    return res.status(400).json({ message: 'Batch ID is required' });
  }
  
  if (!batchSearches.has(batchId)) {
    return res.status(404).json({ message: 'Batch not found' });
  }
  
  return res.status(200).json({
    batchId,
    queries: batchSearches.get(batchId),
    totalQueries: batchSearches.get(batchId)?.length || 0
  });
} 