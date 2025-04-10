import { SearchProviderFactory, SearchProviderType } from './factory';
import { SearchProvider } from './provider';
import { FileType, ProviderResponse, SearchError, SearchErrorType, SearchParams, SearchResult } from './types';
import { DeduplicationService, DeduplicationOptions, DEFAULT_DEDUPLICATION_OPTIONS } from './deduplication';
import { CacheService, CacheOptions } from './cache-service';
import { PrismaClient } from '@prisma/client';

/**
 * Search service configuration
 * 
 * @param providers Configuration objects for each search provider API (e.g., API keys).
 * @param defaultProvider The default search provider to use if none are specified in the request.
 * @param deduplication Default deduplication options for the service. See `DeduplicationOptions`.
 *                      These can be overridden on a per-request basis.
 * @param cache Default cache options for the service. See `CacheOptions`.
 */
export interface SearchServiceConfig {
  providers: {
    [key in SearchProviderType]?: any;
  };
  defaultProvider?: SearchProviderType;
  deduplication?: Partial<DeduplicationOptions>;
  cache?: Partial<CacheOptions>;
}

/**
 * Search request parameters, extending basic SearchParams.
 * 
 * @param providers Optional array of provider types to use for this specific search.
 * @param deduplication Optional. If `false`, disables deduplication for this request.
 *                      If an object (`Partial<DeduplicationOptions>`), merges with service defaults.
 *                      If `true` or omitted, uses service defaults.
 * @param useCache Optional boolean (defaults to true). If `false`, bypasses the cache check for this request.
 */
export interface SearchRequest extends SearchParams {
  providers?: SearchProviderType[];
  deduplication?: boolean | Partial<DeduplicationOptions>;
  useCache?: boolean;
}

/**
 * Standardized search response format from a single provider.
 * 
 * @param results Array of normalized search results.
 * @param provider The search provider type that generated these results.
 * @param pagination Optional pagination information from the provider.
 * @param metadata Contains metadata about the search execution, including:
 *                 - searchEngine: Name of the engine used.
 *                 - searchId: ID returned by the provider, if any.
 *                 - creditsUsed: Credits consumed for the search.
 *                 - searchUrl: URL used by the provider, if available.
 *                 - timestamp: Time the search was executed.
 *                 - deduplication: Information about the deduplication process applied.
 *                 - cache: Information about cache usage for this result.
 */
export interface SearchResponse {
  results: SearchResult[];
  provider: SearchProviderType;
  pagination?: {
    nextPage?: number;
    totalResults?: number;
    hasMore?: boolean;
  };
  metadata: {
    searchEngine: string;
    searchId?: string;
    creditsUsed: number;
    searchUrl?: string;
    timestamp: Date;
    /** Information about the deduplication process applied to the results. */
    deduplication?: {
      /** Was deduplication enabled for this request? */
      enabled: boolean;
      /** Number of results before deduplication. */
      originalCount: number;
      /** Number of results after deduplication. */
      uniqueCount: number;
      /** Number of duplicates removed. */
      duplicatesRemoved: number;
    };
    /** Information about cache usage for this request. */
    cache?: {
      /** Was this result served from the cache? */
      hit: boolean;
      /** The cache key (fingerprint) generated for the request. */
      fingerprint: string;
    };
  };
}

// Define the structure of deduplication result for type safety
interface DeduplicationResult {
  results: SearchResult[];
  duplicatesRemoved: number;
  duplicateGroups: Array<{
    original: SearchResult;
    duplicates: SearchResult[];
  }>;
  logs?: Array<any>;
}

/**
 * Main search service for executing searches, managing providers, handling caching, and deduplication.
 * Initializes providers, cache service, and deduplication service based on configuration.
 */
export class SearchService {
  private providers: Map<SearchProviderType, SearchProvider>;
  private defaultProvider: SearchProviderType;
  private defaultDeduplicationOptions: DeduplicationOptions;
  private deduplicationService: DeduplicationService;
  private cacheService?: CacheService;
  
  /**
   * Creates an instance of SearchService.
   * @param config Configuration for providers, default deduplication, and cache settings.
   * @param prismaClient Optional Prisma client instance required for database caching.
   */
  constructor(config: SearchServiceConfig, prismaClient?: PrismaClient) {
    // Initialize providers
    this.providers = SearchProviderFactory.createAllProviders(config.providers);
    
    // Validate we have at least one provider
    if (this.providers.size === 0) {
      throw new Error('No search providers are available. Check configuration and API keys.');
    }
    
    // Set default provider with fallback
    if (config.defaultProvider && this.providers.has(config.defaultProvider)) {
      this.defaultProvider = config.defaultProvider;
    } else {
      // Fall back to first available provider or the default SERPER if it's available
      this.defaultProvider = this.providers.has(SearchProviderType.SERPER) 
        ? SearchProviderType.SERPER 
        : Array.from(this.providers.keys())[0];
    }
    
    // Set default deduplication options, merging with defaults
    this.defaultDeduplicationOptions = { 
        ...DEFAULT_DEDUPLICATION_OPTIONS, 
        ...(config.deduplication || {}) 
    };
    
    // Initialize deduplication service with the fully formed default options
    this.deduplicationService = new DeduplicationService(this.defaultDeduplicationOptions);

    // Initialize cache service if Prisma client is provided
    if (prismaClient) {
      this.cacheService = new CacheService(prismaClient, config.cache);
    }
  }
  
  /**
   * Get available providers
   */
  getAvailableProviders(): SearchProviderType[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Get a specific provider
   */
  getProvider(type: SearchProviderType): SearchProvider | undefined {
    return this.providers.get(type);
  }
  
  /**
   * Execute a search across specified or default providers, handling caching and deduplication.
   * 
   * @param request The search request details, including query, providers, and overrides for caching/deduplication.
   * @param userId Optional user ID for cache storage (if user-specific caching is implemented).
   * @returns A promise resolving to an array of SearchResponse objects, one for each provider used.
   */
  async search(request: SearchRequest, userId?: string): Promise<SearchResponse[]> {
    // Check cache if enabled
    if (this.cacheService && request.useCache !== false) {
      const cachedResults = await this.cacheService.get(request, userId);
      if (cachedResults) {
        // Add cache metadata
        cachedResults.forEach(result => {
          result.metadata.cache = {
            hit: true,
            fingerprint: this.cacheService!.generateFingerprint(request),
          };
        });
        return cachedResults;
      }
    }

    // Determine which providers to use
    const providerTypes = request.providers && request.providers.length > 0
      ? request.providers.filter(type => this.providers.has(type))
      : [this.defaultProvider];
    
    // Validate we have providers to use
    if (providerTypes.length === 0) {
      throw new SearchError(
        'No valid search providers specified',
        SearchErrorType.PROVIDER_UNAVAILABLE
      );
    }
    
    // Execute searches with all selected providers in parallel
    const searchPromises = providerTypes.map(type => 
      // Pass the full request, including potential deduplication overrides
      this.searchWithProvider(type, request) 
    );
    
    const results = await Promise.all(searchPromises);

    // Store in cache if enabled
    if (this.cacheService && request.useCache !== false && userId) {
      // Add non-cache hit metadata
      results.forEach(result => {
        result.metadata.cache = {
          hit: false,
          fingerprint: this.cacheService!.generateFingerprint(request),
        };
      });

      // Store in cache asynchronously (don't await)
      this.cacheService.set(request, results, userId).catch(err => {
        console.error('Error storing search results in cache:', err);
      });
    }
    
    return results;
  }
  
  /**
   * Execute a search with a specific provider, applying per-request deduplication options.
   * 
   * @param providerType The specific provider to use.
   * @param params The search parameters, including potential `deduplication` overrides (`boolean` or `Partial<DeduplicationOptions>`).
   * @returns A promise resolving to a single SearchResponse object for the specified provider.
   */
  private async searchWithProvider(
    providerType: SearchProviderType,
    // Explicitly include SearchRequest to capture deduplication override
    params: SearchRequest 
  ): Promise<SearchResponse> {
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      throw new SearchError(
        `Provider ${providerType} is not available`,
        SearchErrorType.PROVIDER_UNAVAILABLE,
        providerType
      );
    }
    
    // Execute the search
    const response = await provider.search(params);
    
    // Format to standardized response
    const formattedResponse = this.formatResponse(response, providerType);
    
    if (params.deduplication !== false) {
      const originalCount = formattedResponse.results.length;
      
      // Determine effective deduplication options for this request
      const requestOptions = params.deduplication && typeof params.deduplication === 'object' 
                             ? params.deduplication 
                             : {};
      const effectiveOptions: DeduplicationOptions = { 
          ...this.defaultDeduplicationOptions, 
          ...requestOptions 
      };
      
      // Check against the options the service instance currently holds
      const currentServiceOptions = this.deduplicationService.getOptions();
      // Compare relevant fields (add more if needed)
      if (effectiveOptions.threshold !== currentServiceOptions.threshold ||
          effectiveOptions.enableMerging !== currentServiceOptions.enableMerging) { 
         // Update the service instance ONLY if effective options differ from current instance state
         this.deduplicationService.updateOptions(effectiveOptions); 
      }
      
      // Apply deduplication using the service instance (which now has effective options)
      const deduplicationResult = this.deduplicateResults(formattedResponse.results);
      
      // Update results with deduplicated set
      formattedResponse.results = deduplicationResult.results;
      
      // Add deduplication metadata
      formattedResponse.metadata.deduplication = {
        enabled: true,
        originalCount,
        uniqueCount: deduplicationResult.results.length,
        duplicatesRemoved: deduplicationResult.duplicatesRemoved
      };
    } else {
      // Deduplication explicitly disabled
      formattedResponse.metadata.deduplication = {
        enabled: false,
        originalCount: formattedResponse.results.length,
        uniqueCount: formattedResponse.results.length,
        duplicatesRemoved: 0
      };
    }
    
    return formattedResponse;
  }
  
  /**
   * Format provider response to standardized format
   */
  private formatResponse(response: ProviderResponse, providerType: SearchProviderType): SearchResponse {
    const timestamp = new Date();
    
    // Map the results to our standard format
    const results = response.results.map(result => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.snippet || '',
      rank: result.rank,
      resultType: result.resultType || 'organic',
      searchEngine: result.searchEngine || response.meta?.searchEngine || 'unknown',
      device: result.device,
      location: result.location,
      language: result.language,
      timestamp,
      rawResponse: result
    }));
    
    // Build the response
    return {
      results,
      provider: providerType,
      pagination: response.pagination,
      metadata: {
        searchEngine: response.meta?.searchEngine || 'unknown',
        searchId: response.meta?.searchId,
        creditsUsed: response.meta?.creditsUsed || 1,
        searchUrl: response.meta?.searchUrl,
        timestamp
      }
    };
  }
  
  /**
   * Apply deduplication using the configured DeduplicationService.
   * Handles the adaptation between SearchResult types.
   * 
   * @param results Array of SearchResult objects (API format).
   * @returns A DeduplicationResult object containing unique results and stats.
   */
  private deduplicateResults(results: SearchResult[]): DeduplicationResult {
    // Adapt API SearchResult format to the DeduplicationService format using result-resolver
    // (Implicitly uses toDeduplicationResult from resolver)
    const deduplicationResults = results.map((result, index) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      position: result.rank || 0,
      provider: result.searchEngine,
      metadata: result.rawResponse || {},
      originalIndex: index // Add an index to track the original result
    }));
    
    // Apply deduplication using the service instance
    const deduplicated = this.deduplicationService.deduplicate(deduplicationResults);
    
    // Create a mapping of indices to original results for easier lookup
    const resultMap = new Map<number, SearchResult>();
    results.forEach((result, index) => {
      resultMap.set(index, result);
    });
    
    // Return deduplicated results with proper typing
    return {
      results: deduplicated.results.map((result: any) => 
        resultMap.get(result.originalIndex)!
      ),
      duplicatesRemoved: deduplicated.duplicatesRemoved,
      duplicateGroups: deduplicated.duplicateGroups.map((group: any) => ({
        original: resultMap.get(group.original.originalIndex)!,
        duplicates: group.duplicates.map((dupe: any) => 
          resultMap.get(dupe.originalIndex)!
        )
      }))
    };
  }
  
  /**
   * Utility method to build a search query with file types and domain
   */
  static buildSearchQuery(
    baseQuery: string,
    fileTypes?: FileType | FileType[],
    domain?: string
  ): string {
    let query = baseQuery.trim();
    
    // Add file type filter
    if (fileTypes) {
      const types = Array.isArray(fileTypes) ? fileTypes : [fileTypes];
      if (types.length > 0) {
        const fileTypeQuery = types.map(type => `filetype:${type}`).join(' OR ');
        query += ` (${fileTypeQuery})`;
      }
    }
    
    // Add domain filter
    if (domain) {
      query += ` site:${domain}`;
    }
    
    return query;
  }

  /**
   * Get cache service statistics
   */
  getCacheStats() {
    if (this.cacheService) {
      return this.cacheService.getStats();
    }
    return null;
  }

  /**
   * Clean up expired items from the cache
   */
  cleanupCache() {
    if (this.cacheService) {
      this.cacheService.cleanup();
    }
  }

  /**
   * Clear all items from the cache
   */
  clearCache() {
    if (this.cacheService) {
      this.cacheService.invalidateAll();
    }
  }

  /**
   * Clean up outdated cache entries from the database
   */
  async cleanupCacheDatabase() {
    if (this.cacheService) {
      return this.cacheService.cleanupDatabase();
    }
    return 0;
  }
} 