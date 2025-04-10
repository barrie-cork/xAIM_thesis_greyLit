import { CoreSearchResult } from './common-types';
import getLevenshteinDistance from 'fast-levenshtein';

export interface SearchResult extends CoreSearchResult {
  position: number;
  provider: string;
  [key: string]: any; // Allow string indexing
}

export interface DuplicateLog {
  original: SearchResult;
  duplicate: SearchResult;
  reason: 'url_match' | 'title_similarity' | null;
  similarity?: number;
  normalizedUrls?: { original: string; duplicate: string };
  matchDetails?: Record<string, { score: number; values: [string, string] }>;
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
  mergeStrategy?: string;
  enableMerging?: boolean;
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
  ignoreCaseInPath: true,
  mergeStrategy: 'conservative',
  enableMerging: false
};

export interface MergeStrategy {
  name: string;
  priority: Array<{
    field: string;
    sourcePreference: Array<string>; // List of sources in order of preference
  }>;
  combineFields?: Array<string>; // Fields that should be combined rather than replaced
}

export const DEFAULT_MERGE_STRATEGIES: Record<string, MergeStrategy> = {
  conservative: {
    name: "conservative",
    priority: [
      { field: "title", sourcePreference: ["Google Scholar", "Google", "Bing"] },
      { field: "snippet", sourcePreference: ["Google", "Google Scholar", "Bing"] },
      { field: "url", sourcePreference: ["Google Scholar", "Google", "Bing"] }
    ]
  },
  comprehensive: {
    name: "comprehensive",
    priority: [
      { field: "title", sourcePreference: ["Google Scholar", "Google", "Bing"] },
      { field: "snippet", sourcePreference: ["Google", "Google Scholar", "Bing"] }
    ],
    combineFields: ["snippet"] // Combine snippets from multiple sources
  }
};

export class DeduplicationService {
  private options: DeduplicationOptions;
  private duplicateLogs: DuplicateLog[] = [];
  private mergeStrategies: Record<string, MergeStrategy>;

  constructor(
    options?: Partial<DeduplicationOptions>,
    mergeStrategies?: Record<string, MergeStrategy>
  ) {
    this.options = {
      ...DEFAULT_DEDUPLICATION_OPTIONS,
      ...options
    };
    
    this.mergeStrategies = mergeStrategies || DEFAULT_MERGE_STRATEGIES;
  }

  /**
   * Deduplicate search results based on title and URL similarity (Optimized Loop)
   */
  deduplicate(results: SearchResult[], options?: {
    mergeStrategy?: string;
    shouldMerge?: boolean;
  }): {
    results: SearchResult[];
    duplicatesRemoved: number;
    duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}>;
    logs?: DuplicateLog[];
  } {
    const mergeStrategy = options?.mergeStrategy || this.options.mergeStrategy;
    const shouldMerge = options?.shouldMerge !== undefined 
      ? options.shouldMerge 
      : this.options.enableMerging;
      
    this.duplicateLogs = [];
    const uniqueResults: SearchResult[] = [];
    const duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}> = [];
    // Use a Map for efficient lookup of existing normalized URLs
    const uniqueUrlMap = new Map<string, number>(); // Map<normalizedUrl, indexInUniqueResults>
    
    for (const result of results) {
      let duplicate: SearchResult | null = null;
      let reason: 'url_match' | 'title_similarity' | null = null;
      let similarity: number | undefined = undefined;
      let normalizedUrls: { original: string; duplicate: string } | undefined = undefined;
      let matchDetails: Record<string, { score: number; values: [string, string] }> | undefined = undefined;
      const currentNormalizedUrl = this.normalizeUrl(result.url);
      let currentDomain: string | null = null;
      try { currentDomain = new URL(result.url).hostname; } catch (e) {}

      // --- Step 1: Check for exact URL match using the Map (Optimized) ---
      if (this.options.enableUrlNormalization && uniqueUrlMap.has(currentNormalizedUrl)) {
          const existingIndex = uniqueUrlMap.get(currentNormalizedUrl)!;
          duplicate = uniqueResults[existingIndex];
          reason = 'url_match';
          normalizedUrls = { original: currentNormalizedUrl, duplicate: currentNormalizedUrl };
          // Calculate details only if logging enabled, as it requires similarity calc
          if (this.options.logDuplicates) {
             const { details } = this.calculateDetailedSimilarity(result, duplicate);
             matchDetails = details;
          }
      } else {
          // --- Step 2: If no exact URL match, check for title similarity (if enabled) ---
          if (this.options.enableTitleMatching && result.title && currentDomain) {
             // Iterate through existing unique results for title comparison
             // This loop remains, but is only entered if no exact URL match was found
             for (let i = 0; i < uniqueResults.length; i++) {
                 const existingResult = uniqueResults[i];
                 if (existingResult.title) {
                    // --- Optimization: Check domains before expensive similarity calc ---
                    let existingDomain: string | null = null;
                    try { existingDomain = new URL(existingResult.url).hostname; } catch (e) {}
                    
                    // Only compare titles if domains are considered potentially matching
                    if (existingDomain && this.domainsConsideredSame(currentDomain, existingDomain)) {
                         const { overall, details } = this.calculateDetailedSimilarity(result, existingResult);
                         if (overall > this.options.threshold) {
                             duplicate = existingResult;
                             reason = 'title_similarity';
                             similarity = overall;
                             matchDetails = details;
                             // We found a title duplicate, stop checking others for this result
                             break; 
                         }
                    } 
                 }
             }
          }
      }

      // --- Step 3: Process based on whether a duplicate was found ---
      if (duplicate) {
        // Find or create a duplicate group
        let group = duplicateGroups.find(g => g.original === duplicate);
        if (!group) {
          group = { original: duplicate, duplicates: [] };
          duplicateGroups.push(group);
        }
        group.duplicates.push(result);
        
        // Apply merge strategy if enabled
        if (shouldMerge && mergeStrategy) {
          const index = uniqueResults.indexOf(duplicate);
          if (index !== -1) {
            const merged = this.mergeResults(duplicate, result, mergeStrategy);
            uniqueResults[index] = merged; 
            group.original = merged;
            // Update the map if the merged result's normalized URL differs (unlikely but possible)
            const mergedNormalizedUrl = this.normalizeUrl(merged.url);
            if (mergedNormalizedUrl !== currentNormalizedUrl && uniqueUrlMap.has(currentNormalizedUrl)) {
                 // If original was mapped, remove old map entry if needed
                 // (Might be complex if multiple things mapped to old URL)
                 // For simplicity, let's just ensure the new one is mapped correctly
                 uniqueUrlMap.set(mergedNormalizedUrl, index);
            } else {
                 uniqueUrlMap.set(mergedNormalizedUrl, index); // Ensure mapping stays correct
            }
          }
        }
        
        // Log the duplicate if enabled
        if (this.options.logDuplicates) {
          this.duplicateLogs.push({ original: duplicate, duplicate: result, reason, similarity, normalizedUrls, matchDetails });
        }
      } else {
        // Add as unique result and map its normalized URL
        uniqueResults.push(result);
        uniqueUrlMap.set(currentNormalizedUrl, uniqueResults.length - 1);
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
   * Calculate detailed similarity between two results (Using Jaccard for Titles)
   */
  private calculateDetailedSimilarity(result1: SearchResult, result2: SearchResult): {
    overall: number;
    details: Record<string, { score: number; values: [string, string] }>;
  } {
    const details: Record<string, { score: number; values: [string, string] }> = {};
    
    // Compare titles using Jaccard Index
    if (result1.title && result2.title) {
      const titleScore = this.calculateJaccardSimilarity(result1.title, result2.title);
      details.title = { 
        score: titleScore, 
        values: [result1.title, result2.title] 
      };
    }
    
    // Compare URLs (using normalized URLs)
    const url1 = this.normalizeUrl(result1.url);
    const url2 = this.normalizeUrl(result2.url);
    // Use Levenshtein for URL similarity score if not exact match
    const urlScore = url1 === url2 ? 1 : this.calculateSimilarity(url1, url2);
    details.url = { 
      score: urlScore, 
      values: [url1, url2] 
    };
    
    // Calculate overall similarity as weighted average (70% URL, 30% Title)
    const weights = {
      title: 0.3, 
      url: 0.7
    };
    
    let overallScore = 0;
    let totalWeight = 0;
    
    for (const [field, { score }] of Object.entries(details)) {
      const weight = weights[field as keyof typeof weights] || 0;
      if (weight > 0 && score !== undefined) { // Check score is calculated
         overallScore += score * weight;
         totalWeight += weight;
      }
    }
    
    return {
      overall: totalWeight > 0 ? overallScore / totalWeight : 0,
      details
    };
  }
  
  /**
   * Merge two duplicate results using the specified strategy
   */
  mergeResults(original: SearchResult, duplicate: SearchResult, strategyName = 'conservative'): SearchResult {
    // Get the merge strategy or use default
    const strategy = this.mergeStrategies[strategyName] || this.mergeStrategies.conservative;
    
    // Start with a copy of the original
    const merged = { ...original };
    
    // Create a provenance record to track where each field came from
    const provenance: Record<string, string> = {};
    provenance.original_provider = original.provider;
    provenance.duplicate_provider = duplicate.provider;
    
    // Apply the merge strategy
    for (const { field, sourcePreference } of strategy.priority) {
      // Skip if the field doesn't exist on either result
      if (!(field in original) && !(field in duplicate)) continue;
      
      // If it's a field to combine and exists in both
      if (strategy.combineFields?.includes(field) && original[field] && duplicate[field]) {
        // Simple concatenation - could be more sophisticated
        merged[field] = `${original[field]} ${duplicate[field]}`;
        provenance[field] = `combined:${original.provider},${duplicate.provider}`;
      } else {
        // Otherwise, use preference order
        let assigned = false;
        
        for (const provider of sourcePreference) {
          if (original.provider === provider && original[field]) {
            merged[field] = original[field];
            provenance[field] = original.provider;
            assigned = true;
            break;
          } else if (duplicate.provider === provider && duplicate[field]) {
            merged[field] = duplicate[field];
            provenance[field] = duplicate.provider;
            assigned = true;
            break;
          }
        }
        
        // If no preferred source had the field, just use any non-null value
        if (!assigned) {
          if (original[field]) {
            merged[field] = original[field];
            provenance[field] = original.provider;
          } else if (duplicate[field]) {
            merged[field] = duplicate[field];
            provenance[field] = duplicate.provider;
          }
        }
      }
    }
    
    // Add provenance metadata
    merged.metadata = {
      ...(merged.metadata || {}),
      mergeProvenance: provenance,
      mergeStrategy: strategy.name,
      mergedAt: new Date().toISOString()
    };
    
    return merged;
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
   * Calculate similarity between two strings (0-1) based on word sets (Jaccard Index)
   * Optimized for speed, less precise for typos than Levenshtein.
   */
  private calculateJaccardSimilarity(a: string, b: string): number {
     if (a === b) return 1;
     if (!a || !b) return 0;

     const setA = new Set(a.toLowerCase().split(/\s+/).filter(word => word.length > 1)); // Ignore single chars
     const setB = new Set(b.toLowerCase().split(/\s+/).filter(word => word.length > 1));

     if (setA.size === 0 || setB.size === 0) return 0;

     const intersection = new Set([...setA].filter(x => setB.has(x)));
     const union = new Set([...setA, ...setB]);

     return intersection.size / union.size;
  }

  /**
   * Calculate similarity between two strings (0-1) - Levenshtein
   * Kept for URL comparisons or potential fallback.
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    const distance = getLevenshteinDistance.get(aLower, bLower);
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
  
  /**
   * Get available merge strategies
   */
  getMergeStrategies(): Record<string, MergeStrategy> {
    return { ...this.mergeStrategies };
  }
  
  /**
   * Add or update a merge strategy
   */
  setMergeStrategy(name: string, strategy: MergeStrategy): void {
    this.mergeStrategies[name] = strategy;
  }

  // --- Helper function to check if domains should be compared ---
  private domainsConsideredSame(domain1: string, domain2: string): boolean {
      if (domain1 === domain2) return true;
      
      // Normalize www
      const d1 = this.options.ignoreWww && domain1.startsWith('www.') ? domain1.substring(4) : domain1;
      const d2 = this.options.ignoreWww && domain2.startsWith('www.') ? domain2.substring(4) : domain2;
      if (d1 === d2) return true;
      
      // Check based on treatSubdomainsAsSame option
      if (this.options.treatSubdomainsAsSame) {
           const mainD1 = d1.split('.').slice(-2).join('.');
           const mainD2 = d2.split('.').slice(-2).join('.');
           return mainD1 === mainD2 && mainD1.length > 0; // Ensure we captured a valid domain part
      }
      
      return false; // Domains are different based on config
  }
} 