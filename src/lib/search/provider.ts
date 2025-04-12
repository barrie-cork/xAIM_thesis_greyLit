import { ProviderResponse, RateLimitOptions, SearchError, SearchErrorType, SearchParams } from './types';

/**
 * Interface for all search providers
 */
export interface SearchProvider {
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Execute a search with the provided parameters
   */
  search(params: SearchParams): Promise<ProviderResponse>;
  
  /**
   * Check if the provider is available (has valid credentials/config)
   */
  isAvailable(): boolean;
  
  /**
   * Get the current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  available: number;
  maxTokens: number;
  resetTimestamp?: Date;
  isLimited: boolean;
}

/**
 * Token bucket rate limiter implementation
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private options: RateLimitOptions;
  
  constructor(options: RateLimitOptions) {
    this.options = options;
    this.tokens = options.maxTokens;
    this.lastRefill = Date.now();
  }
  
  /**
   * Try to consume a token
   * @param count Number of tokens to consume
   * @returns true if tokens were consumed, false if not enough tokens
   */
  consume(count: number = 1): boolean {
    this.refill();
    
    if (this.tokens < count) {
      return false;
    }
    
    this.tokens -= count;
    return true;
  }
  
  /**
   * Refill tokens based on time elapsed since last refill
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed <= 0) {
      return;
    }
    
    // Calculate tokens to add based on elapsed time and refill rate
    const tokensToAdd = Math.floor(
      (elapsed / 1000) * this.options.refillRate
    );
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.options.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  /**
   * Get the current rate limit status
   */
  getStatus(): RateLimitStatus {
    this.refill();
    
    // Calculate time until rate limit resets
    const tokensNeeded = this.options.maxTokens - this.tokens;
    const secondsToRefill = tokensNeeded / this.options.refillRate;
    const resetTimestamp = new Date(Date.now() + secondsToRefill * 1000);
    
    return {
      available: this.tokens,
      maxTokens: this.options.maxTokens,
      resetTimestamp: this.tokens < this.options.maxTokens ? resetTimestamp : undefined,
      isLimited: this.tokens <= 0
    };
  }
  
  /**
   * Wait for tokens to become available
   * @param count Number of tokens needed
   * @param maxWaitMs Maximum time to wait in milliseconds
   * @returns Promise that resolves when tokens are available or rejects if timeout
   */
  async waitForTokens(count: number = 1, maxWaitMs: number = 30000): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= count) {
      return true;
    }
    
    // Calculate time needed to refill
    const tokensNeeded = count - this.tokens;
    const msNeeded = (tokensNeeded / this.options.refillRate) * 1000;
    
    if (msNeeded > maxWaitMs) {
      throw new SearchError(
        `Rate limit exceeded. Would need to wait ${Math.ceil(msNeeded / 1000)}s, but max wait is ${maxWaitMs / 1000}s`,
        SearchErrorType.RATE_LIMITED,
        undefined,
        429,
        Math.ceil(msNeeded / 1000)
      );
    }
    
    // Wait for tokens to refill
    await new Promise(resolve => setTimeout(resolve, msNeeded));
    this.refill();
    
    if (this.tokens >= count) {
      return true;
    }
    
    throw new SearchError(
      'Rate limit still exceeded after waiting',
      SearchErrorType.RATE_LIMITED,
      undefined, 
      429
    );
  }
} 