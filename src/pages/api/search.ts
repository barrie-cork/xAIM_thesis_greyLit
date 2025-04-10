import type { NextApiRequest, NextApiResponse } from 'next';
import { SearchService, DEFAULT_SEARCH_CONFIG, SearchProviderType } from '@/lib/search';
import { DeduplicationService, SearchResult as DeduplicationSearchResult } from '@/lib/search/deduplication';
import { SearchResult } from '@/lib/search/types';

// Define types for duplicate groups
interface DuplicateGroup {
  original: DeduplicationSearchResult;
  duplicates: DeduplicationSearchResult[];
}

// In-memory storage for batch queries (this would be a database in production)
const batchSearches = new Map<string, string[]>();

// Add a debug option for easier troubleshooting
const DEBUG = process.env.NODE_ENV === 'development';

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
      query_type = 'broad',
      includeDuplicates = false,
      domains = [] // Add parameter for multiple domains
    } = req.body;

    if (DEBUG) {
      console.log(`Executing search for: ${query}`, {
        type: query_type,
        domains: domains,
        batchId,
        batchIndex,
        useGoogleScholar
      });
    }

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
    
    // Handle domain-specific queries
    if (query_type === 'domain' && domains.length > 0) {
      // If we have domain(s) specified, add site: operator for each domain
      // Keep the original query if there's just one domain, otherwise need parentheses
      const domainPart = Array.isArray(domains) 
        ? domains.map((domain: string) => `site:${domain.trim()}`).join(' OR ')
        : `site:${domains}`;
        
      if (domains.length === 1) {
        modifiedQuery = `${query} ${domainPart}`;
      } else {
        modifiedQuery = `${query} (${domainPart})`;
      }
      
      if (DEBUG) {
        console.log('Modified domain query:', modifiedQuery);
      }
    }

    // Perform the search with deduplication
    const searchResults = await searchService.search({
      query: modifiedQuery,
      maxResults: Number(maxResults),
      providers,
      deduplication: deduplicationService ? true : false
    });
    
    if (DEBUG) {
      console.log(`Search results: ${searchResults.length} responses with ${searchResults.reduce((sum, r) => sum + r.results.length, 0)} total results`);
    }
    
    // Capture duplicate information if requested and available
    const duplicateGroups: DuplicateGroup[] = [];
    if (includeDuplicates && deduplicationService) {
      try {
        // Get raw results without deduplication to compare
        const rawResults = await searchService.search({
          query: modifiedQuery,
          maxResults: Number(maxResults),
          providers,
          deduplication: false
        });
        
        // Extract the actual results
        const allRawResults = rawResults.flatMap(r => r.results);
        
        // Map search results to deduplication service format
        const formattedResults: DeduplicationSearchResult[] = allRawResults.map((result, index) => ({
          title: result.title || '',
          url: result.url || '',
          snippet: result.snippet || '',
          position: index,
          provider: result.searchEngine || 'unknown',
          metadata: { 
            searchEngine: result.searchEngine,
            timestamp: result.timestamp
          }
        }));
        
        // Run deduplication to get duplicate groups
        const deduplicationResult = deduplicationService.deduplicate(formattedResults);
        
        // Store duplicates info
        duplicateGroups.push(...deduplicationResult.duplicateGroups);
        
        if (DEBUG) {
          console.log(`Duplicates found: ${duplicateGroups.length} groups with ${duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0)} total duplicates`);
        }
      } catch (error) {
        console.error('Error getting duplicates:', error);
        // Continue without duplicates rather than failing the request
      }
    }

    // Add batch information to the response
    const response = [...searchResults];
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
          
          // Add domains if available
          if (domains && domains.length > 0) {
            (result.metadata as any).domains = domains;
          }
        });
      }
    }
    
    // Add original query to metadata
    response.forEach(result => {
      (result.metadata as any).originalQuery = query;
      (result.metadata as any).modifiedQuery = modifiedQuery;
    });
    
    // Add duplicates information if requested
    if (includeDuplicates && duplicateGroups.length > 0 && response.length > 0) {
      // Add duplicates to metadata
      (response[0].metadata as any).duplicates = duplicateGroups;
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