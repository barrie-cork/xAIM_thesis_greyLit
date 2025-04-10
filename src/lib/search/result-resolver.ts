/**
 * SearchResult Type Resolution Utilities
 * 
 * This module provides functionality to convert between different SearchResult formats
 * used across the application, resolving type conflicts and providing a consistent interface.
 */

import { SearchResult as ApiSearchResult } from './types';
import { SearchResult as DeduplicationSearchResult } from './deduplication';
import { CoreSearchResult, convertSearchResult, SearchResultTypeMap } from './common-types';

/**
 * Convert an API SearchResult to a DeduplicationSearchResult
 */
export function toDeduplicationResult(
  result: ApiSearchResult, 
  position?: number
): DeduplicationSearchResult {
  const converted = convertSearchResult<ApiSearchResult, DeduplicationSearchResult>(
    result, 
    SearchResultTypeMap.apiToDeduplication
  );
  
  return {
    ...converted,
    position: position !== undefined ? position : (result.rank || 0),
    provider: result.searchEngine || 'unknown',
    // Ensure metadata exists
    metadata: result.metadata || {}
  };
}

/**
 * Convert a DeduplicationSearchResult to an API SearchResult
 */
export function toApiResult(
  result: DeduplicationSearchResult
): ApiSearchResult {
  const converted = convertSearchResult<DeduplicationSearchResult, ApiSearchResult>(
    result, 
    SearchResultTypeMap.deduplicationToAPI
  );
  
  return {
    ...converted,
    searchEngine: result.provider || 'unknown',
    rank: result.position || 0,
    timestamp: new Date(),
    // Ensure metadata exists
    metadata: result.metadata || {}
  };
}

/**
 * Utility to ensure a result has the core properties required by CoreSearchResult
 */
export function ensureCoreProperties<T extends Partial<CoreSearchResult>>(
  result: T
): T & CoreSearchResult {
  return {
    ...result,
    title: result.title || '',
    url: result.url || '',
    snippet: result.snippet || '',
    metadata: result.metadata || {}
  } as T & CoreSearchResult;
}

/**
 * Utility to ensure we have a valid array of search results
 */
export function validateSearchResults<T extends Partial<CoreSearchResult>>(
  results: Array<T>,
  defaultProvider: string = 'unknown'
): Array<T & CoreSearchResult> {
  return results.map((result, index) => ensureCoreProperties({
    ...result,
    // Add position/index if not present
    position: (result as any).position !== undefined ? (result as any).position : index
  }));
} 