/**
 * Core SearchResult interface that includes the common properties
 * used across the application. This serves as the base interface
 * that other SearchResult definitions can extend or implement.
 */
export interface CoreSearchResult {
  title: string;
  url: string;
  snippet: string;
  metadata?: Record<string, any>;
}

/**
 * Common type mappings to help with conversion between different SearchResult types
 */
export const SearchResultTypeMap = {
  // Mapping from deduplication service fields to API fields
  deduplicationToAPI: {
    position: 'rank',
    provider: 'searchEngine'
  },
  
  // Mapping from API fields to deduplication service fields
  apiToDeduplication: {
    rank: 'position',
    searchEngine: 'provider'
  }
};

/**
 * Converts from one SearchResult type to another using the provided mapping
 * @param result The source result object
 * @param mapping The field mapping to use for conversion
 * @returns A new object with mapped fields
 */
export function convertSearchResult<T extends Record<string, any>, U extends Record<string, any>>(
  result: T, 
  mapping: Record<string, string>
): U {
  const converted: Record<string, any> = { ...result };
  
  for (const [fromField, toField] of Object.entries(mapping)) {
    if (result[fromField] !== undefined) {
      converted[toField] = result[fromField];
      // Keep the original field as well for compatibility
    }
  }
  
  return converted as U;
} 