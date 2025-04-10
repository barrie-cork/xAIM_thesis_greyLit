import { SearchResult } from '../types';

/**
 * Normalize a URL by removing common variations that don't affect content identity
 * @param url URL to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(url: string): string {
  try {
    // Create URL object for parsing
    const urlObj = new URL(url);
    
    // Convert hostname to lowercase
    const hostname = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix if present
    const cleanHostname = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
    
    // Clean path - remove trailing slash
    let path = urlObj.pathname;
    if (path.endsWith('/') && path !== '/') {
      path = path.slice(0, -1);
    }
    
    // If path is just "/", make it empty for cleaner normalized URLs
    if (path === '/') {
      path = '';
    }
    
    // Normalize path to lowercase in case of case-insensitive servers
    path = path.toLowerCase();
    
    // Remove common tracking parameters and sessions
    const searchParams = new URLSearchParams(urlObj.search);
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'session', '_ga'
    ];
    
    paramsToRemove.forEach(param => {
      if (searchParams.has(param)) {
        searchParams.delete(param);
      }
    });
    
    // Sort remaining params for consistent ordering
    const remainingParams = Array.from(searchParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    // Build search string (if any params remain)
    const search = remainingParams.length > 0 
      ? '?' + new URLSearchParams(remainingParams).toString()
      : '';
    
    // Rebuild normalized URL without protocol (protocol doesn't affect content identity)
    return `${cleanHostname}${path}${search}`;
  } catch (error) {
    // If URL parsing fails, return original but lowercase
    console.warn(`Error normalizing URL ${url}:`, error);
    return url.toLowerCase();
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns Distance value
 */
export function levenshteinDistance(a: string, b: string): number {
  // Create matrix of size (a.length+1) x (b.length+1)
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
  
  // Fill the first row and column
  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[a.length][b.length];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * @param a First string
 * @param b Second string
 * @returns Similarity ratio (1 = identical, 0 = completely different)
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  return 1 - distance / maxLength;
}

/**
 * Interface for deduplication options
 */
export interface DeduplicationOptions {
  /** Similarity threshold for title comparison (0-1, 1 = exact match) */
  titleSimilarityThreshold?: number;
  /** Consider URLs as duplicates even without title similarity */
  strictUrlMatching?: boolean;
  /** List of domains to ignore in deduplication */
  ignoredDomains?: string[];
}

/**
 * Deduplication result with confidence information
 */
export interface DeduplicationResult {
  /** Deduplicated results */
  uniqueResults: SearchResult[];
  /** Duplicate groups (first item is kept, others are removed) */
  duplicateGroups: {
    kept: SearchResult;
    removed: Array<{
      result: SearchResult;
      similarity: number;
      reason: 'url' | 'title' | 'both';
    }>;
  }[];
}

/**
 * Deduplicate search results using URL normalization and fuzzy title matching
 * @param results List of search results to deduplicate
 * @param options Deduplication options
 * @returns Deduplicated results with duplicate groups information
 */
export function deduplicateResults(
  results: SearchResult[],
  options: DeduplicationOptions = {}
): DeduplicationResult {
  // Set default options
  const {
    titleSimilarityThreshold = 0.85,
    strictUrlMatching = false,
    ignoredDomains = []
  } = options;
  
  // Initialize results
  const uniqueResults: SearchResult[] = [];
  const duplicateGroups: DeduplicationResult['duplicateGroups'] = [];
  
  // Track normalized URLs for exact matches
  const normalizedUrls = new Map<string, number>();
  
  // Process each result
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    
    // Check if current domain should be ignored for deduplication
    try {
      const domain = new URL(result.url).hostname;
      const shouldIgnore = ignoredDomains.some(ignoredDomain => domain.includes(ignoredDomain));
      
      if (shouldIgnore) {
        // Add to unique results and skip deduplication for ignored domains
        uniqueResults.push(result);
        // Store the normalized URL to prevent other results from being marked as duplicates of this one
        const normalizedUrl = normalizeUrl(result.url);
        normalizedUrls.set(normalizedUrl, uniqueResults.length - 1);
        continue;
      }
    } catch (e) {
      // If URL parsing fails, continue with deduplication
    }
    
    // Normalize the URL
    const normalizedUrl = normalizeUrl(result.url);
    
    // Check for exact URL match first
    if (normalizedUrls.has(normalizedUrl)) {
      const existingIndex = normalizedUrls.get(normalizedUrl)!;
      const existingResult = uniqueResults[existingIndex];
      
      // Add to duplicate group
      const duplicateGroup = duplicateGroups.find(group => 
        group.kept === existingResult
      );
      
      if (duplicateGroup) {
        duplicateGroup.removed.push({
          result,
          similarity: 1.0, // Exact URL match
          reason: 'url'
        });
      } else {
        duplicateGroups.push({
          kept: existingResult,
          removed: [{
            result,
            similarity: 1.0,
            reason: 'url'
          }]
        });
      }
      
      continue; // Skip this result as it's a duplicate
    }
    
    // If not exact URL match, check for title similarity
    if (!strictUrlMatching) {
      // Find potential duplicate by title similarity
      const potentialDuplicateIndex = uniqueResults.findIndex(existingResult => {
        // Skip comparison if URLs are from completely different domains
        try {
          const existingDomain = new URL(existingResult.url).hostname;
          const currentDomain = new URL(result.url).hostname;
          
          // Check if either domain should be ignored for title-based deduplication
          if (ignoredDomains.some(
              ignoredDomain => 
                existingDomain.includes(ignoredDomain) || 
                currentDomain.includes(ignoredDomain)
            )) {
            return false; // Don't consider as duplicate if either domain is ignored
          }
          
          // If domains are completely different, still check title similarity
          // but with a higher threshold for cross-domain duplicates
          const similarity = calculateSimilarity(
            existingResult.title.toLowerCase(),
            result.title.toLowerCase()
          );
          
          // Use a stricter threshold for cross-domain duplicates
          const threshold = existingDomain === currentDomain
            ? titleSimilarityThreshold
            : titleSimilarityThreshold + 0.1;
          
          return similarity >= threshold;
        } catch (e) {
          // If URL parsing fails, use default threshold
          const similarity = calculateSimilarity(
            existingResult.title.toLowerCase(),
            result.title.toLowerCase()
          );
          
          return similarity >= titleSimilarityThreshold;
        }
      });
      
      if (potentialDuplicateIndex !== -1) {
        const existingResult = uniqueResults[potentialDuplicateIndex];
        const similarity = calculateSimilarity(
          existingResult.title.toLowerCase(),
          result.title.toLowerCase()
        );
        
        // Add to duplicate group
        const duplicateGroup = duplicateGroups.find(group => 
          group.kept === existingResult
        );
        
        if (duplicateGroup) {
          duplicateGroup.removed.push({
            result,
            similarity,
            reason: 'title'
          });
        } else {
          duplicateGroups.push({
            kept: existingResult,
            removed: [{
              result,
              similarity,
              reason: 'title'
            }]
          });
        }
        
        continue; // Skip this result as it's a duplicate
      }
    }
    
    // If we get here, the result is unique
    uniqueResults.push(result);
    normalizedUrls.set(normalizedUrl, uniqueResults.length - 1);
  }
  
  return { uniqueResults, duplicateGroups };
} 