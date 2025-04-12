import { BaseSearchProvider, BaseProviderConfig } from '../base-provider';
import { FileType, ProviderResponse, SearchError, SearchErrorType, SearchParams } from '../types';

/**
 * Configuration for SerpApiProvider
 */
export interface SerpApiConfig extends BaseProviderConfig {
  endpoint?: string;
  gl?: string; // Country for search results (default: 'us')
  hl?: string; // Language for search results (default: 'en')
  device?: string; // Device type (default: 'desktop')
}

/**
 * SerpApi provider implementation
 * @see https://serpapi.com/search-api
 */
export class SerpApiProvider extends BaseSearchProvider {
  name = 'SerpApi';
  
  private serpApiConfig: SerpApiConfig;
  private static DEFAULT_ENDPOINT = 'https://serpapi.com/search';
  
  constructor(config: SerpApiConfig) {
    super(config);
    
    this.serpApiConfig = {
      ...config,
      endpoint: config.endpoint || SerpApiProvider.DEFAULT_ENDPOINT,
      gl: config.gl || 'us',
      hl: config.hl || 'en',
      device: config.device || 'desktop'
    };
  }
  
  /**
   * Execute a search using the SerpApi
   */
  protected async executeSearch(params: SearchParams): Promise<ProviderResponse> {
    try {
      // Convert our search params to SerpApi format
      const searchParams = this.buildSerpApiParams(params);
      
      // Create URL with query parameters
      const url = new URL(this.serpApiConfig.endpoint!);
      
      // Add all parameters to URL
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
      
      // Make the API request
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.handleApiError({
          status: response.status,
          message: errorText,
          headers: response.headers
        }, `SerpApi error: ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Format the response into our standard format
      return this.formatResponse(data, params);
    } catch (error: any) {
      if (error instanceof SearchError) {
        throw error;
      }
      
      this.handleApiError(error, 'Failed to execute search with SerpApi');
    }
  }
  
  /**
   * Build SerpApi request parameters from our standard format
   */
  private buildSerpApiParams(params: SearchParams): Record<string, any> {
    const { query, maxResults, fileType, page, domain } = params;
    
    // Base query with domain filter if provided
    let q = query;
    if (domain) {
      q = `${q} site:${domain}`;
    }
    
    // Add file type filter if provided
    if (fileType) {
      const types = Array.isArray(fileType) ? fileType : [fileType];
      
      if (types.length > 0) {
        const fileTypeString = types.map(type => `filetype:${type}`).join(' OR ');
        q = `${q} (${fileTypeString})`;
      }
    }
    
    // Build the SerpApi params
    const serpApiParams: Record<string, any> = {
      q,
      api_key: this.config.apiKey,
      engine: 'google',
      google_domain: 'google.com',
      gl: this.serpApiConfig.gl,
      hl: this.serpApiConfig.hl,
      device: this.serpApiConfig.device,
      num: maxResults || 10
    };
    
    // Add page if provided
    if (page && page > 1) {
      serpApiParams.start = (page - 1) * (maxResults || 10);
    }
    
    return serpApiParams;
  }
  
  /**
   * Format SerpApi response into our standard format
   */
  private formatResponse(data: any, params: SearchParams): ProviderResponse {
    // Handle empty response
    if (!data || !data.organic_results) {
      return {
        results: [],
        pagination: {
          nextPage: undefined,
          totalResults: 0,
          hasMore: false
        },
        meta: {
          searchEngine: 'Google',
          searchId: data.search_metadata?.id,
          creditsUsed: 1,
          searchUrl: data.search_metadata?.google_url
        },
        rawResponse: data || {}
      };
    }
    
    // Extract organic results
    const results = (data.organic_results || []).map((result: any, index: number) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      rank: index + 1 + ((params.page || 1) - 1) * (params.maxResults || 10),
      resultType: 'organic',
      searchEngine: 'Google'
    }));
    
    // Extract pagination info
    const serpApiPagination = data.serpapi_pagination || {};
    const nextPage = serpApiPagination.next ? (params.page || 1) + 1 : undefined;
    
    // Get related searches if available
    const relatedSearches = data.related_searches 
      ? data.related_searches.map((item: any) => item.query) 
      : [];
    
    // Build response
    return {
      results,
      pagination: {
        nextPage,
        totalResults: parseInt(data.search_information?.total_results.replace(/,/g, ''), 10) || results.length,
        hasMore: nextPage !== undefined
      },
      meta: {
        searchEngine: 'Google',
        searchId: data.search_metadata?.id,
        creditsUsed: 1,
        searchUrl: data.search_metadata?.google_url,
        relatedSearches
      },
      rawResponse: data
    };
  }
} 