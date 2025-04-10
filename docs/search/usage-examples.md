# Search Service Usage Examples

This document provides practical examples of how to use the `SearchService` directly and interact with the `/api/search` endpoint, focusing on configuration overrides for deduplication and caching.

```typescript
// --- Basic Search (Using SearchService directly) ---
import { SearchService, DEFAULT_SEARCH_CONFIG, SearchProviderType, SearchResponse } from '@/lib/search';

// Initialize with default configuration (includes default deduplication & cache)
const searchService = new SearchService(DEFAULT_SEARCH_CONFIG);

async function runBasicSearch() {
  try {
    const results = await searchService.search({
      query: 'What is semantic search?',
      maxResults: 10,
      // Uses default provider (Serper), default deduplication, default cache settings
    });
    // Assuming single provider response for simplicity in example logs
    if (results.length > 0) {
        console.log(`Found ${results[0].results.length} unique results.`);
        // Access deduplication metadata
        console.log('Deduplication Stats:', results[0].metadata.deduplication);
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// --- Disable Deduplication Per-Request ---
async function runNoDeduplicationSearch() {
  try {
    const results = await searchService.search({
      query: 'Information retrieval models',
      maxResults: 15,
      deduplication: false, // Disable deduplication for this specific request
    });
    if (results.length > 0) {
        console.log(`Found ${results[0].results.length} results (including duplicates).`);
        console.log('Deduplication Stats:', results[0].metadata.deduplication); // Should show enabled: false
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// --- Override Deduplication Threshold Per-Request ---
async function runLenientDeduplicationSearch() {
  try {
    const results = await searchService.search({
      query: 'TypeScript best practices',
      maxResults: 20,
      deduplication: {
        threshold: 0.70, // Lower threshold (more lenient, more duplicates removed)
        // Other options (enableUrlNormalization, etc.) inherit from service defaults
      },
    });
    if (results.length > 0) {
        console.log(`Found ${results[0].results.length} unique results with lenient threshold.`);
        console.log('Deduplication Stats:', results[0].metadata.deduplication);
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// --- Enable Merging Per-Request ---
async function runMergingSearch() {
   try {
    const results = await searchService.search({
      query: 'Prisma ORM performance',
      maxResults: 10,
      deduplication: {
        enableMerging: true, // Enable merging (uses default strategy unless specified)
        mergeStrategy: 'comprehensive' // Optionally specify a strategy
      },
    });
    if (results.length > 0) {
        console.log(`Found ${results[0].results.length} unique (potentially merged) results.`);
        // Note: Merged results might have combined snippets or different fields based on strategy
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// --- Bypass Cache Per-Request ---
async function runNoCacheSearch() {
  try {
    const results = await searchService.search({
      query: 'React server components',
      maxResults: 5,
      useCache: false, // Bypass cache check and don't store results
    });
    if (results.length > 0) {
        console.log(`Found ${results[0].results.length} fresh results.`);
        console.log('Cache Stats:', results[0].metadata.cache); // Should show hit: false
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}


// --- Using the API Endpoint (/api/search) ---
// Example using fetch in a client-side context

async function searchViaApi(includeDupes: boolean = false) {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Deduplication techniques comparison',
      maxResults: 25,
      deduplication: true, // Use deduplication enabled in SearchService
      includeDuplicates: includeDupes, // Request duplicate details in metadata
      // query_type: 'domain', // Example: search specific domains
      // domains: ['example.com', 'anothersite.org']
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('API Search failed:', errorData.message);
    return;
  }

  const searchResponses: SearchResponse[] = await response.json();
  console.log(`API returned ${searchResponses.length} provider responses.`);
  
  if (searchResponses.length > 0) {
     console.log(`Found ${searchResponses[0].results.length} unique results.`);
     console.log('Deduplication Stats:', searchResponses[0].metadata.deduplication);
     if (includeDupes && (searchResponses[0].metadata as any).duplicates) {
        console.log('Duplicate Groups Found:', (searchResponses[0].metadata as any).duplicates.length);
        // console.log('Duplicate Groups Details:', (searchResponses[0].metadata as any).duplicates);
     }
  }
}
``` 