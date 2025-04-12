import { SearchProviderFactory, SearchProviderType } from './factory';
import { SearchProvider } from './provider';
import { FileType, ProviderResponse, SearchError, SearchErrorType, SearchParams, SearchResult } from './types';
import { DeduplicationOptions } from './utils/deduplication';
import { StorageService } from './services/storage-service';

/**
 * Search service configuration
 */
export interface SearchServiceConfig {
  providers: {
    [key in SearchProviderType]?: any;
  };
  defaultProvider?: SearchProviderType;
  deduplication?: DeduplicationOptions;
  storageService?: StorageService;
}

/**
 * Search request with provider selection
 */
export interface SearchRequest extends SearchParams {
  providers?: SearchProviderType[];
  deduplication?: boolean | DeduplicationOptions;
  userId?: string;
}

/**
 * Search response with results from multiple providers
 */
export interface SearchResponse {
  results: SearchResult[];
  provider: SearchProviderType;
  searchRequestId: string;
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
    rawResultsCount: number;
  };
}

/**
 * Main search service for executing searches and storing raw results
 */
export class SearchService {
  private providers: Map<SearchProviderType, SearchProvider>;
  private defaultProvider: SearchProviderType;
  private defaultDeduplicationOptions: DeduplicationOptions;
  private storageService: StorageService;
  
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
    
    // Initialize storage service
    this.storageService = config.storageService || new StorageService();
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
   * Execute a search with the specified providers and store raw results
   */
  async search(request: SearchRequest): Promise<SearchResponse[]> {
    // Ensure we have a user ID
    if (!request.userId) {
      throw new SearchError(
        'User ID is required for search requests',
        SearchErrorType.INVALID_REQUEST
      );
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
    
    // Execute searches with all providers in parallel
    const searchPromises = providerTypes.map(type => 
      this.searchWithProvider(type, request)
    );
    
    return Promise.all(searchPromises);
  }
  
  /**
   * Execute a search with a specific provider and store raw results
   */
  private async searchWithProvider(
    providerType: SearchProviderType,
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
    
    // Create a search request in the database
    const { queryId } = await this.storageService.createSearchRequest(
      params.userId!,
      params.query,
      providerType.toString(),
      {
        maxResults: params.maxResults,
        fileTypes: params.fileTypes,
        domain: params.domain,
        deduplication: params.deduplication
      }
    );
    
    // Execute the search
    const response = await provider.search(params);
    
    // Format to standardized response
    const formattedResponse = this.formatResponse(response, providerType, queryId);
    
    // Store raw results
    await this.storeRawResults(queryId, formattedResponse);
    
    return formattedResponse;
  }
  
  /**
   * Format provider response to standardized format
   */
  private formatResponse(
    response: ProviderResponse, 
    providerType: SearchProviderType,
    searchRequestId: string
  ): SearchResponse {
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
      searchRequestId,
      pagination: response.pagination,
      metadata: {
        searchEngine: response.meta?.searchEngine || 'unknown',
        searchId: response.meta?.searchId,
        creditsUsed: response.meta?.creditsUsed || 1,
        searchUrl: response.meta?.searchUrl,
        timestamp,
        rawResultsCount: results.length
      }
    };
  }
  
  /**
   * Store raw search results in the database
   */
  private async storeRawResults(
    searchRequestId: string,
    response: SearchResponse
  ): Promise<void> {
    // Convert results to raw format
    const rawResults = response.results.map(result => ({
      title: result.title,
      url: result.url,
      source: response.provider.toString(),
      metadata: {
        snippet: result.snippet,
        rank: result.rank,
        resultType: result.resultType,
        searchEngine: result.searchEngine,
        device: result.device,
        location: result.location,
        language: result.language,
        rawResponse: result.rawResponse
      }
    }));
    
    // Store raw results
    await this.storageService.saveRawResults(searchRequestId, rawResults);
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
