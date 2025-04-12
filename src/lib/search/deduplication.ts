export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  provider: string;
  metadata: Record<string, any>;
}

export class DeduplicationService {
  constructor(private threshold: number = 0.8) {}

  /**
   * Deduplicate search results based on title and URL similarity
   */
  deduplicate(results: SearchResult[]): {
    results: SearchResult[];
    duplicatesRemoved: number;
    duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}>;
  } {
    const uniqueResults: SearchResult[] = [];
    const duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}> = [];
    
    for (const result of results) {
      const duplicate = this.findDuplicate(result, uniqueResults);
      
      if (duplicate) {
        // Find or create a duplicate group
        let group = duplicateGroups.find(g => g.original === duplicate);
        
        if (!group) {
          group = { original: duplicate, duplicates: [] };
          duplicateGroups.push(group);
        }
        
        group.duplicates.push(result);
      } else {
        uniqueResults.push(result);
      }
    }
    
    return {
      results: uniqueResults,
      duplicatesRemoved: results.length - uniqueResults.length,
      duplicateGroups
    };
  }
  
  /**
   * Find a duplicate of the result in the existing results
   */
  private findDuplicate(result: SearchResult, existingResults: SearchResult[]): SearchResult | null {
    for (const existingResult of existingResults) {
      // Simple title similarity check
      if (this.calculateSimilarity(result.title, existingResult.title) > this.threshold) {
        return existingResult;
      }
      
      // URL similarity check (ignoring query parameters)
      const resultUrlBase = this.getUrlBase(result.url);
      const existingUrlBase = this.getUrlBase(existingResult.url);
      
      if (resultUrlBase === existingUrlBase) {
        return existingResult;
      }
    }
    
    return null;
  }
  
  /**
   * Get base URL without query parameters
   */
  private getUrlBase(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
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
} 