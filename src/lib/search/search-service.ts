import { SearchProviderFactory, SearchProviderType } from './factory';
import { SearchProvider } from './provider';
import { FileType, ProviderResponse, SearchError, SearchErrorType, SearchParams, SearchResult } from './types';

/**
 * Search service configuration
 */
export interface SearchServiceConfig {
  providers: {
    [key in SearchProviderType]?: any;
  };
  defaultProvider?: SearchProviderType;
}

/**
 * Search request with provider selection
 */
export interface SearchRequest extends SearchParams {
  providers?: SearchProviderType[];
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
  };
}

/**
 * Main search service for executing searches and managing providers
 */
export class SearchService {
  private providers: Map<SearchProviderType, SearchProvider>;
  private defaultProvider: SearchProviderType;
  
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
    params: SearchParams
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
    
    // Convert to standardized response
    return this.formatResponse(response, providerType);
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