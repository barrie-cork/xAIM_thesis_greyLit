import { SearchResult, RawSearchResult, SearchResultStatus } from '@prisma/client';
import { StorageService } from './storage-service';
import { calculateSimilarity, normalizeUrl } from '../utils/deduplication';

/**
 * Options for deduplication process
 */
export interface DeduplicationOptions {
  titleSimilarityThreshold?: number;
  strictUrlMatching?: boolean;
  ignoredDomains?: string[];
}

/**
 * Service responsible for processing raw results and identifying duplicates
 */
export class DeduplicationService {
  private storageService: StorageService;
  private defaultOptions: DeduplicationOptions;

  constructor(storageService: StorageService, options?: DeduplicationOptions) {
    this.storageService = storageService;
    this.defaultOptions = {
      titleSimilarityThreshold: 0.85,
      strictUrlMatching: false,
      ignoredDomains: [],
      ...options
    };
  }

  /**
   * Process raw search results for a search request
   * @param searchRequestId The ID of the search request
   * @param options Deduplication options
   * @returns Statistics about the processing
   */
  async processRawResults(
    searchRequestId: string,
    options?: DeduplicationOptions
  ): Promise<{
    totalProcessed: number;
    uniqueResults: number;
    duplicatesFound: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    // Merge options with defaults
    const dedupOptions = { ...this.defaultOptions, ...options };
    
    // Get raw results from storage
    const rawResults = await this.storageService.getRawResults(searchRequestId);
    
    if (rawResults.length === 0) {
      return {
        totalProcessed: 0,
        uniqueResults: 0,
        duplicatesFound: 0,
        processingTime: Date.now() - startTime
      };
    }

    // Convert raw results to processed results
    const processedResults = this.convertRawToProcessed(rawResults);
    
    // Save processed results
    const savedResults = await this.storageService.saveProcessedResults(
      searchRequestId,
      processedResults
    );
    
    // Identify duplicates
    const duplicateGroups = await this.identifyDuplicates(
      savedResults,
      dedupOptions
    );
    
    // Track total duplicates found
    let totalDuplicatesFound = 0;
    
    // Process each duplicate group
    for (const group of duplicateGroups) {
      const originalId = group.originalId;
      const duplicateIds = group.duplicateIds;
      
      // Mark duplicates in storage
      await this.storageService.markDuplicates(
        originalId,
        duplicateIds,
        group.confidenceScores
      );
      
      totalDuplicatesFound += duplicateIds.length;
    }
    
    return {
      totalProcessed: rawResults.length,
      uniqueResults: savedResults.length - totalDuplicatesFound,
      duplicatesFound: totalDuplicatesFound,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Convert raw search results to processed search results
   * @param rawResults The raw search results
   * @returns The processed search results
   */
  private convertRawToProcessed(rawResults: RawSearchResult[]): Array<{
    title: string;
    url: string;
    snippet?: string;
    searchEngine?: string;
    rawResponse?: any;
    status: SearchResultStatus;
  }> {
    return rawResults.map((raw, index) => {
      // Extract snippet from metadata if available
      const snippet = raw.metadata && typeof raw.metadata === 'object' && 'snippet' in raw.metadata
        ? String(raw.metadata.snippet)
        : undefined;
      
      return {
        title: raw.title,
        url: raw.url,
        snippet,
        searchEngine: raw.source,
        rawResponse: raw.metadata,
        status: SearchResultStatus.processed,
        // Add rank based on original position
        rank: index + 1
      };
    });
  }

  /**
   * Identify duplicates among processed search results
   * @param results The processed search results
   * @param options Deduplication options
   * @returns Groups of duplicates
   */
  private async identifyDuplicates(
    results: SearchResult[],
    options: DeduplicationOptions
  ): Promise<Array<{
    originalId: string;
    duplicateIds: string[];
    confidenceScores: number[];
  }>> {
    const {
      titleSimilarityThreshold = 0.85,
      strictUrlMatching = false,
      ignoredDomains = []
    } = options;
    
    const duplicateGroups: Array<{
      originalId: string;
      duplicateIds: string[];
      confidenceScores: number[];
    }> = [];
    
    // Track normalized URLs for exact matches
    const normalizedUrls = new Map<string, string>();
    
    // Track which results have been marked as duplicates
    const isDuplicate = new Set<string>();
    
    // First pass: Find exact URL duplicates
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      // Skip if no URL
      if (!result.url) continue;
      
      // Check if current domain should be ignored for deduplication
      try {
        const domain = new URL(result.url).hostname;
        if (ignoredDomains.some(ignoredDomain => domain.includes(ignoredDomain))) {
          continue; // Skip deduplication for ignored domains
        }
      } catch (e) {
        // If URL parsing fails, continue with deduplication
      }
      
      // Normalize the URL
      const normalizedUrl = normalizeUrl(result.url);
      
      // Check for exact URL match
      if (normalizedUrls.has(normalizedUrl)) {
        const originalId = normalizedUrls.get(normalizedUrl)!;
        
        // Find or create a duplicate group
        let group = duplicateGroups.find(g => g.originalId === originalId);
        
        if (!group) {
          group = { 
            originalId, 
            duplicateIds: [], 
            confidenceScores: [] 
          };
          duplicateGroups.push(group);
        }
        
        // Add to duplicate group
        group.duplicateIds.push(result.id);
        group.confidenceScores.push(1.0); // Exact URL match
        
        // Mark as duplicate
        isDuplicate.add(result.id);
      } else {
        // Only register as original if not already marked as duplicate
        if (!isDuplicate.has(result.id)) {
          normalizedUrls.set(normalizedUrl, result.id);
        }
      }
    }
    
    // Second pass: Find title similarity duplicates (if not using strict URL matching)
    if (!strictUrlMatching) {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        
        // Skip if already marked as duplicate or no title
        if (isDuplicate.has(result.id) || !result.title) continue;
        
        // Check if current domain should be ignored for deduplication
        if (result.url) {
          try {
            const domain = new URL(result.url).hostname;
            if (ignoredDomains.some(ignoredDomain => domain.includes(ignoredDomain))) {
              continue; // Skip deduplication for ignored domains
            }
          } catch (e) {
            // If URL parsing fails, continue with deduplication
          }
        }
        
        for (let j = i + 1; j < results.length; j++) {
          const otherResult = results[j];
          
          // Skip if already marked as duplicate or no title
          if (isDuplicate.has(otherResult.id) || !otherResult.title) continue;
          
          // Calculate title similarity
          const similarity = calculateSimilarity(
            result.title.toLowerCase(),
            otherResult.title.toLowerCase()
          );
          
          // Check if similarity exceeds threshold
          if (similarity >= titleSimilarityThreshold) {
            // Create a new duplicate group
            const group = { 
              originalId: result.id, 
              duplicateIds: [otherResult.id], 
              confidenceScores: [similarity] 
            };
            
            duplicateGroups.push(group);
            
            // Mark as duplicate
            isDuplicate.add(otherResult.id);
          }
        }
      }
    }
    
    return duplicateGroups;
  }
}
