import { SearchProviderFactory, SearchProviderType } from './factory';
import { SearchProvider } from './provider';
import { FileType, ProviderResponse, SearchError, SearchErrorType, SearchParams, SearchResult } from './types';
import { DeduplicationService } from './deduplication';
import { DeduplicationOptions } from './utils/deduplication';

/**
 * Search service configuration
 */
export interface SearchServiceConfig {
  providers: {
    [key in SearchProviderType]?: any;
  };
  defaultProvider?: SearchProviderType;
  deduplication?: DeduplicationOptions;
}

/**
 * Search request with provider selection
 */
export interface SearchRequest extends SearchParams {
  providers?: SearchProviderType[];
  deduplication?: boolean | DeduplicationOptions;
}

/**
 * Search response with results from multiple providers
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
    deduplication?: {
      enabled: boolean;
      originalCount: number;
      uniqueCount: number;
      duplicatesRemoved: number;
    };
  };
}

/**
 * Main search service for executing searches and managing providers
 */
export class SearchService {
  private providers: Map<SearchProviderType, SearchProvider>;
  private defaultProvider: SearchProviderType;
  private defaultDeduplicationOptions: DeduplicationOptions;
  private deduplicationService: DeduplicationService;
  
  constructor(config: SearchServiceConfig) {
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
    
    // Set default deduplication options
    this.defaultDeduplicationOptions = config.deduplication || {
      titleSimilarityThreshold: 0.85,
      strictUrlMatching: false
    };
    
    // Initialize deduplication service with default threshold from options
    this.deduplicationService = new DeduplicationService(
      this.defaultDeduplicationOptions.titleSimilarityThreshold || 0.85
    );
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
   * Execute a search with the specified providers
   */
  async search(request: SearchRequest): Promise<SearchResponse[]> {
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
    
    // Execute searches with all providers in parallel
    const searchPromises = providerTypes.map(type => 
      this.searchWithProvider(type, request)
    );
    
    return Promise.all(searchPromises);
  }
  
  /**
   * Execute a search with a specific provider
   */
  private async searchWithProvider(
    providerType: SearchProviderType,
    params: SearchParams & { deduplication?: boolean | DeduplicationOptions }
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
    
    // Apply deduplication if enabled
    if (params.deduplication !== false) { // default to enabled
      const originalCount = formattedResponse.results.length;
      
      // Get deduplication options
      const deduplicationOptions: DeduplicationOptions = 
        params.deduplication && typeof params.deduplication === 'object'
          ? { ...this.defaultDeduplicationOptions, ...params.deduplication }
          : this.defaultDeduplicationOptions;
      
      // Update threshold if different from default
      if (deduplicationOptions.titleSimilarityThreshold !== this.deduplicationService['threshold']) {
        this.deduplicationService = new DeduplicationService(
          deduplicationOptions.titleSimilarityThreshold || 0.85
        );
      }
      
      // Apply deduplication using the service
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
   * Apply deduplication to search results using the DeduplicationService
   */
  private deduplicateResults(results: SearchResult[]): {
    results: SearchResult[];
    duplicatesRemoved: number;
    duplicateGroups?: Array<{original: SearchResult; duplicates: SearchResult[]}>;
  } {
    // Adapt our SearchResult format to the DeduplicationService format
    const deduplicationResults = results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      position: result.rank || 0,
      provider: result.searchEngine,
      metadata: result.rawResponse || {}
    }));
    
    // Perform deduplication
    const deduplicationResult = this.deduplicationService.deduplicate(deduplicationResults);
    
    // Convert back to our original format by finding the original objects
    const uniqueResults = deduplicationResult.results.map(dedupResult => {
      // Find the original result object that matches this one
      return results.find(r => 
        r.title === dedupResult.title && 
        r.url === dedupResult.url
      ) || results[0]; // Fallback to first result if not found (shouldn't happen)
    });
    
    // We don't actually use the duplicate groups in the current implementation
    // so we can omit them to avoid type conflicts
    return {
      results: uniqueResults,
      duplicatesRemoved: deduplicationResult.duplicatesRemoved
    };
  }
  
  /**
   * Build search query with file type filters and site constraint
   */
  static buildSearchQuery(
    baseQuery: string,
    fileTypes?: FileType | FileType[],
    domain?: string
  ): string {
    let query = baseQuery;
    
    // Add domain filter
    if (domain) {
      query = `${query} site:${domain}`;
    }
    
    // Add file type filter
    if (fileTypes) {
      const types = Array.isArray(fileTypes) ? fileTypes : [fileTypes];
      
      if (types.length > 0) {
        const fileTypeString = types.map(type => `filetype:${type}`).join(' OR ');
        query = `${query} (${fileTypeString})`;
      }
    }
    
    return query;
  }
} 