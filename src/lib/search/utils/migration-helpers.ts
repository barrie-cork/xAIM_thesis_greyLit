import { SearchResult } from '@prisma/client';
import { StorageService } from '../services/storage-service';
import { BackgroundProcessor } from '../services/background-processor';

/**
 * Utility functions to help with the migration from the old search workflow to the new one
 */

/**
 * Migrate existing search results to the new format
 * @param queryId The ID of the search request
 * @param storageService The storage service instance
 * @param backgroundProcessor The background processor instance
 */
export async function migrateExistingResults(
  queryId: string,
  storageService: StorageService,
  backgroundProcessor: BackgroundProcessor
): Promise<{
  rawResultsCreated: number;
  processingQueued: boolean;
}> {
  // Get existing search results
  const existingResults = await storageService.prisma.searchResult.findMany({
    where: {
      queryId,
    },
  });

  if (existingResults.length === 0) {
    return {
      rawResultsCreated: 0,
      processingQueued: false,
    };
  }

  // Convert to raw results
  const rawResults = existingResults.map((result) => ({
    title: result.title || '',
    url: result.url || '',
    source: result.searchEngine || 'unknown',
    metadata: {
      snippet: result.snippet,
      rank: result.rank,
      resultType: result.resultType,
      searchEngine: result.searchEngine,
      device: result.device,
      location: result.location,
      language: result.language,
      rawResponse: result.rawResponse,
    },
  }));

  // Save raw results
  await storageService.saveRawResults(queryId, rawResults);

  // Queue for processing
  backgroundProcessor.queueForProcessing(queryId);

  return {
    rawResultsCreated: rawResults.length,
    processingQueued: true,
  };
}

/**
 * Check if a search request has been migrated
 * @param queryId The ID of the search request
 * @param storageService The storage service instance
 */
export async function isSearchRequestMigrated(
  queryId: string,
  storageService: StorageService
): Promise<boolean> {
  // Check if raw results exist for this search request
  const rawResults = await storageService.getRawResults(queryId);
  return rawResults.length > 0;
}

/**
 * Get search results with compatibility for both old and new formats
 * @param queryId The ID of the search request
 * @param storageService The storage service instance
 * @param includeDuplicates Whether to include duplicate results
 */
export async function getSearchResultsWithCompatibility(
  queryId: string,
  storageService: StorageService,
  includeDuplicates: boolean = false
): Promise<SearchResult[]> {
  // Check if this search request has been migrated
  const isMigrated = await isSearchRequestMigrated(queryId, storageService);

  if (isMigrated) {
    // Use the new method
    return storageService.getSearchResults(queryId, false, includeDuplicates);
  } else {
    // Use the old method (direct Prisma query)
    return storageService.prisma.searchResult.findMany({
      where: {
        queryId,
        deduped: includeDuplicates ? undefined : true,
      },
      orderBy: {
        rank: 'asc',
      },
    });
  }
}
