import { RateLimiter, RateLimitStatus, SearchProvider } from './provider';
import { ProviderResponse, RateLimitOptions, SearchError, SearchErrorType, SearchParams } from './types';

/**
 * Configuration for BaseSearchProvider
 */
export interface BaseProviderConfig {
  apiKey: string;
  rateLimitOptions?: RateLimitOptions;
  defaultMaxResults?: number;
  retryOptions?: {
    maxRetries: number;
    initialDelayMs: number;
    backoffFactor: number;
  };
}

/**
 * Base class for all search providers with common functionality
 */
export abstract class BaseSearchProvider implements SearchProvider {
  /**
   * Provider name
   */
  abstract name: string;
  
  /**
   * Configuration
   */
  protected config: BaseProviderConfig;
  
  /**
   * Rate limiter
   */
  protected rateLimiter: RateLimiter;
  
  /**
   * Default rate limit options if not provided in config
   */
  private static DEFAULT_RATE_LIMIT: RateLimitOptions = {
    maxTokens: 10,
    refillRate: 1, // 1 token per second
    timeWindow: 1000 // 1 second window
  };
  
  /**
   * Default retry options if not provided in config
   */
  private static DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffFactor: 2
  };
  
  constructor(config: BaseProviderConfig) {
    this.config = {
      ...config,
      rateLimitOptions: config.rateLimitOptions || BaseSearchProvider.DEFAULT_RATE_LIMIT,
      defaultMaxResults: config.defaultMaxResults || 10,
      retryOptions: config.retryOptions || BaseSearchProvider.DEFAULT_RETRY_OPTIONS
    };
    
    this.rateLimiter = new RateLimiter(this.config.rateLimitOptions!);
  }
  
  /**
   * Check if the provider is available (has valid credentials)
   */
  isAvailable(): boolean {
    return Boolean(this.config.apiKey);
  }
  
  /**
   * Get the current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return this.rateLimiter.getStatus();
  }
  
  /**
   * Execute a search with retry logic and rate limiting
   */
  async search(params: SearchParams): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new SearchError(
        `Provider ${this.name} is not available: missing API key`,
        SearchErrorType.PROVIDER_UNAVAILABLE,
        this.name
      );
    }
    
    // Apply default max results if not specified
    const searchParams = {
      ...params,
      maxResults: params.maxResults || this.config.defaultMaxResults
    };
    
    // Try to consume a rate limit token
    if (!this.rateLimiter.consume(1)) {
      // If rate limited, wait for tokens to become available
      await this.rateLimiter.waitForTokens(1);
    }
    
    // Execute search with retries
    let lastError: Error | null = null;
    const { maxRetries, initialDelayMs, backoffFactor } = this.config.retryOptions!;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeSearch(searchParams);
        return response;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if not a retryable error
        if (error instanceof SearchError) {
          if (
            error.type === SearchErrorType.INVALID_REQUEST ||
            error.type === SearchErrorType.PROVIDER_UNAVAILABLE
          ) {
            throw error;
          }
          
          // If rate limited, wait for the specified time before retrying
          if (error.type === SearchErrorType.RATE_LIMITED && error.retryAfter) {
            const waitMs = error.retryAfter * 1000;
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delayMs = initialDelayMs * Math.pow(backoffFactor, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // If we get here, we've exhausted all retries
    throw lastError || new SearchError(
      `Failed to execute search after ${maxRetries} retries`,
      SearchErrorType.UNKNOWN,
      this.name
    );
  }
  
  /**
   * Execute the actual search - implemented by concrete providers
   */
  protected abstract executeSearch(params: SearchParams): Promise<ProviderResponse>;
  
  /**
   * Helper to handle API errors consistently
   */
  protected handleApiError(error: any, defaultMessage: string): never {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new SearchError(
        `Connection to ${this.name} API failed: ${error.message || defaultMessage}`,
        SearchErrorType.PROVIDER_UNAVAILABLE,
        this.name
      );
    }
    
    // Rate limiting
    if (error.status === 429 || error.statusCode === 429) {
      const retryAfter = error.headers?.['retry-after'] 
        ? parseInt(error.headers['retry-after'], 10) 
        : undefined;
      
      throw new SearchError(
        `Rate limit exceeded for ${this.name} API`,
        SearchErrorType.RATE_LIMITED,
        this.name,
        429,
        retryAfter || 60 // Default to 60 seconds if no retry-after header
      );
    }
    
    // Authentication errors
    if (error.status === 401 || error.statusCode === 401 || error.status === 403 || error.statusCode === 403) {
      throw new SearchError(
        `Authentication failed for ${this.name} API: ${error.message || 'Invalid API key'}`,
        SearchErrorType.PROVIDER_UNAVAILABLE,
        this.name,
        error.status || error.statusCode
      );
    }
    
    // Bad request
    if (error.status === 400 || error.statusCode === 400) {
      throw new SearchError(
        `Invalid request to ${this.name} API: ${error.message || defaultMessage}`,
        SearchErrorType.INVALID_REQUEST,
        this.name,
        400
      );
    }
    
    // Server errors
    if (
      (error.status && error.status >= 500 && error.status < 600) ||
      (error.statusCode && error.statusCode >= 500 && error.statusCode < 600)
    ) {
      throw new SearchError(
        `${this.name} API server error: ${error.message || defaultMessage}`,
        SearchErrorType.API_ERROR,
        this.name,
        error.status || error.statusCode
      );
    }
    
    // Any other error
    throw new SearchError(
      `${this.name} API error: ${error.message || defaultMessage}`,
      SearchErrorType.UNKNOWN,
      this.name,
      error.status || error.statusCode
    );
  }
} 