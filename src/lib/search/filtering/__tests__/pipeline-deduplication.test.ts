import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResultPipeline } from '../result-pipeline';
import { SearchResult } from '../../types';
import { DeduplicationService } from '../../deduplication';

/**
 * Integration test for the ResultPipeline's deduplication functionality
 */
describe('Result Pipeline Deduplication Integration', () => {
  let pipeline: ResultPipeline;
  let deduplicationService: DeduplicationService;
  let testResults: SearchResult[];

  beforeEach(() => {
    // Create a new pipeline for each test
    pipeline = new ResultPipeline();

    // Create a DeduplicationService instance
    deduplicationService = new DeduplicationService({
      threshold: 0.85,
      enableUrlNormalization: true,
      enableTitleMatching: true
    });

    // Create test results with some duplicates
    testResults = [
      {
        title: 'Test Result 1',
        url: 'https://example.com/page1',
        snippet: 'This is the first test result',
        rank: 1,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {},
        position: 1,
        provider: 'google'
      },
      {
        title: 'Test Result 2',
        url: 'https://example.com/page2',
        snippet: 'This is the second test result',
        rank: 2,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {},
        position: 2,
        provider: 'google'
      },
      {
        title: 'Test Result 1', // Duplicate title
        url: 'https://example.com/page1-copy',
        snippet: 'This is a duplicate of the first test result',
        rank: 3,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {},
        position: 3,
        provider: 'google'
      },
      {
        title: 'Different Title',
        url: 'https://example.com/page1', // Duplicate URL (normalized)
        snippet: 'This has the same URL as the first result but different title',
        rank: 4,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {},
        position: 4,
        provider: 'google'
      }
    ];

    // Mock the deduplication method
    vi.spyOn(deduplicationService, 'deduplicate').mockImplementation((results) => {
      // Simple mock implementation that removes URL duplicates
      const uniqueUrls = new Set<string>();
      const uniqueResults: SearchResult[] = [];
      const duplicateGroups: Array<{original: SearchResult, duplicates: SearchResult[]}> = [];
      
      for (const result of results) {
        const normalizedUrl = result.url.toLowerCase().replace(/^https?:\/\//, '');
        
        if (!uniqueUrls.has(normalizedUrl)) {
          uniqueUrls.add(normalizedUrl);
          uniqueResults.push(result);
        } else {
          // Find the original result
          const original = uniqueResults.find(r => 
            r.url.toLowerCase().replace(/^https?:\/\//, '') === normalizedUrl
          )!;
          
          // Add to duplicate groups
          let group = duplicateGroups.find(g => g.original === original);
          if (!group) {
            group = { original, duplicates: [] };
            duplicateGroups.push(group);
          }
          
          group.duplicates.push(result);
        }
      }
      
      return {
        results: uniqueResults,
        duplicatesRemoved: results.length - uniqueResults.length,
        duplicateGroups
      };
    });
  });

  it('should integrate with DeduplicationService to remove duplicates', async () => {
    // Create a class to adapt DeduplicationService to the EnrichmentModule interface
    class DeduplicationAdapter {
      id = 'deduplication';
      name = 'Deduplication';
      description = 'Removes duplicate search results';
      enabled = true;
      
      constructor(private deduplicationService: DeduplicationService) {}
      
      async processBatch(results: SearchResult[]): Promise<SearchResult[]> {
        const deduplicationResult = this.deduplicationService.deduplicate(results);
        return deduplicationResult.results;
      }
      
      async process(result: SearchResult): Promise<SearchResult> {
        // Single-result deduplication doesn't make sense, so just return the result
        return result;
      }
      
      getConfig(): Record<string, any> {
        return this.deduplicationService.getOptions();
      }
      
      updateConfig(config: Record<string, any>): void {
        this.deduplicationService.updateOptions(config);
      }
    }
    
    // Register the deduplication adapter as an enrichment module
    const deduplicationAdapter = new DeduplicationAdapter(deduplicationService);
    pipeline.registerEnrichmentModule(deduplicationAdapter);
    
    // Process results through the pipeline
    const result = await pipeline.process(testResults);
    
    // Verify that deduplication service was called
    expect(deduplicationService.deduplicate).toHaveBeenCalledWith(testResults);
    
    // Verify that duplicates were removed
    expect(result.results.length).toBeLessThan(testResults.length);
    
    // Check for unique URLs in the results
    const uniqueUrls = new Set(result.results.map(r => r.url.toLowerCase().replace(/^https?:\/\//, '')));
    expect(uniqueUrls.size).toBe(result.results.length);
    
    // Verify that metrics were captured
    expect(result.enrichedCount).toBeGreaterThan(0);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  it('should allow configuration of the deduplication module', async () => {
    // Create a more configurable adapter
    class ConfigurableDeduplicationAdapter {
      id = 'deduplication';
      name = 'Deduplication';
      description = 'Removes duplicate search results';
      enabled = true;
      
      constructor(
        private deduplicationService: DeduplicationService,
        private config: {
          titleSimilarityThreshold: number;
          enableUrlNormalization: boolean;
          enableTitleMatching: boolean;
        } = {
          titleSimilarityThreshold: 0.85,
          enableUrlNormalization: true,
          enableTitleMatching: true
        }
      ) {}
      
      async processBatch(results: SearchResult[]): Promise<SearchResult[]> {
        // Update service with current config
        this.deduplicationService.updateOptions(this.config);
        
        const deduplicationResult = this.deduplicationService.deduplicate(results);
        
        // Add deduplication metadata to each result
        return deduplicationResult.results.map(result => ({
          ...result,
          metadata: {
            ...result.metadata,
            deduplication: {
              originalCount: results.length,
              uniqueCount: deduplicationResult.results.length,
              duplicatesRemoved: deduplicationResult.duplicatesRemoved
            }
          }
        }));
      }
      
      async process(result: SearchResult): Promise<SearchResult> {
        return result;
      }
      
      getConfig(): Record<string, any> {
        return this.config;
      }
      
      updateConfig(config: Record<string, any>): void {
        this.config = { ...this.config, ...config };
      }
    }
    
    // Create adapter with custom config
    const adapter = new ConfigurableDeduplicationAdapter(deduplicationService, {
      titleSimilarityThreshold: 0.9, // Higher threshold
      enableUrlNormalization: true,
      enableTitleMatching: false // Disable title matching
    });
    
    // Register the adapter
    pipeline.registerEnrichmentModule(adapter);
    
    // Process results
    const result = await pipeline.process(testResults);
    
    // Verify configuration was used
    expect(deduplicationService.deduplicate).toHaveBeenCalled();
    expect(adapter.getConfig().titleSimilarityThreshold).toBe(0.9);
    expect(adapter.getConfig().enableTitleMatching).toBe(false);
    
    // Verify metadata was added to results
    expect(result.results[0].metadata?.deduplication).toBeDefined();
    expect(result.results[0].metadata?.deduplication.originalCount).toBe(testResults.length);
  });
}); 