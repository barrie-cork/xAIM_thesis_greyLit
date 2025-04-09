import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  SearchService, 
  SearchProviderType, 
  SearchProviderFactory, 
  SerperProvider, 
  SerpApiProvider,
  DEFAULT_SEARCH_CONFIG,
  SearchError,
  SearchErrorType,
  FileType
} from '@/lib/search';

// Properly type the fetch mock
const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch;

describe('SearchService', () => {
  let searchService: SearchService;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    
    // Create a test configuration with mock API keys
    const testConfig = {
      providers: {
        [SearchProviderType.SERPER]: {
          apiKey: 'test-serper-api-key',
          rateLimitOptions: {
            maxTokens: 10,
            refillRate: 10,
            timeWindow: 1000
          }
        },
        [SearchProviderType.SERPAPI]: {
          apiKey: 'test-serpapi-api-key',
          rateLimitOptions: {
            maxTokens: 10,
            refillRate: 10,
            timeWindow: 1000
          }
        }
      },
      defaultProvider: SearchProviderType.SERPER
    };
    
    // Initialize search service with test config
    searchService = new SearchService(testConfig);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('should initialize with available providers', () => {
    // Get available providers
    const providers = searchService.getAvailableProviders();
    
    // Verify both providers are available
    expect(providers).toContain(SearchProviderType.SERPER);
    expect(providers).toContain(SearchProviderType.SERPAPI);
    expect(providers.length).toBe(2);
  });
  
  test('should initialize with a default provider', () => {
    // Create a new service with only one provider
    const singleProviderConfig = {
      providers: {
        [SearchProviderType.SERPAPI]: {
          apiKey: 'test-serpapi-api-key'
        }
      }
    };
    
    const singleProviderService = new SearchService(singleProviderConfig);
    
    // Verify only one provider is available
    const providers = singleProviderService.getAvailableProviders();
    expect(providers).toContain(SearchProviderType.SERPAPI);
    expect(providers.length).toBe(1);
  });
  
  test('should throw error if no providers are available', () => {
    // Create config with no API keys
    const noProvidersConfig = {
      providers: {
        [SearchProviderType.SERPER]: {
          apiKey: ''
        },
        [SearchProviderType.SERPAPI]: {
          apiKey: ''
        }
      }
    };
    
    // Expect initialization to throw error
    expect(() => new SearchService(noProvidersConfig)).toThrow('No search providers are available');
  });
  
  test('should build search query with filters', () => {
    // Test base query
    const baseQuery = 'diabetes treatment';
    const query = SearchService.buildSearchQuery(baseQuery);
    expect(query).toBe(baseQuery);
    
    // Test with domain
    const domainQuery = SearchService.buildSearchQuery(baseQuery, undefined, 'example.com');
    expect(domainQuery).toBe('diabetes treatment site:example.com');
    
    // Test with single file type
    const fileTypeQuery = SearchService.buildSearchQuery(baseQuery, FileType.PDF);
    expect(fileTypeQuery).toBe('diabetes treatment (filetype:pdf)');
    
    // Test with multiple file types
    const multiFileTypeQuery = SearchService.buildSearchQuery(
      baseQuery, 
      [FileType.PDF, FileType.DOC, FileType.DOCX]
    );
    expect(multiFileTypeQuery).toBe(
      'diabetes treatment (filetype:pdf OR filetype:doc OR filetype:docx)'
    );
    
    // Test with domain and file types
    const fullQuery = SearchService.buildSearchQuery(
      baseQuery,
      [FileType.PDF, FileType.DOC],
      'example.com'
    );
    expect(fullQuery).toBe(
      'diabetes treatment site:example.com (filetype:pdf OR filetype:doc)'
    );
  });
  
  test('should execute search with the default provider', async () => {
    // Mock a successful search response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        organic: [
          {
            title: 'Test Result 1',
            link: 'https://example.com/result1',
            snippet: 'Test snippet 1'
          },
          {
            title: 'Test Result 2',
            link: 'https://example.com/result2',
            snippet: 'Test snippet 2'
          }
        ]
      })
    } as Response);
    
    // Execute search
    const results = await searchService.search({
      query: 'test query'
    });
    
    // Verify results
    expect(results).toHaveLength(1);
    expect(results[0].provider).toBe(SearchProviderType.SERPER);
    expect(results[0].results).toHaveLength(2);
    expect(results[0].results[0].title).toBe('Test Result 1');
    expect(results[0].results[1].url).toBe('https://example.com/result2');
    
    // Verify fetch was called with the correct parameters
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].headers['X-API-KEY']).toBe('test-serper-api-key');
    
    // Verify request body
    const body = JSON.parse(fetchCall[1].body);
    expect(body.q).toBe('test query');
  });
  
  test('should execute search with multiple providers', async () => {
    // Mock Serper API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        organic: [
          {
            title: 'Serper Result 1',
            link: 'https://example.com/serper1',
            snippet: 'Serper snippet 1'
          }
        ]
      })
    } as Response);
    
    // Mock SerpApi response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        organic_results: [
          {
            title: 'SerpApi Result 1',
            link: 'https://example.com/serpapi1',
            snippet: 'SerpApi snippet 1'
          }
        ],
        search_metadata: {
          id: 'search-id-123'
        }
      })
    } as Response);
    
    // Execute search with both providers
    const results = await searchService.search({
      query: 'test query',
      providers: [SearchProviderType.SERPER, SearchProviderType.SERPAPI]
    });
    
    // Verify results
    expect(results).toHaveLength(2);
    
    // Verify Serper results
    expect(results[0].provider).toBe(SearchProviderType.SERPER);
    expect(results[0].results).toHaveLength(1);
    expect(results[0].results[0].title).toBe('Serper Result 1');
    
    // Verify SerpApi results
    expect(results[1].provider).toBe(SearchProviderType.SERPAPI);
    expect(results[1].results).toHaveLength(1);
    expect(results[1].results[0].title).toBe('SerpApi Result 1');
    expect(results[1].metadata.searchId).toBe('search-id-123');
    
    // Verify fetch was called for both providers
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
  
  test('should handle errors from search providers', async () => {
    // Mock an error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
      text: async () => 'Invalid API key'
    } as Response);
    
    // Execute search and expect error
    await expect(searchService.search({
      query: 'test query'
    })).rejects.toThrow('Authentication failed for Serper API');
  });
}); 