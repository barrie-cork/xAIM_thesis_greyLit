// Export all search types and components
export * from './types';
export * from './provider';
export * from './base-provider';
export * from './factory';
export * from './search-service';
export * from './utils';
export { DeduplicationService } from './deduplication';

// Export providers
export * from './providers/serper';
export * from './providers/serpapi';

// Default configuration for the search service
import { SearchProviderType } from './factory';

/**
 * Default configuration for the search service
 * Currently only using Serper API since SerpAPI key validation is pending
 */
export const DEFAULT_SEARCH_CONFIG = {
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
  // Default deduplication settings
  deduplication: {
    titleSimilarityThreshold: 0.85, // 85% title similarity is considered a duplicate
    strictUrlMatching: false, // Allow title-based deduplication
    ignoredDomains: [] // No domains are ignored by default
  }
}; 