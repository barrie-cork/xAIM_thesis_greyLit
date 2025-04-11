import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
// Import necessary types and the service directly
import { SearchResult } from '../types';
import { DeduplicationService, DEFAULT_DEDUPLICATION_OPTIONS, DuplicateLog, DeduplicationOptions } from '../deduplication';

// Remove mocks for SearchService and Factory
// vi.mock('../factory', ...);

describe('DeduplicationService', () => {
  let deduplicationService: DeduplicationService;

  beforeEach(() => {
    // Initialize the service directly, potentially with default options
    // Specific tests can override options or create new instances
    deduplicationService = new DeduplicationService(DEFAULT_DEDUPLICATION_OPTIONS);
    // Clear any potential logs from previous tests if service instance is reused
    // (Or ensure each test gets a fresh instance)
    deduplicationService.getLogs(); // Assuming this clears internal logs, adjust if needed
  });

  // Helper to create a canonical result object
  const createMockResult = (title: string, url: string, snippet: string = '...', rank?: number, searchEngine: string = 'mockEngine'): SearchResult => ({
    title,
    url,
    snippet,
    searchEngine,
    timestamp: new Date(),
    rank: rank !== undefined ? rank : 0, // Ensure rank is defined or default
    // Add other canonical fields if needed for testing specific logic
  });

  // --- Basic Tests --- 
  // Refactor existing tests to call deduplicationService.deduplicate directly
  it('should remove exact URL duplicates (normalized)', () => {
    const results = [
        createMockResult('Result 1', 'https://example.com/page1'),
        createMockResult('Result 1 Title Diff', 'http://www.example.com/page1/'), // URL duplicate (normalized)
        createMockResult('Unique Result', 'https://example.com/page2')
    ];
    const { results: uniqueResults, duplicatesRemoved } = deduplicationService.deduplicate(results);
    expect(uniqueResults).toHaveLength(2); 
    expect(duplicatesRemoved).toBe(1);
    // Check that the first and third results are kept
    expect(uniqueResults.map(r => r.url)).toEqual(['https://example.com/page1', 'https://example.com/page2']);
  });
  
  it('should remove title duplicates if domains match (default threshold)', () => {
     const results = [
        createMockResult('Result Title Match', 'https://site1.com/pageA'),
        createMockResult('Result Title Match', 'https://site2.com/pageB'), // Different domain, should keep
        createMockResult('Result Title Match', 'https://www.site1.com/pageC'), // Same domain (ignore www), should remove
        createMockResult('Unique Title', 'https://site1.com/pageD')
    ];
    const { results: uniqueResults, duplicatesRemoved } = deduplicationService.deduplicate(results);
    expect(duplicatesRemoved).toBe(1);
    expect(uniqueResults).toHaveLength(3);
    expect(uniqueResults.map(r => r.url)).toEqual(['https://site1.com/pageA', 'https://site2.com/pageB', 'https://site1.com/pageD']);
  });
  
  it('should NOT remove title duplicates if title matching is disabled', () => {
    const serviceWithOptions = new DeduplicationService({ ...DEFAULT_DEDUPLICATION_OPTIONS, enableTitleMatching: false });
    const results = [
        createMockResult('Same Title', 'https://site1.com/pageA'),
        createMockResult('Same Title', 'https://site1.com/pageB') 
    ];
    const { results: uniqueResults, duplicatesRemoved } = serviceWithOptions.deduplicate(results);
    expect(duplicatesRemoved).toBe(0);
    expect(uniqueResults).toHaveLength(2);
  });
  
  // --- Edge Case Tests --- 
  // Refactor describe block
  describe('Edge Cases & Options', () => {
    // Refactor existing tests similarly...
    
    it('should NOT deduplicate very similar titles with different URLs/domains (default threshold)', () => {
      const results = [
        createMockResult('The Quick Brown Fox Jumps Over', 'https://site1.com/fox'),
        createMockResult('The Quick Brown Fox Jumped Over', 'https://site2.com/fox') // Different domain
      ];
      const { results: uniqueResults, duplicatesRemoved } = deduplicationService.deduplicate(results); 
      expect(uniqueResults.length).toBe(2);
      expect(duplicatesRemoved).toBe(0);
    });

    it('SHOULD deduplicate very similar titles on SAME domain when threshold is lowered', () => {
        const serviceWithLowThreshold = new DeduplicationService({ ...DEFAULT_DEDUPLICATION_OPTIONS, threshold: 0.5 });
        const results = [
            createMockResult('The Quick Brown Fox Jumps Over', 'https://site1.com/fox1'),
            createMockResult('The Quick Brown Fox Jumped Over', 'https://site1.com/fox2') // Same domain
        ];
        const { results: uniqueResults, duplicatesRemoved } = serviceWithLowThreshold.deduplicate(results); 
        expect(uniqueResults.length).toBe(1);
        expect(duplicatesRemoved).toBe(1);
    });

    // Add more tests adapting the logic from the old file...
     it('should handle ignoreQueryParams option', () => {
        const serviceNoIgnore = new DeduplicationService({ ...DEFAULT_DEDUPLICATION_OPTIONS, ignoreQueryParams: false });
        const results = [
            createMockResult('Same Title', 'https://example.com/page?a=1'),
            createMockResult('Same Title', 'https://example.com/page?a=2')
        ];
        // Default service ignores query params (URL match)
        const { duplicatesRemoved: removedDefault } = deduplicationService.deduplicate(results);
        expect(removedDefault).toBe(1);
        
        // Service with ignoreQueryParams=false should NOT find URL match, relies on title match
        const { duplicatesRemoved: removedNoIgnore } = serviceNoIgnore.deduplicate(results);
        expect(removedNoIgnore).toBe(1); // Still removed due to title match on same domain
        
         // Test disabling title matching as well
        const serviceStrict = new DeduplicationService({ ...DEFAULT_DEDUPLICATION_OPTIONS, ignoreQueryParams: false, enableTitleMatching: false });
        const { duplicatesRemoved: removedStrict } = serviceStrict.deduplicate(results);
        expect(removedStrict).toBe(0); // Should not be removed now
    });
    
    // ... Add tests for other options like ignoreWww, treatSubdomainsAsSame etc. ...

  });
}); 