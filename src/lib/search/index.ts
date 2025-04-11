// Export all search types and components
export * from './types';
export * from './provider';
export * from './base-provider';
export * from './factory';
export * from './utils';
export * from './common-types';
export { DeduplicationService } from './deduplication';

// Export new services from the refactoring
export { SerpExecutorService } from './serp-executor.service';
export { ResultsProcessorService, ProcessingResult, ProcessingContext } from './results-processor.service';

// Export providers
export * from './providers/serper';
export * from './providers/serpapi';

// Default configuration for the search service
import { SearchProviderType } from './factory';
// Import the correct options type
import { DeduplicationOptions, DEFAULT_DEDUPLICATION_OPTIONS } from './deduplication';
import { CacheOptions } from './cache-service'; // Assuming CacheOptions might be needed too

/**
 * Default configuration for the search service
 * Currently only using Serper API since SerpAPI key validation is pending
 */
export const DEFAULT_SEARCH_CONFIG: any = {
  providers: {
    [SearchProviderType.SERPER]: {
      apiKey: process.env.SERPER_API_KEY || '',
      rateLimitOptions: {
        maxTokens: 60,
        refillRate: 1, // 1 token per second
        timeWindow: 60000 // 60 second window (1 minute)
      }
    },
    // SerpAPI configuration commented until valid API key is configured
    /* [SearchProviderType.SERPAPI]: {
      apiKey: process.env.SERPAPI_API_KEY || '',
      rateLimitOptions: {
        maxTokens: 100,
        refillRate: 1.67, // 100 tokens per minute
        timeWindow: 60000 // 60 second window (1 minute)
      }
    } */
  },
  defaultProvider: SearchProviderType.SERPER,
  // Use the default deduplication options imported from deduplication.ts
  // This ensures consistency with the DeduplicationService defaults.
  deduplication: DEFAULT_DEDUPLICATION_OPTIONS,
  // Add default cache options if needed, or keep it undefined/empty
  cache: { 
      // Default cache settings can go here if desired, 
      // otherwise CacheService defaults will apply.
      // e.g., ttl: 7200 // Override default TTL to 2 hours
  }
}; 