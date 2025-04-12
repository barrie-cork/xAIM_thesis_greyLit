import { BaseSearchProvider, BaseProviderConfig } from '../base-provider';
import { FileType, ProviderResponse, SearchError, SearchErrorType, SearchParams } from '../types';

/**
 * Configuration for SerperProvider
 */
export interface SerperConfig extends BaseProviderConfig {
  endpoint?: string;
  gl?: string; // Country for search results (default: 'us')
  hl?: string; // Language for search results (default: 'en')
}

/**
 * Serper API provider implementation
 * @see https://serper.dev/api
 */
export class SerperProvider extends BaseSearchProvider {
  name = 'Serper';
  
  private serperConfig: SerperConfig;
  private static DEFAULT_ENDPOINT = 'https://google.serper.dev/search';
  
  constructor(config: SerperConfig) {
    super(config);
    
    this.serperConfig = {
      ...config,
      endpoint: config.endpoint || SerperProvider.DEFAULT_ENDPOINT,
      gl: config.gl || 'us',
      hl: config.hl || 'en'
    };
  }
  
  /**
   * Execute a search using the Serper API
   */
  protected async executeSearch(params: SearchParams): Promise<ProviderResponse> {
    try {
      // Convert our search params to Serper API format
      const serperParams = this.buildSerperParams(params);
      
      // Make the API request
      const response = await fetch(this.serperConfig.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.config.apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify(serperParams)
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.handleApiError({
          status: response.status,
          message: errorText,
          headers: response.headers
        }, `Serper API error: ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Format the response into our standard format
      return this.formatResponse(data, params);
    } catch (error: any) {
      if (error instanceof SearchError) {
        throw error;
      }
      
      this.handleApiError(error, 'Failed to execute search with Serper API');
    }
  }
  
  /**
   * Build Serper API request parameters from our standard format
   */
  private buildSerperParams(params: SearchParams): Record<string, any> {
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
    
    // Build the Serper params
    const serperParams: Record<string, any> = {
      q,
      gl: this.serperConfig.gl,
      hl: this.serperConfig.hl,
      num: maxResults
    };
    
    // Add page if provided
    if (page && page > 1) {
      serperParams.start = (page - 1) * (maxResults || 10);
    }
    
    return serperParams;
  }
  
  /**
   * Format Serper API response into our standard format
   */
  private formatResponse(data: any, params: SearchParams): ProviderResponse {
    // Handle empty response
    if (!data || !data.organic) {
      return {
        results: [],
        pagination: {
          nextPage: undefined,
          totalResults: 0,
          hasMore: false
        },
        meta: {
          searchEngine: 'Google',
          searchId: undefined,
          creditsUsed: 1
        },
        rawResponse: data || {}
      };
    }
    
    // Extract organic results
    const results = (data.organic || []).map((result: any, index: number) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      rank: index + 1 + ((params.page || 1) - 1) * (params.maxResults || 10),
      resultType: 'organic',
      searchEngine: 'Google'
    }));
    
    // Calculate pagination
    const start = (params.page || 1) - 1;
    const nextPage = results.length >= (params.maxResults || 10) ? (params.page || 1) + 1 : undefined;
    
    // Build response
    return {
      results,
      pagination: {
        nextPage,
        totalResults: parseInt(data.searchInformation?.totalResults, 10) || results.length,
        hasMore: nextPage !== undefined
      },
      meta: {
        searchEngine: 'Google',
        searchId: undefined,
        creditsUsed: 1,
        searchUrl: data.searchParameters?.originalUrl,
        relatedSearches: data.relatedSearches?.map((item: any) => item.query) || []
      },
      rawResponse: data
    };
  }
} 