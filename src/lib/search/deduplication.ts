export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  provider: string;
  metadata: Record<string, any>;
}

export interface DuplicateLog {
  original: SearchResult;
  duplicate: SearchResult;
  reason: 'url_match' | 'title_similarity' | null;
  similarity?: number;
  normalizedUrls?: { original: string; duplicate: string };
}

export interface DeduplicationOptions {
  threshold: number;
  enableUrlNormalization: boolean;
  enableTitleMatching: boolean;
  logDuplicates: boolean;
  treatSubdomainsAsSame: boolean;
  ignoreProtocol: boolean;
  ignoreWww: boolean;
  ignoreTrailingSlash: boolean;
  ignoreQueryParams: boolean;
  ignoreCaseInPath: boolean;
}

export const DEFAULT_DEDUPLICATION_OPTIONS: DeduplicationOptions = {
  threshold: 0.8,
  enableUrlNormalization: true,
  enableTitleMatching: true,
  logDuplicates: true,
  treatSubdomainsAsSame: false,
  ignoreProtocol: true,
  ignoreWww: true,
  ignoreTrailingSlash: true,
  ignoreQueryParams: true,
  ignoreCaseInPath: true
};

export class DeduplicationService {
  private options: DeduplicationOptions;
  private duplicateLogs: DuplicateLog[] = [];

  constructor(options?: Partial<DeduplicationOptions>) {
    this.options = {
      ...DEFAULT_DEDUPLICATION_OPTIONS,
      ...options
    };
  }

  /**
   * Deduplicate search results based on title and URL similarity
   */
  deduplicate(results: SearchResult[]): {
    results: SearchResult[];
    duplicatesRemoved: number;
    duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}>;
    logs?: DuplicateLog[];
  } {
    this.duplicateLogs = [];
    const uniqueResults: SearchResult[] = [];
    const duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}> = [];
    
    for (const result of results) {
      const { duplicate, reason, similarity, normalizedUrls } = this.findDuplicate(result, uniqueResults);
      
      if (duplicate) {
        // Find or create a duplicate group
        let group = duplicateGroups.find(g => g.original === duplicate);
        
        if (!group) {
          group = { original: duplicate, duplicates: [] };
          duplicateGroups.push(group);
        }
        
        group.duplicates.push(result);
        
        // Log the duplicate if enabled
        if (this.options.logDuplicates) {
          this.duplicateLogs.push({
            original: duplicate,
            duplicate: result,
            reason,
            similarity,
            normalizedUrls
          });
        }
      } else {
        uniqueResults.push(result);
      }
    }
    
    return {
      results: uniqueResults,
      duplicatesRemoved: results.length - uniqueResults.length,
      duplicateGroups,
      logs: this.options.logDuplicates ? this.duplicateLogs : undefined
    };
  }
  
  /**
   * Find a duplicate of the result in the existing results
   */
  private findDuplicate(result: SearchResult, existingResults: SearchResult[]): {
    duplicate: SearchResult | null;
    reason: 'url_match' | 'title_similarity' | null;
    similarity?: number;
    normalizedUrls?: { original: string; duplicate: string };
  } {
    for (const existingResult of existingResults) {
      // Check URL similarity if enabled
      if (this.options.enableUrlNormalization) {
        const resultUrlNormalized = this.normalizeUrl(result.url);
        const existingUrlNormalized = this.normalizeUrl(existingResult.url);
        
        if (resultUrlNormalized === existingUrlNormalized) {
          return {
            duplicate: existingResult,
            reason: 'url_match',
            normalizedUrls: {
              original: existingUrlNormalized,
              duplicate: resultUrlNormalized
            }
          };
        }
      }
      
      // Check title similarity if enabled
      if (this.options.enableTitleMatching && result.title && existingResult.title) {
        const similarity = this.calculateSimilarity(result.title, existingResult.title);
        if (similarity > this.options.threshold) {
          return {
            duplicate: existingResult,
            reason: 'title_similarity',
            similarity
          };
        }
      }
    }
    
    return { duplicate: null, reason: null };
  }
  
  /**
   * Advanced URL normalization
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      let normalized = '';
      
      // Handle protocol
      normalized = this.options.ignoreProtocol ? '//' : urlObj.protocol + '//';
      
      // Handle hostname (with www handling)
      let hostname = urlObj.hostname;
      if (this.options.ignoreWww && hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      // Handle subdomains
      if (this.options.treatSubdomainsAsSame) {
        // Extract the main domain (last two parts)
        const parts = hostname.split('.');
        if (parts.length > 2) {
          hostname = parts.slice(-2).join('.');
        }
      }
      
      normalized += hostname;
      
      // Handle pathname
      let pathname = urlObj.pathname;
      if (this.options.ignoreTrailingSlash && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      
      if (this.options.ignoreCaseInPath) {
        pathname = pathname.toLowerCase();
      }
      
      normalized += pathname;
      
      // Handle query parameters
      if (!this.options.ignoreQueryParams && urlObj.search) {
        // Sort query parameters to ensure consistent ordering
        const params = new URLSearchParams(urlObj.search);
        const sortedParams = new URLSearchParams([...params.entries()].sort());
        normalized += '?' + sortedParams.toString();
      }
      
      return normalized;
    } catch (e) {
      // If URL parsing fails, return original
      return url;
    }
  }
  
  /**
   * Calculate similarity between two strings (0-1)
   * Uses Levenshtein distance
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Simple Levenshtein distance implementation
    const matrix: number[][] = Array(aLower.length + 1).fill(null).map(() => Array(bLower.length + 1).fill(0));
    
    for (let i = 0; i <= aLower.length; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= bLower.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= aLower.length; i++) {
      for (let j = 1; j <= bLower.length; j++) {
        const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[aLower.length][bLower.length];
    const maxLength = Math.max(aLower.length, bLower.length);
    
    return 1 - distance / maxLength;
  }
  
  /**
   * Get the current deduplication options
   */
  getOptions(): DeduplicationOptions {
    return { ...this.options };
  }
  
  /**
   * Update deduplication options
   */
  updateOptions(options: Partial<DeduplicationOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
  
  /**
   * Get logs from the last deduplication operation
   */
  getLogs(): DuplicateLog[] {
    return [...this.duplicateLogs];
  }
} 