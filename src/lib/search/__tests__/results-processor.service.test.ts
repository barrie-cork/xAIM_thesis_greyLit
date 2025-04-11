import { vi, describe, it, expect, beforeEach, Mock, Mocked } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ResultsProcessorService, ProcessingContext, ProcessingResult } from '../results-processor.service';
import { SearchResult, SearchRequest } from '../types';
import { DeduplicationService, DuplicateLog, DEFAULT_DEDUPLICATION_OPTIONS } from '../deduplication';
import { CacheService } from '../cache-service';

// --- Mocks ---
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        searchResult: {
            create: vi.fn(),
        },
        // Mock other necessary prisma models/methods if needed
    }))
}));

vi.mock('../deduplication', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual, // Keep actual constants like DEFAULT_DEDUPLICATION_OPTIONS
        DeduplicationService: vi.fn().mockImplementation(() => ({
            deduplicate: vi.fn(),
            getLogs: vi.fn(() => []), // Mock getLogs as well
        })),
    };
});

vi.mock('../cache-service', () => ({
    CacheService: vi.fn().mockImplementation(() => ({
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        generateFingerprint: vi.fn((req: SearchRequest) => `fp_${req.query}`),
    })),
}));

// Helper to create mock SearchResult
const createMockSearchResult = (id: string, title: string, url: string): SearchResult => ({
    id,
    title,
    url,
    snippet: `Snippet for ${title}`,
    searchEngine: 'mockEngine',
    timestamp: new Date(),
    rank: parseInt(id, 10),
});

describe('ResultsProcessorService', () => {
    let processorService: ResultsProcessorService;
    let mockPrisma: Mocked<PrismaClient>;
    let mockDeduplicationServiceInstance: Mocked<DeduplicationService>;
    let mockCacheServiceInstance: Mocked<CacheService>;

    const mockResults: SearchResult[] = [
        createMockSearchResult('1', 'Result 1', 'http://example.com/1'),
        createMockSearchResult('2', 'Result 2', 'http://example.com/2'),
        createMockSearchResult('3', 'Result 1', 'http://example.com/1/copy'), // Potential duplicate
    ];

    const baseRequest: SearchRequest = {
        query: 'test query',
        useCache: true,
        deduplication: true,
    };

    const baseContext: ProcessingContext = {
        userId: 'user-123',
        searchRequestId: 'req-abc',
    };

    const baseConfig = { // Use the simplified ProcessorConfig structure
        deduplication: { ...DEFAULT_DEDUPLICATION_OPTIONS, logDuplicates: true },
        cache: { enabled: true, ttl: 3600 }
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Instantiate mocks
        mockPrisma = new PrismaClient() as Mocked<PrismaClient>;

        // We need to access the *instance* methods created by the mock implementation
        const DeduplicationServiceMock = DeduplicationService as Mock;
        mockDeduplicationServiceInstance = new DeduplicationServiceMock() as Mocked<DeduplicationService>;
        DeduplicationServiceMock.mockImplementation(() => mockDeduplicationServiceInstance);

        const CacheServiceMock = CacheService as Mock;
        mockCacheServiceInstance = new CacheServiceMock() as Mocked<CacheService>;
        CacheServiceMock.mockImplementation(() => mockCacheServiceInstance);

        processorService = new ResultsProcessorService(baseConfig, mockPrisma);

        // Default mock implementations
        mockCacheServiceInstance.get.mockResolvedValue(null);
        mockDeduplicationServiceInstance.deduplicate.mockImplementation((results) => ({
            results: results, // Default: no deduplication
            duplicatesRemoved: 0,
            duplicateGroups: [],
            logs: [],
        }));
        // Correctly mock the promise returned by prisma.searchResult.create
        (mockPrisma.searchResult.create as Mock).mockResolvedValue({} as any);
    });

    it('should check cache first', async () => {
        await processorService.process(mockResults, baseRequest, baseContext);
        expect(mockCacheServiceInstance.get).toHaveBeenCalledTimes(1);
        expect(mockCacheServiceInstance.get).toHaveBeenCalledWith(baseRequest);
    });

    it('should return cached results and skip processing on cache hit', async () => {
        const cachedResponse = [{ // Mimic SearchResponse structure expected by current cache logic
            results: [mockResults[0]],
            provider: 'processed',
            metadata: {}
        }];
        mockCacheServiceInstance.get.mockResolvedValue(cachedResponse as any);

        const result = await processorService.process(mockResults, baseRequest, baseContext);

        expect(result.cacheHit).toBe(true);
        expect(result.uniqueResults).toEqual([mockResults[0]]); // Matches the results inside cachedResponse
        expect(mockDeduplicationServiceInstance.deduplicate).not.toHaveBeenCalled();
        expect(mockPrisma.searchResult.create).not.toHaveBeenCalled();
        expect(mockCacheServiceInstance.set).not.toHaveBeenCalled();
    });

    it('should call deduplication service on cache miss if enabled', async () => {
        await processorService.process(mockResults, baseRequest, baseContext);
        expect(mockCacheServiceInstance.get).toHaveBeenCalled();
        expect(mockDeduplicationServiceInstance.deduplicate).toHaveBeenCalledTimes(1);
        expect(mockDeduplicationServiceInstance.deduplicate).toHaveBeenCalledWith(mockResults, {
            shouldMerge: baseConfig.deduplication.enableMerging,
            mergeStrategy: baseConfig.deduplication.mergeStrategy
        });
    });

    it('should NOT call deduplication service if request.deduplication is false', async () => {
        const noDedupRequest = { ...baseRequest, deduplication: false };
        await processorService.process(mockResults, noDedupRequest, baseContext);

        expect(mockCacheServiceInstance.get).toHaveBeenCalled();
        expect(mockDeduplicationServiceInstance.deduplicate).not.toHaveBeenCalled();
    });

    it('should store unique results in the database', async () => {
        const uniqueResults = [mockResults[0], mockResults[1]];
        mockDeduplicationServiceInstance.deduplicate.mockReturnValue({
            results: uniqueResults,
            duplicatesRemoved: 1,
            duplicateGroups: [],
            logs: [],
        });

        await processorService.process(mockResults, baseRequest, baseContext);

        expect(mockPrisma.searchResult.create).toHaveBeenCalledTimes(uniqueResults.length);
        // Check the first call data as an example
        expect(mockPrisma.searchResult.create).toHaveBeenNthCalledWith(1, {
            data: expect.objectContaining({
                title: uniqueResults[0].title,
                url: uniqueResults[0].url,
                searchEngine: uniqueResults[0].searchEngine,
                deduped: true, // Since deduplication ran
                searchRequest: { connect: { queryId: baseContext.searchRequestId } }
            })
        });
    });

    it('should store all results if deduplication is disabled', async () => {
        const noDedupRequest = { ...baseRequest, deduplication: false };
        await processorService.process(mockResults, noDedupRequest, baseContext);

        expect(mockPrisma.searchResult.create).toHaveBeenCalledTimes(mockResults.length);
         expect(mockPrisma.searchResult.create).toHaveBeenNthCalledWith(1, {
            data: expect.objectContaining({
                title: mockResults[0].title,
                deduped: false // Since deduplication was skipped
            })
        });
    });

     it('should skip storing results if searchRequestId is missing', async () => {
        const contextWithoutReqId = { ...baseContext, searchRequestId: undefined };
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        await processorService.process(mockResults, baseRequest, contextWithoutReqId);

        expect(mockPrisma.searchResult.create).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing searchRequestId'));
        consoleWarnSpy.mockRestore();
    });

    it('should update cache with processed results on cache miss', async () => {
        const uniqueResultsFromDedup = [mockResults[0], mockResults[1]];
        const duplicatesRemoved = 1;
        mockDeduplicationServiceInstance.deduplicate.mockReturnValue({
            results: uniqueResultsFromDedup,
            duplicatesRemoved: duplicatesRemoved,
            duplicateGroups: [],
            logs: [],
        });

        // Expected results AFTER enrichment
        const expectedUniqueResults = uniqueResultsFromDedup.map(r => ({
            ...r,
            metadata: { ...(r.metadata || {}), searchRequestId: baseContext.searchRequestId }
        }));

        await processorService.process(mockResults, baseRequest, baseContext);

        expect(mockCacheServiceInstance.set).toHaveBeenCalledTimes(1);
        // Check the structure being cached - use expectedUniqueResults
        expect(mockCacheServiceInstance.set).toHaveBeenCalledWith(baseRequest, [
            expect.objectContaining({
                results: expectedUniqueResults, // Use the enriched results
                provider: 'processed',
                metadata: expect.objectContaining({
                    deduplication: {
                        enabled: true,
                        originalCount: mockResults.length,
                        uniqueCount: expectedUniqueResults.length, // Use length after enrichment
                        duplicatesRemoved: duplicatesRemoved,
                    }
                })
            })
        ]);
    });

    it('should NOT update cache if useCache is false', async () => {
        const noCacheRequest = { ...baseRequest, useCache: false };
        await processorService.process(mockResults, noCacheRequest, baseContext);
        expect(mockCacheServiceInstance.get).not.toHaveBeenCalled();
        expect(mockCacheServiceInstance.set).not.toHaveBeenCalled();
    });

     it('should return correct ProcessingResult on cache miss', async () => {
        const uniqueResultsFromDedup = [mockResults[0], mockResults[1]];
        const duplicatesRemoved = 1;
        const logs: DuplicateLog[] = [{ original: mockResults[2], duplicate: mockResults[0], reason: 'title_similarity' }];
        mockDeduplicationServiceInstance.deduplicate.mockReturnValue({
            results: uniqueResultsFromDedup,
            duplicatesRemoved: duplicatesRemoved,
            duplicateGroups: [],
            logs: logs,
        });

        // Expected results AFTER enrichment
        const expectedUniqueResults = uniqueResultsFromDedup.map(r => ({
            ...r,
            metadata: { ...(r.metadata || {}), searchRequestId: baseContext.searchRequestId }
        }));

        const result = await processorService.process(mockResults, baseRequest, baseContext);

        expect(result.cacheHit).toBe(false);
        expect(result.uniqueResults).toEqual(expectedUniqueResults); // Compare against enriched results
        expect(result.duplicatesRemoved).toBe(duplicatesRemoved);
        expect(result.duplicateLogs).toBe(logs);
    });

    it('should use request-specific deduplication options when provided', async () => {
        const specificDedupRequest: SearchRequest = {
            ...baseRequest,
            deduplication: { enableMerging: true, mergeStrategy: 'comprehensive', threshold: 0.7 }
        };
        await processorService.process(mockResults, specificDedupRequest, baseContext);

        expect(mockDeduplicationServiceInstance.deduplicate).toHaveBeenCalledWith(mockResults, {
            shouldMerge: true, // From request override
            mergeStrategy: 'comprehensive' // From request override
            // Note: threshold is used internally by the service instance, not passed here
        });
    });

    it('should handle errors during database storage', async () => {
        const dbError = new Error('Database connection failed');
        (mockPrisma.searchResult.create as Mock).mockRejectedValue(dbError);
        const consoleErrorSpy = vi.spyOn(console, 'error');

        // Define expected results AFTER enrichment step
        const expectedEnrichedResults = mockResults.map(r => ({
            ...r,
            metadata: { ...(r.metadata || {}), searchRequestId: baseContext.searchRequestId }
        }));

        // We expect the process to continue but log the error
        const result = await processorService.process(mockResults, baseRequest, baseContext);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error storing search results:', dbError);
        // Ensure the function still returns results even if storage failed
        // Compare against the results AFTER enrichment would have happened
        expect(result.uniqueResults).toEqual(expectedEnrichedResults);
        expect(result.duplicatesRemoved).toBe(0); // Default mock does no deduplication

        consoleErrorSpy.mockRestore();
    });

     it('should return duplicate logs if provided by DeduplicationService', async () => {
        const uniqueResults = [mockResults[0], mockResults[1]];
        const duplicatesRemoved = 1;
        const logs: DuplicateLog[] = [
            { original: mockResults[0], duplicate: mockResults[2], reason: 'title_similarity', similarity: 0.9 }
        ];
        mockDeduplicationServiceInstance.deduplicate.mockReturnValue({
            results: uniqueResults,
            duplicatesRemoved: duplicatesRemoved,
            duplicateGroups: [{ original: mockResults[0], duplicates: [mockResults[2]] }],
            logs: logs, // Include logs in the mock return
        });

        // Expected results AFTER enrichment
        const expectedUniqueResults = uniqueResults.map(r => ({
            ...r,
            metadata: { ...(r.metadata || {}), searchRequestId: baseContext.searchRequestId }
        }));

        const result = await processorService.process(mockResults, baseRequest, baseContext);

        expect(result.duplicateLogs).toBeDefined();
        expect(result.duplicateLogs).toEqual(logs);
        expect(result.uniqueResults).toEqual(expectedUniqueResults);
    });

}); 