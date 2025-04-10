import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeduplicationAdapter } from '../deduplication-adapter';
import { SearchResult } from '../../../types';
import { DeduplicationService } from '../../../deduplication';

// Mock the DeduplicationService
vi.mock('../../../deduplication', () => {
  return {
    DeduplicationService: vi.fn().mockImplementation(() => ({
      deduplicate: vi.fn().mockImplementation((results) => {
        // Return a duplicate for the first URL and no duplicates for others
        const uniqueUrls = new Set<string>();
        const uniqueResults: any[] = [];
        const duplicateGroups: Array<{original: any, duplicates: any[]}> = [];
        
        for (const result of results) {
          const normalizedUrl = result.url.toLowerCase().replace(/^https?:\/\//, '');
          
          if (!uniqueUrls.has(normalizedUrl)) {
            uniqueUrls.add(normalizedUrl);
            uniqueResults.push(result);
          } else {
            // Find the original result
            const original = uniqueResults.find(r => 
              r.url.toLowerCase().replace(/^https?:\/\//, '') === normalizedUrl
            );
            
            // Add to duplicate groups
            let group = duplicateGroups.find(g => g.original.url === original.url);
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
      }),
      getOptions: vi.fn().mockReturnValue({
        threshold: 0.85,
        enableUrlNormalization: true,
        enableTitleMatching: true
      }),
      updateOptions: vi.fn()
    }))
  };
});

describe('DeduplicationAdapter', () => {
  let adapter: DeduplicationAdapter;
  let testResults: SearchResult[];

  beforeEach(() => {
    // Create a fresh adapter for each test
    adapter = new DeduplicationAdapter();

    // Create test data with some duplicates
    testResults = [
      {
        title: 'Test Result 1',
        url: 'https://example.com/page1',
        snippet: 'This is the first test result',
        rank: 1,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {}
      },
      {
        title: 'Test Result 2',
        url: 'https://example.com/page2',
        snippet: 'This is the second test result',
        rank: 2,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {}
      },
      {
        title: 'Test Result 1 (Duplicate)',
        url: 'https://example.com/page1',
        snippet: 'This is a duplicate of the first test result',
        rank: 3,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {}
      },
      {
        title: 'Different Title',
        url: 'https://example.com/page3',
        snippet: 'This has a different URL',
        rank: 4,
        searchEngine: 'google',
        timestamp: new Date(),
        metadata: {}
      }
    ];
  });

  it('should be properly initialized with default values', () => {
    expect(adapter.id).toBe('deduplication');
    expect(adapter.name).toBe('Deduplication');
    expect(adapter.description).toContain('duplicate');
    expect(adapter.enabled).toBe(true);
  });

  it('should process a batch of results and remove duplicates', async () => {
    const processedResults = await adapter.processBatch(testResults);
    
    // Should have fewer results than the input
    expect(processedResults.length).toBeLessThan(testResults.length);
    
    // Verify deduplication metadata
    expect(processedResults[0].metadata?.deduplication).toBeDefined();
    expect(processedResults[0].metadata?.deduplication.originalCount).toBe(testResults.length);
    expect(processedResults[0].metadata?.deduplication.duplicatesRemoved).toBeGreaterThan(0);
    expect(processedResults[0].metadata?.deduplication.timestamp).toBeInstanceOf(Date);
  });

  it('should include duplicate groups in metadata when preserveMetadata is true', async () => {
    // Explicitly set preserveMetadata to true
    adapter = new DeduplicationAdapter({}, true);
    
    const processedResults = await adapter.processBatch(testResults);
    
    expect(processedResults[0].metadata?.deduplication.duplicateGroups).toBeDefined();
    expect(Array.isArray(processedResults[0].metadata?.deduplication.duplicateGroups)).toBe(true);
  });

  it('should not include duplicate groups when preserveMetadata is false', async () => {
    // Create adapter with preserveMetadata set to false
    adapter = new DeduplicationAdapter({}, false);
    
    const processedResults = await adapter.processBatch(testResults);
    
    expect(processedResults[0].metadata?.deduplication.duplicateGroups).toBeUndefined();
  });

  it('should pass configuration options to the DeduplicationService', async () => {
    // Create adapter with custom options
    adapter = new DeduplicationAdapter({
      threshold: 0.9,
      enableTitleMatching: false
    });
    
    // Get the deduplication service (private property, access through getConfig)
    const config = adapter.getConfig();
    
    expect(config.threshold).toBe(0.9);
    expect(config.enableTitleMatching).toBe(false);
  });

  it('should process a single result without removing it', async () => {
    const singleResult = testResults[0];
    const processed = await adapter.process(singleResult);
    
    // Should return the same result with added metadata
    expect(processed).toEqual({
      ...singleResult,
      metadata: {
        ...singleResult.metadata,
        deduplication: {
          timestamp: expect.any(Date),
          originalCount: 1,
          uniqueCount: 1,
          duplicatesRemoved: 0
        }
      }
    });
  });

  it('should update configuration correctly', () => {
    // Get the mock instance
    const mockDeduplicationService = (DeduplicationService as any).mock.results[0].value;
    
    // Update config
    adapter.updateConfig({
      threshold: 0.75,
      enableTitleMatching: false,
      preserveMetadata: false
    });
    
    // Check that updateOptions was called with correct parameters
    expect(mockDeduplicationService.updateOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 0.75,
        enableTitleMatching: false
      })
    );
    
    // Check that preserveMetadata was updated
    expect(adapter.getConfig().preserveMetadata).toBe(false);
  });

  it('should handle empty result sets', async () => {
    const processedResults = await adapter.processBatch([]);
    
    expect(processedResults).toEqual([]);
  });

  it('should handle single-item result sets without changes', async () => {
    const singleResult = [testResults[0]];
    const processedResults = await adapter.processBatch(singleResult);
    
    expect(processedResults).toEqual(singleResult);
  });
}); 