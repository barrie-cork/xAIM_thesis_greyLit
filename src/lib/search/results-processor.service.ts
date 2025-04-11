import { PrismaClient } from '@prisma/client';
import { SearchResult, SearchRequest, SearchResponse } from './types';
import { DeduplicationService, DeduplicationOptions, DuplicateLog, DEFAULT_DEDUPLICATION_OPTIONS } from './deduplication';
import { CacheService, CacheOptions } from './cache-service';

// Define a type for the context needed during processing
export interface ProcessingContext {
    userId?: string;
    searchRequestId?: string; // ID to link results back to the original request
    // Add other relevant context if needed
}

// Define a type for the output of the processing step
export interface ProcessingResult {
    uniqueResults: SearchResult[];
    duplicatesRemoved: number;
    duplicateLogs?: DuplicateLog[];
    cacheHit: boolean;
    // Add other relevant output if needed
}

// TODO: Define a more specific config type if needed, separate from the old service
interface ProcessorConfig {
    deduplication?: Partial<DeduplicationOptions>;
    cache?: Partial<CacheOptions>;
    // Add other config fields relevant ONLY to processing
}

/**
 * Service responsible for processing search results after they've been fetched:
 * deduplication, caching, enrichment, and storage.
 */
export class ResultsProcessorService {
    private prisma: PrismaClient;
    private deduplicationService: DeduplicationService;
    private cacheService?: CacheService;
    private defaultDeduplicationOptions: DeduplicationOptions;

    constructor(config: ProcessorConfig, prismaClient: PrismaClient) {
        this.prisma = prismaClient;

        // Logic moved from SearchService constructor: Init Deduplication & Cache
        this.defaultDeduplicationOptions = {
            ...DEFAULT_DEDUPLICATION_OPTIONS,
            ...(config.deduplication || {})
        };
        this.deduplicationService = new DeduplicationService(this.defaultDeduplicationOptions);

        if (prismaClient) {
            this.cacheService = new CacheService(prismaClient, config.cache);
        }
    }

    /**
     * Processes a list of SearchResult objects: checks cache, deduplicates, stores, and updates cache.
     *
     * @param results The array of canonical SearchResult objects from SerpExecutorService.
     * @param request The original SearchRequest object (needed for cache key and options).
     * @param context Additional context like userId, searchRequestId.
     * @returns A promise resolving to a ProcessingResult object.
     */
    async process(
        results: SearchResult[],
        request: SearchRequest,
        context: ProcessingContext
    ): Promise<ProcessingResult> {
        let uniqueResults: SearchResult[] = results;
        let duplicatesRemoved = 0;
        let dedupLogs: DuplicateLog[] | undefined;
        let cacheHit = false;

        // --- 1. Cache Check --- Logic moved/adapted from SearchService.search
        if (this.cacheService && request.useCache !== false) {
            const cachedResults: SearchResponse[] | null = await this.cacheService.get(request);
            if (cachedResults) {
                console.log('Cache hit for request.');
                // TODO: Decide if we need to adapt cached results or assume they are canonical?
                // For now, assume cached results are already processed canonical results.
                // We might skip deduplication/storage if cache hit, depends on requirements.
                // Let's return cached results directly for simplicity in this refactor.
                cacheHit = true;
                // How to get duplicatesRemoved/logs from cache? Maybe cache ProcessingResult?
                // For now, return cached results and indicate cache hit.
                return {
                    uniqueResults: cachedResults.flat().map((r: SearchResponse) => r.results).flat(),
                    duplicatesRemoved: 0, // Cannot determine from cache currently
                    cacheHit: true,
                };
            }
            console.log('Cache miss for request.');
        }

        // --- 2. Deduplication --- Logic moved/adapted from SearchService.searchWithProvider
        if (request.deduplication !== false) {
            const requestOptions = request.deduplication && typeof request.deduplication === 'object'
                ? request.deduplication
                : {};
            const effectiveOptions: DeduplicationOptions = {
                ...this.defaultDeduplicationOptions,
                ...requestOptions
            };

            // Apply deduplication using the service instance
            // Pass the canonical SearchResult[] directly
            const deduplicationResult = this.deduplicationService.deduplicate(results, {
                 // merge options if needed based on effectiveOptions
                 shouldMerge: effectiveOptions.enableMerging,
                 mergeStrategy: effectiveOptions.mergeStrategy
            });

            uniqueResults = deduplicationResult.results;
            duplicatesRemoved = deduplicationResult.duplicatesRemoved;
            dedupLogs = deduplicationResult.logs;

            console.log(`Deduplication removed ${duplicatesRemoved} results.`);
        } else {
            console.log('Deduplication skipped for this request.');
        }

        // --- 3. Enrichment (Simplified) ---
        // Add searchRequestId if provided in context
        if (context.searchRequestId) {
            uniqueResults = uniqueResults.map(result => ({
                ...result,
                // Example: Add a field to link back, adjust based on actual schema needs
                metadata: { ...(result.metadata || {}), searchRequestId: context.searchRequestId }
            }));
        }

        // --- 4. Storage --- (New logic, previously implicit or missing)
        try {
            const createPromises = uniqueResults.map(result => {
                // Base data payload excluding the relation
                const dataPayload: any = {
                    title: result.title,
                    url: result.url,
                    snippet: result.snippet,
                    rank: result.rank,
                    resultType: result.resultType,
                    searchEngine: result.searchEngine,
                    device: result.device,
                    location: result.location,
                    language: result.language,
                    totalResults: result.totalResults,
                    creditsUsed: result.creditsUsed,
                    searchId: result.searchId,
                    searchUrl: result.searchUrl,
                    relatedSearches: result.relatedSearches as any,
                    similarQuestions: result.similarQuestions as any,
                    timestamp: result.timestamp,
                    rawResponse: result.rawResponse as any,
                    deduped: request.deduplication !== false,
                    // queryId will be set via the relation connect below
                };

                // Conditionally add the relation connection
                if (context.searchRequestId) {
                    dataPayload.searchRequest = { connect: { queryId: context.searchRequestId } };
                } else {
                    // If no searchRequestId, we cannot link the result.
                    // Log a warning or throw an error based on application requirements.
                    // For now, logging a warning and skipping this record.
                    console.warn(`Skipping storage for result URL ${result.url}: Missing searchRequestId.`);
                    return Promise.resolve(null); // Return null or skip adding to createPromises
                }

                return this.prisma.searchResult.create({ data: dataPayload });
            });

            // Filter out null promises before executing
            const validPromises = createPromises.filter(p => p !== null);
            
            // Execute all valid create operations
            await Promise.all(validPromises);
            console.log(`Stored ${validPromises.length} unique results.`);

            // TODO: Optionally log duplicates using dedupLogs if needed
            // await this.logDuplicatesToDb(dedupLogs);

        } catch (error) {
            console.error('Error storing search results:', error);
            // Handle storage error appropriately
        }

        // --- 5. Cache Update --- Logic moved/adapted from SearchService.search
        if (this.cacheService && request.useCache !== false /*&& context.userId - Removed userId based on linter */) {
            // Cache the final, processed, unique results.
            // The cache format needs reconsideration - should it store SearchResult[] or SearchResponse[]?
            // For now, let's adapt the old logic roughly, caching SearchResponse-like structure.
            // NOTE: This needs careful review based on how cache hits are handled.
             const responseToCache: any = [{
                 results: uniqueResults,
                 provider: 'processed' as any, // Indicate these are processed results
                 metadata: {
                     searchEngine: 'multiple',
                     timestamp: new Date(),
                     deduplication: {
                         enabled: request.deduplication !== false,
                         originalCount: results.length,
                         uniqueCount: uniqueResults.length,
                         duplicatesRemoved: duplicatesRemoved
                     }
                     // Add other relevant metadata
                 }
             }];
            // Adjusted to match linter expectation (2 arguments)
            this.cacheService.set(request, responseToCache).catch(err => {
                console.error('Error storing processed results in cache:', err);
            });
        }

        return {
            uniqueResults,
            duplicatesRemoved,
            duplicateLogs: dedupLogs,
            cacheHit
        };
    }

    // Optional: Add helper method to log duplicates to DB if needed
    // private async logDuplicatesToDb(logs?: DuplicateLog[]): Promise<void> { ... }
} 