import { SearchProviderFactory, SearchProviderType } from './factory';
import { SearchProvider } from './provider';
import { SearchResult, SearchParams, ProviderResponse, SearchError, SearchErrorType, SearchRequest } from './types';

// TODO: Define a more specific config type if needed, separate from the old service
interface ExecutorConfig {
    providers: {
        [key in SearchProviderType]?: any;
    };
    defaultProvider?: SearchProviderType;
    // Add other config fields relevant ONLY to execution (e.g., global rate limits?)
}

/**
 * Service responsible solely for executing searches via providers
 * and normalizing the results into the canonical SearchResult format.
 */
export class SerpExecutorService {
    private providers: Map<SearchProviderType, SearchProvider>;
    private defaultProvider: SearchProviderType;

    constructor(config: ExecutorConfig) { // Use simplified config type
        // Logic moved from SearchService constructor: Initialize providers & defaultProvider
        this.providers = SearchProviderFactory.createAllProviders(config.providers);
        
        if (this.providers.size === 0) {
            throw new Error('No search providers are available. Check configuration and API keys.');
        }

        if (config.defaultProvider && this.providers.has(config.defaultProvider)) {
            this.defaultProvider = config.defaultProvider;
        } else {
            this.defaultProvider = this.providers.has(SearchProviderType.SERPER)
                ? SearchProviderType.SERPER
                : Array.from(this.providers.keys())[0];
        }
        // Rate limiting logic might also be initialized here if it was part of SearchService
    }

    /**
     * Executes searches using the specified or default providers.
     *
     * @param request Search parameters including query and optional provider list.
     * @returns A promise resolving to an array of canonical SearchResult objects.
     */
    async execute(request: SearchRequest): Promise<SearchResult[]> {
        // Logic moved/adapted from SearchService.search (excluding cache check)
        const providerTypes = request.providers && request.providers.length > 0
            // Add explicit type for filter parameter
            ? request.providers.filter((type: SearchProviderType) => this.providers.has(type))
            : [this.defaultProvider];

        if (providerTypes.length === 0) {
            throw new SearchError(
                'No valid search providers specified for execution',
                SearchErrorType.PROVIDER_UNAVAILABLE
            );
        }

        // Execute searches in parallel
        // Add explicit type for map parameter
        const searchPromises = providerTypes.map((type: SearchProviderType) =>
            this.executeWithProvider(type, request)
        );

        // Wait for all provider searches to complete and flatten results
        const resultsArrays = await Promise.all(searchPromises);
        return resultsArrays.flat();
    }

    /**
     * Executes a search with a single specific provider.
     *
     * @param providerType The provider to use.
     * @param params The search parameters.
     * @returns A promise resolving to an array of canonical SearchResult objects from this provider.
     */
    private async executeWithProvider(
        providerType: SearchProviderType,
        params: SearchParams // Use base SearchParams, executor doesn't need deduplication/cache flags
    ): Promise<SearchResult[]> {
        // Logic moved/adapted from SearchService.searchWithProvider (excluding deduplication)
        const provider = this.providers.get(providerType);

        if (!provider) {
            throw new SearchError(
                `Provider ${providerType} is not available for execution`,
                SearchErrorType.PROVIDER_UNAVAILABLE,
                providerType
            );
        }

        // Execute the search via the provider
        const response: ProviderResponse = await provider.search(params);

        // Format into canonical SearchResult
        return this.formatProviderResponse(response, providerType);
    }

    /**
     * Formats the raw provider response into the canonical SearchResult array.
     *
     * @param response The raw response from the SearchProvider.
     * @param providerType The type of provider that generated the response.
     * @returns An array of canonical SearchResult objects.
     */
    private formatProviderResponse(
        response: ProviderResponse,
        providerType: SearchProviderType
    ): SearchResult[] {
        // Logic moved from SearchService.formatResponse, mapping directly to canonical SearchResult
        const timestamp = new Date();
        const searchEngineName = response.meta?.searchEngine || providerType;

        return response.results.map((result: any, index: number): SearchResult => ({
            title: result.title || '',
            url: result.url || '',
            snippet: result.snippet || '',
            rank: result.rank !== undefined ? result.rank : index + 1, // Use index as fallback rank
            resultType: result.resultType || 'organic',
            searchEngine: searchEngineName,
            // Map other relevant fields directly from provider response if available
            device: response.meta?.device, // Example: Assuming device might be in meta
            location: response.meta?.location, // Example
            language: response.meta?.language, // Example
            totalResults: response.pagination?.totalResults, // From pagination if available
            creditsUsed: response.meta?.creditsUsed, // From meta
            searchId: response.meta?.searchId, // From meta
            searchUrl: response.meta?.searchUrl, // From meta
            relatedSearches: response.meta?.relatedSearches, // From meta
            similarQuestions: response.meta?.similarQuestions, // From meta
            timestamp,
            rawResponse: result // Store the original result object
            // id and deduped fields are not set here
        }));
    }

    // Add other methods moved from SearchService if relevant ONLY to execution
    // e.g., getAvailableProviders(), getProvider()

    getAvailableProviders(): SearchProviderType[] {
        return Array.from(this.providers.keys());
    }

    getProvider(type: SearchProviderType): SearchProvider | undefined {
        return this.providers.get(type);
    }
} 