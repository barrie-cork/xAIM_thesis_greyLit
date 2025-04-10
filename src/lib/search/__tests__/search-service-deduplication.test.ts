import { SearchProviderType, SearchProviderFactory } from '../factory';
import { SearchService } from '../search-service';
import { SearchResult } from '../types';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';

// Mock the provider factory
vi.mock('../factory', () => ({
  SearchProviderType: {
    SERPER: 'serper',
    SERPAPI: 'serpapi'
  },
  SearchProviderFactory: {
    createAllProviders: vi.fn()
  }
}));

describe('SearchService with Deduplication', () => {
  let searchService: SearchService;
  let mockSearchFn: Mock;

  beforeEach(() => {
    // Reset mocks and create a fresh service instance
    vi.resetAllMocks();
    
    // Setup the mock provider and its search function
    mockSearchFn = vi.fn();
    const mockProvider = { search: mockSearchFn };
    const mockMap = new Map();
    mockMap.set(SearchProviderType.SERPER, mockProvider);
    vi.mocked(SearchProviderFactory.createAllProviders).mockReturnValue(mockMap);

    searchService = new SearchService({
      providers: {},
      defaultProvider: SearchProviderType.SERPER
    });
  });

  // Helper to set the mock provider response for a test
  const setMockResponse = (mockResults: any[]) => {
    mockSearchFn.mockResolvedValueOnce({
      results: mockResults,
      meta: { searchEngine: 'mock-engine', creditsUsed: 1 },
      rawResponse: {}
    });
  };

  // Helper to create a basic result object
  const createMockResult = (title: string, url: string, snippet: string = '...') => ({
    title, url, snippet
  });

  // --- Basic Tests --- 
  it('deduplication is enabled by default', async () => {
    setMockResponse([
        createMockResult('Result 1', 'https://example.com/page1'),
        createMockResult('Result 1', 'https://different-domain.com/page1'), // Title duplicate
        createMockResult('Different Title', 'https://example.com/page1'), // URL duplicate
        createMockResult('Unique Result', 'https://example.com/page2')
    ]);
    const results = await searchService.search({ query: 'test query' });
    expect(results[0].results.length).toBe(2); // Keeps Original, Unique
    expect(results[0].metadata.deduplication?.enabled).toBe(true);
    expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(2);
  });
  
  it('deduplication can be disabled per-request', async () => {
     setMockResponse([
        createMockResult('Result 1', 'https://example.com/page1'),
        createMockResult('Result 1', 'https://different-domain.com/page1'),
        createMockResult('Different Title', 'https://example.com/page1'),
        createMockResult('Unique Result', 'https://example.com/page2')
    ]);
    const results = await searchService.search({ query: 'test query', deduplication: false });
    expect(results[0].results.length).toBe(4);
    expect(results[0].metadata.deduplication?.enabled).toBe(false);
    expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(0);
  });
  
  it('custom deduplication options work per-request (enableTitleMatching)', async () => {
    setMockResponse([
        createMockResult('Similar Title', 'https://site1.com/page'),
        createMockResult('Similar Titlé', 'https://site2.com/page') 
    ]);
    const defaultResults = await searchService.search({ query: 'test query' });
    expect(defaultResults[0].results.length).toBe(1);
    
    setMockResponse([
        createMockResult('Similar Title', 'https://site1.com/page'),
        createMockResult('Similar Titlé', 'https://site2.com/page') 
    ]);
    const strictResults = await searchService.search({ 
      query: 'test query',
      deduplication: { enableTitleMatching: false } 
    });
    expect(strictResults[0].results.length).toBe(2);
    expect(strictResults[0].metadata.deduplication?.duplicatesRemoved).toBe(0);
  });
  
  // --- Edge Case Tests --- 
  describe('Edge Cases', () => {
    it('should NOT deduplicate very similar titles with different URLs/content (high threshold)', async () => {
      setMockResponse([
        createMockResult('The Quick Brown Fox Jumps Over', 'https://site1.com/fox'),
        createMockResult('The Quick Brown Fox Jumped Over', 'https://site2.com/fox')
      ]);
      const results = await searchService.search({ query: 'fox jump' }); 
      expect(results[0].results.length).toBe(2);
      expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(0);
    });

    it('SHOULD deduplicate very similar titles with different URLs when threshold is lowered', async () => {
      setMockResponse([
        createMockResult('The Quick Brown Fox Jumps Over', 'https://site1.com/fox'),
        createMockResult('The Quick Brown Fox Jumped Over', 'https://site2.com/fox')
      ]);
      const results = await searchService.search({ 
          query: 'fox jump',
          deduplication: { threshold: 0.5 } 
      }); 
      expect(results[0].results.length).toBe(1);
      expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

    it('should deduplicate identical titles with slightly different URLs (normalization handles some)', async () => {
      setMockResponse([
        createMockResult('Same Title', 'http://example.com/page'),
        createMockResult('Same Title', 'https://www.example.com/page/')
      ]);
      const results = await searchService.search({ query: 'same title' });
      expect(results[0].results.length).toBe(1);
      expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

    it('should deduplicate identical titles with different query params (if ignoreQueryParams=true)', async () => {
      setMockResponse([
        createMockResult('Same Title', 'https://example.com/page?a=1&b=2'),
        createMockResult('Same Title', 'https://example.com/page?b=2&a=1&utm_source=test')
      ]);
      const results = await searchService.search({ query: 'same title' }); // Default ignoreQueryParams=true
      expect(results[0].results.length).toBe(1);
      expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

    it('should deduplicate identical titles with different query params even if ignoreQueryParams=false (by title)', async () => {
      setMockResponse([
        createMockResult('Same Title', 'https://example.com/page?a=1'),
        createMockResult('Same Title', 'https://example.com/page?a=2')
      ]);
      const results = await searchService.search({ 
          query: 'same title',
          deduplication: { ignoreQueryParams: false } 
      }); 
      expect(results[0].results.length).toBe(1); 
      expect(results[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

    it('should deduplicate www/non-www based on default ignoreWww=true', async () => {
      setMockResponse([
        createMockResult('Same Title', 'https://example.com/path'),
        createMockResult('Same Title', 'https://www.example.com/path')
      ]);
      const resultsDefault = await searchService.search({ query: 'www test' });
      expect(resultsDefault[0].results.length).toBe(1);
      expect(resultsDefault[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

    it('should deduplicate www/non-www even if ignoreWww=false (by title)', async () => {
       setMockResponse([
        createMockResult('Same Title', 'https://example.com/path'),
        createMockResult('Same Title', 'https://www.example.com/path')
      ]);
      const resultsNoIgnore = await searchService.search({ 
          query: 'www test',
          deduplication: { ignoreWww: false } 
      });
      expect(resultsNoIgnore[0].results.length).toBe(1); 
      expect(resultsNoIgnore[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

    it('should NOT deduplicate subdomains if treatSubdomainsAsSame=false (default)', async () => {
      setMockResponse([
        createMockResult('Same Title', 'https://sub1.example.com/path'),
        createMockResult('Same Title', 'https://sub2.example.com/path')
      ]);
      const resultsDefault = await searchService.search({ query: 'subdomain test' });
      expect(resultsDefault[0].results.length).toBe(2); 
      expect(resultsDefault[0].metadata.deduplication?.duplicatesRemoved).toBe(0); 
    });

    it('should deduplicate subdomains if treatSubdomainsAsSame=true (by title)', async () => {
       setMockResponse([
        createMockResult('Same Title', 'https://sub1.example.com/path'),
        createMockResult('Same Title', 'https://sub2.example.com/path')
      ]);
      const resultsTreatSame = await searchService.search({ 
          query: 'subdomain test',
          deduplication: { treatSubdomainsAsSame: true } 
      });
      expect(resultsTreatSame[0].results.length).toBe(1); 
      expect(resultsTreatSame[0].metadata.deduplication?.duplicatesRemoved).toBe(1);
    });

  });
}); 