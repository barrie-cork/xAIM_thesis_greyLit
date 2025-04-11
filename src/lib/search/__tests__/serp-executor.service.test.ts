import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { SearchProviderFactory, SearchProviderType } from '../factory';
import { SearchProvider } from '../provider';
import { SearchResult, SearchParams, SearchRequest, ProviderResponse, SearchError, SearchErrorType } from '../types';
import { SerpExecutorService } from '../serp-executor.service';

// Mock the factory and providers
vi.mock('../factory', () => ({
    SearchProviderType: {
        SERPER: 'serper',
        SERPAPI: 'serpapi'
    },
    SearchProviderFactory: {
        createAllProviders: vi.fn()
    }
}));

describe('SerpExecutorService', () => {
    let executorService: SerpExecutorService;
    let mockSerperSearch: Mock;
    let mockSerpApiSearch: Mock;
    let mockProviderMap: Map<SearchProviderType, SearchProvider>;

    const mockSerperProvider: SearchProvider = {
        name: SearchProviderType.SERPER,
        isAvailable: () => true,
        search: vi.fn(),
        getRateLimitStatus: () => ({
            available: 50,
            maxTokens: 60,
            isLimited: false,
        }),
    };
    const mockSerpApiProvider: SearchProvider = {
        name: SearchProviderType.SERPAPI,
        isAvailable: () => true,
        search: vi.fn(),
        getRateLimitStatus: () => ({
            available: 90,
            maxTokens: 100,
            isLimited: false,
        }),
    };

    const baseConfig = {
        providers: {
            [SearchProviderType.SERPER]: { apiKey: 'serper_key' },
            [SearchProviderType.SERPAPI]: { apiKey: 'serpapi_key' }
        },
        defaultProvider: SearchProviderType.SERPER
    };

    beforeEach(() => {
        vi.resetAllMocks();

        // Setup mock searches
        mockSerperSearch = mockSerperProvider.search as Mock;
        mockSerpApiSearch = mockSerpApiProvider.search as Mock;

        // Setup mock provider map
        mockProviderMap = new Map();
        mockProviderMap.set(SearchProviderType.SERPER, mockSerperProvider);
        mockProviderMap.set(SearchProviderType.SERPAPI, mockSerpApiProvider);
        vi.mocked(SearchProviderFactory.createAllProviders).mockReturnValue(mockProviderMap);

        executorService = new SerpExecutorService(baseConfig);
    });

    it('should initialize correctly with default provider', () => {
        expect(SearchProviderFactory.createAllProviders).toHaveBeenCalledWith(baseConfig.providers);
        expect(executorService.getAvailableProviders()).toEqual([SearchProviderType.SERPER, SearchProviderType.SERPAPI]);
    });

    it('should use the default provider if none is specified', async () => {
        const mockResponse: ProviderResponse = {
            results: [{ title: 'Serper Result 1', url: 'http://s1.com', snippet: '...', rank: 1 }],
            meta: { searchEngine: 'serper_google' },
            rawResponse: {}
        };
        mockSerperSearch.mockResolvedValue(mockResponse);

        const request: SearchRequest = { query: 'test query' };
        await executorService.execute(request);

        expect(mockSerperSearch).toHaveBeenCalledWith(request);
        expect(mockSerpApiSearch).not.toHaveBeenCalled();
    });

    it('should use the specified provider(s)', async () => {
        const mockResponse: ProviderResponse = {
            results: [{ title: 'SerpApi Result 1', url: 'http://sa1.com', snippet: '...', rank: 1 }],
            meta: { searchEngine: 'serpapi_google' },
            rawResponse: {}
        };
        mockSerpApiSearch.mockResolvedValue(mockResponse);

        const request: SearchRequest = {
            query: 'test query',
            providers: [SearchProviderType.SERPAPI]
        };
        await executorService.execute(request);

        expect(mockSerpApiSearch).toHaveBeenCalledWith(request);
        expect(mockSerperSearch).not.toHaveBeenCalled();
    });

    it('should call multiple providers if specified', async () => {
        const mockSerperResponse: ProviderResponse = {
            results: [{ title: 'Serper Result 1', url: 'http://s1.com', snippet: '...', rank: 1 }],
            meta: { searchEngine: 'serper_google' },
            rawResponse: {}
        };
        const mockSerpApiResponse: ProviderResponse = {
            results: [{ title: 'SerpApi Result 1', url: 'http://sa1.com', snippet: '...', rank: 1 }],
            meta: { searchEngine: 'serpapi_google' },
            rawResponse: {}
        };
        mockSerperSearch.mockResolvedValue(mockSerperResponse);
        mockSerpApiSearch.mockResolvedValue(mockSerpApiResponse);

        const request: SearchRequest = {
            query: 'test query',
            providers: [SearchProviderType.SERPER, SearchProviderType.SERPAPI]
        };
        await executorService.execute(request);

        expect(mockSerperSearch).toHaveBeenCalledWith(request);
        expect(mockSerpApiSearch).toHaveBeenCalledWith(request);
    });

    it('should format provider response into canonical SearchResult', async () => {
        const rawResult = { title: 'Test Title', url: 'http://test.com', snippet: 'Test snippet.', rank: 1, customField: 'abc' };
        const mockResponse: ProviderResponse = {
            results: [rawResult],
            meta: {
                searchEngine: 'serper_test',
                searchId: 's123',
                creditsUsed: 1,
                location: 'US'
            },
            pagination: {
                totalResults: 100
            },
            rawResponse: { original: 'response' }
        };
        mockSerperSearch.mockResolvedValue(mockResponse);

        const request: SearchRequest = { query: 'test' };
        const results = await executorService.execute(request);

        expect(results).toHaveLength(1);
        const formatted = results[0];

        expect(formatted.title).toBe('Test Title');
        expect(formatted.url).toBe('http://test.com');
        expect(formatted.snippet).toBe('Test snippet.');
        expect(formatted.rank).toBe(1);
        expect(formatted.searchEngine).toBe('serper_test');
        expect(formatted.searchId).toBe('s123');
        expect(formatted.creditsUsed).toBe(1);
        expect(formatted.location).toBe('US');
        expect(formatted.totalResults).toBe(100);
        expect(formatted.timestamp).toBeInstanceOf(Date);
        expect(formatted.rawResponse).toEqual(rawResult);
        expect(formatted.id).toBeUndefined(); // ID not set by executor
        expect(formatted.deduped).toBeUndefined(); // Deduped flag not set by executor
    });

    it('should use index as fallback rank if rank is missing', async () => {
         const rawResult = { title: 'No Rank', url: 'http://norank.com', snippet: '...' }; // Missing rank
        const mockResponse: ProviderResponse = {
            results: [rawResult],
            meta: { searchEngine: 'serper_test' },
            rawResponse: {}
        };
        mockSerperSearch.mockResolvedValue(mockResponse);

        const request: SearchRequest = { query: 'test' };
        const results = await executorService.execute(request);

        expect(results).toHaveLength(1);
        expect(results[0].rank).toBe(1); // Rank defaults to index + 1
    });

    it('should throw an error if no valid providers are specified or available', async () => {
        const request: SearchRequest = {
            query: 'test query',
            providers: ['invalid-provider' as SearchProviderType] // Cast to bypass TS check
        };

        await expect(executorService.execute(request)).rejects.toThrow(
            new SearchError(
                'No valid search providers specified for execution',
                SearchErrorType.PROVIDER_UNAVAILABLE
            )
        );
    });

    it('should handle provider search errors gracefully', async () => {
        const error = new Error('Provider API failed');
        mockSerperSearch.mockRejectedValue(error);

        const request: SearchRequest = { query: 'fail query' };

        // Expect the execute method to re-throw the error
        await expect(executorService.execute(request)).rejects.toThrow('Provider API failed');
    });
}); 