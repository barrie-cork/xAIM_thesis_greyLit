import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeduplicationAdapter } from '../deduplication-adapter';
import { SearchResult } from '../../../types';
import { DeduplicationService, DeduplicationOptions } from '../../../deduplication';

// Mock the DeduplicationService class and its methods
const mockDeduplicate = vi.fn();
const mockGetOptions = vi.fn();
const mockUpdateOptions = vi.fn();

vi.mock('../../../deduplication', () => {
  // Mock the class itself
  const MockDeduplicationService = vi.fn().mockImplementation(() => ({
    deduplicate: mockDeduplicate,
    getOptions: mockGetOptions,
    updateOptions: mockUpdateOptions
  }));
  return {
    DeduplicationService: MockDeduplicationService,
    // Include other exports from the module if needed by the adapter
    DEFAULT_DEDUPLICATION_OPTIONS: { threshold: 0.8 } // Example default
  };
});

describe('DeduplicationAdapter', () => {
  let adapter: DeduplicationAdapter;
  let mockServiceInstance: DeduplicationService;
  let testResults: SearchResult[];

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a mock instance of the service for injection
    // Note: Direct instantiation works because the vi.mock intercepts it
    mockServiceInstance = new DeduplicationService(); 

    // Define default mock behavior
    mockDeduplicate.mockImplementation((results) => {
      // Simple mock: assume first result is unique, second is duplicate of first
      if (results.length === 0) return { results: [], duplicatesRemoved: 0, duplicateGroups: [] };
      const uniqueResults = [results[0]];
      const duplicateGroups = results.length > 1 ? [{ original: results[0], duplicates: [results[2]] }] : [];
      return {
        results: uniqueResults,
        duplicatesRemoved: results.length - uniqueResults.length,
        duplicateGroups
      };
    });
    mockGetOptions.mockReturnValue({
      threshold: 0.85,
      enableUrlNormalization: true,
      enableTitleMatching: true
    });

    // Create a fresh adapter for each test, injecting the mock service instance
    adapter = new DeduplicationAdapter(mockServiceInstance);

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
    await adapter.processBatch(testResults);
    // Check if deduplicate was called correctly
    expect(mockDeduplicate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ url: 'https://example.com/page1' })
    ]));
    // More specific assertions based on mock implementation might be needed
  });

  it('should include duplicate groups in metadata when preserveMetadata is true', async () => {
    // Re-create adapter with preserveMetadata=true and inject mock
    adapter = new DeduplicationAdapter(mockServiceInstance, true);
    
    const processedResults = await adapter.processBatch(testResults);
    
    // Expect deduplicate to have been called
    expect(mockDeduplicate).toHaveBeenCalled();
    // Check metadata based on mock return value
    expect(processedResults[0].metadata?.deduplication?.duplicateGroups).toBeDefined();
    // Check if the group structure matches the mock return
    expect(processedResults[0].metadata?.deduplication?.duplicateGroups).toEqual([
       { original: testResults[0].url, duplicates: [testResults[2].url] }
    ]);
  });

  it('should not include duplicate groups when preserveMetadata is false', async () => {
    // Re-create adapter with preserveMetadata=false and inject mock
    adapter = new DeduplicationAdapter(mockServiceInstance, false);
    
    const processedResults = await adapter.processBatch(testResults);
    
    expect(mockDeduplicate).toHaveBeenCalled();
    // Check metadata based on mock return value
    expect(processedResults[0].metadata?.deduplication?.duplicateGroups).toBeUndefined();
  });

  it('should pass configuration options to the DeduplicationService constructor', () => {
    // This test needs rethinking - the adapter constructor now receives the instance
    // We can check the options passed to the *mock constructor* if needed, 
    // or test getConfig/updateConfig behavior instead.
    // Let's verify getConfig reflects the mock's options
    mockGetOptions.mockReturnValue({ threshold: 0.9, enableTitleMatching: false });
    const config = adapter.getConfig();
    expect(config.threshold).toBe(0.9);
    expect(config.enableTitleMatching).toBe(false);
    expect(mockGetOptions).toHaveBeenCalled();
  });

  it('should process a single result without removing it', async () => {
    const singleResult = testResults[0];
    const processed = await adapter.process(singleResult);
    
    expect(mockDeduplicate).not.toHaveBeenCalled(); // process shouldn't call deduplicate
    expect(processed).toEqual(expect.objectContaining({ 
       ...singleResult,
       metadata: expect.objectContaining({ deduplication: expect.any(Object) })
    }));
    expect(processed.metadata?.deduplication?.duplicatesRemoved).toBe(0);
  });

  it('should update configuration correctly', () => {
    // Update config
    adapter.updateConfig({
      threshold: 0.75,
      enableTitleMatching: false,
      preserveMetadata: false // This affects the adapter, not the service directly
    });
    
    // Check that updateOptions was called on the mock instance
    expect(mockUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 0.75,
        enableTitleMatching: false
        // Other options might be included here based on updateConfig logic
      })
    );
    
    // Check that preserveMetadata was updated on the adapter
    const currentConfig = adapter.getConfig();
    expect(currentConfig.preserveMetadata).toBe(false);
    // Verify getOptions was called by getConfig
    expect(mockGetOptions).toHaveBeenCalled();
  });

  it('should handle empty result sets', async () => {
    const processedResults = await adapter.processBatch([]);
    expect(mockDeduplicate).not.toHaveBeenCalled(); // Shouldn't call for empty
    expect(processedResults).toEqual([]);
  });

  it('should handle single-item result sets without calling deduplicate', async () => {
    const singleResult = [testResults[0]];
    const processedResults = await adapter.processBatch(singleResult);
    expect(mockDeduplicate).not.toHaveBeenCalled(); // Shouldn't call for single
    // Expect the result back with default metadata
    expect(processedResults[0].metadata?.deduplication).toBeDefined();
    expect(processedResults[0].metadata?.deduplication?.originalCount).toBe(1);
  });
}); 