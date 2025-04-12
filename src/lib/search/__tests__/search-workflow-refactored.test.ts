import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  SearchService as RefactoredSearchService,
  StorageService,
  BackgroundProcessor,
  SearchProviderType,
  DeduplicationService
} from '@/lib/search';
import { PrismaClient, SearchResultStatus } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    searchRequest: {
      create: jest.fn().mockResolvedValue({ queryId: 'mock-query-id' }),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    searchResult: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    rawSearchResult: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    duplicateRelationship: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    SearchResultStatus: {
      raw: 'raw',
      processed: 'processed',
      duplicate: 'duplicate'
    }
  };
});

// Mock fetch for search provider
const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch;

describe('Refactored Search Workflow', () => {
  let storageService: StorageService;
  let backgroundProcessor: BackgroundProcessor;
  let searchService: RefactoredSearchService;
  let prismaClient: PrismaClient;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Create a new PrismaClient instance
    prismaClient = new PrismaClient();
    
    // Initialize services
    storageService = new StorageService(prismaClient);
    backgroundProcessor = new BackgroundProcessor(storageService);
    searchService = new RefactoredSearchService({
      providers: {
        [SearchProviderType.SERPER]: {
          apiKey: 'test-serper-api-key'
        }
      },
      defaultProvider: SearchProviderType.SERPER,
      storageService
    });

    // Mock successful search response
    mockFetch.mockResolvedValue({
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should execute search and store raw results', async () => {
    // Execute search
    const userId = 'test-user-id';
    const searchResponses = await searchService.search({
      query: 'test query',
      userId
    });

    // Verify search was executed
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(searchResponses).toHaveLength(1);
    expect(searchResponses[0].provider).toBe(SearchProviderType.SERPER);
    expect(searchResponses[0].results).toHaveLength(2);

    // Verify search request was created
    expect(prismaClient.searchRequest.create).toHaveBeenCalledWith({
      data: {
        userId,
        query: 'test query',
        source: 'SERPER',
        filters: expect.any(Object)
      }
    });

    // Verify raw results were stored
    expect(prismaClient.rawSearchResult.create).toHaveBeenCalledTimes(2);
    
    // Verify the raw results contain the correct data
    const createCalls = (prismaClient.$transaction as jest.Mock).mock.calls[0][0];
    expect(createCalls).toHaveLength(2);
    expect(createCalls[0].data.title).toBe('Test Result 1');
    expect(createCalls[1].data.title).toBe('Test Result 2');
  });

  test('should process raw results and identify duplicates', async () => {
    // Mock raw search results
    const searchRequestId = 'test-search-id';
    const rawResults = [
      {
        id: 'raw1',
        searchRequestId,
        title: 'Duplicate Title',
        url: 'https://example.com/page1',
        source: 'SERPER',
        metadata: { snippet: 'Test snippet 1' },
        createdAt: new Date()
      },
      {
        id: 'raw2',
        searchRequestId,
        title: 'Duplicate Title', // Same title
        url: 'https://other.com/page2',
        source: 'SERPER',
        metadata: { snippet: 'Test snippet 2' },
        createdAt: new Date()
      },
      {
        id: 'raw3',
        searchRequestId,
        title: 'Unique Title',
        url: 'https://example.com/page3',
        source: 'SERPER',
        metadata: { snippet: 'Test snippet 3' },
        createdAt: new Date()
      }
    ];

    // Mock the getRawResults method
    (prismaClient.rawSearchResult.findMany as jest.Mock).mockResolvedValue(rawResults);

    // Mock the saveProcessedResults method to return processed results with IDs
    (prismaClient.$transaction as jest.Mock).mockImplementation((operations) => {
      // For the first transaction (saving processed results)
      if (operations.length === 3) {
        return Promise.resolve([
          { id: 'proc1', title: 'Duplicate Title', url: 'https://example.com/page1', status: 'processed' },
          { id: 'proc2', title: 'Duplicate Title', url: 'https://other.com/page2', status: 'processed' },
          { id: 'proc3', title: 'Unique Title', url: 'https://example.com/page3', status: 'processed' }
        ]);
      }
      // For the second transaction (creating duplicate relationships)
      return Promise.resolve([
        { id: 'dup1', originalResultId: 'proc1', duplicateResultId: 'proc2', confidenceScore: 0.9 }
      ]);
    });

    // Process the results
    const result = await backgroundProcessor.processImmediately(searchRequestId);

    // Verify raw results were retrieved
    expect(prismaClient.rawSearchResult.findMany).toHaveBeenCalledWith({
      where: { searchRequestId }
    });

    // Verify processed results were saved
    expect(prismaClient.$transaction).toHaveBeenCalledTimes(2);

    // Verify duplicate detection
    expect(prismaClient.searchResult.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['proc2']
        }
      },
      data: {
        status: 'duplicate',
        duplicateOfId: 'proc1'
      }
    });

    // Verify processing statistics
    expect(result.totalProcessed).toBe(3);
    expect(result.uniqueResults).toBe(2);
    expect(result.duplicatesFound).toBe(1);
  });

  test('should retrieve processed results excluding duplicates by default', async () => {
    // Mock processed search results
    const searchRequestId = 'test-search-id';
    const processedResults = [
      {
        id: 'result1',
        queryId: searchRequestId,
        title: 'Original Result',
        url: 'https://example.com/page1',
        status: 'processed',
        duplicateOfId: null
      },
      {
        id: 'result2',
        queryId: searchRequestId,
        title: 'Duplicate Result',
        url: 'https://other.com/page2',
        status: 'duplicate',
        duplicateOfId: 'result1'
      },
      {
        id: 'result3',
        queryId: searchRequestId,
        title: 'Another Original',
        url: 'https://example.com/page3',
        status: 'processed',
        duplicateOfId: null
      }
    ];

    // Mock the findMany method
    (prismaClient.searchResult.findMany as jest.Mock).mockResolvedValue(processedResults.filter(r => r.status !== 'duplicate'));

    // Get search results
    const results = await storageService.getSearchResults(searchRequestId);

    // Verify results were retrieved
    expect(prismaClient.searchResult.findMany).toHaveBeenCalledWith({
      where: {
        queryId: searchRequestId,
        status: {
          not: 'duplicate'
        }
      },
      include: {
        duplicateOf: false,
        duplicates: false,
        originalInDuplicateRelationships: false,
        duplicateInDuplicateRelationships: false
      }
    });

    // Verify only non-duplicate results were returned
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Original Result');
    expect(results[1].title).toBe('Another Original');
  });

  test('should retrieve processed results including duplicates when specified', async () => {
    // Mock processed search results
    const searchRequestId = 'test-search-id';
    const processedResults = [
      {
        id: 'result1',
        queryId: searchRequestId,
        title: 'Original Result',
        url: 'https://example.com/page1',
        status: 'processed',
        duplicateOfId: null
      },
      {
        id: 'result2',
        queryId: searchRequestId,
        title: 'Duplicate Result',
        url: 'https://other.com/page2',
        status: 'duplicate',
        duplicateOfId: 'result1'
      },
      {
        id: 'result3',
        queryId: searchRequestId,
        title: 'Another Original',
        url: 'https://example.com/page3',
        status: 'processed',
        duplicateOfId: null
      }
    ];

    // Mock the findMany method
    (prismaClient.searchResult.findMany as jest.Mock).mockResolvedValue(processedResults);

    // Get search results including duplicates
    const results = await storageService.getSearchResults(searchRequestId, false, true);

    // Verify results were retrieved
    expect(prismaClient.searchResult.findMany).toHaveBeenCalledWith({
      where: {
        queryId: searchRequestId
      },
      include: {
        duplicateOf: true,
        duplicates: true,
        originalInDuplicateRelationships: true,
        duplicateInDuplicateRelationships: true
      }
    });

    // Verify all results were returned
    expect(results).toHaveLength(3);
  });

  test('should retrieve duplicate relationships for a result', async () => {
    // Mock duplicate relationships
    const resultId = 'result1';
    const relationships = [
      {
        id: 'rel1',
        originalResultId: resultId,
        duplicateResultId: 'result2',
        confidenceScore: 0.9,
        originalResult: {
          id: resultId,
          title: 'Original Result',
          url: 'https://example.com/page1'
        },
        duplicateResult: {
          id: 'result2',
          title: 'Duplicate Result',
          url: 'https://other.com/page2'
        }
      }
    ];

    // Mock the findMany method
    (prismaClient.duplicateRelationship.findMany as jest.Mock).mockResolvedValue(relationships);

    // Get duplicate relationships
    const result = await storageService.getDuplicateRelationships(resultId);

    // Verify relationships were retrieved
    expect(prismaClient.duplicateRelationship.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { originalResultId: resultId },
          { duplicateResultId: resultId }
        ]
      },
      include: {
        originalResult: true,
        duplicateResult: true
      }
    });

    // Verify relationships were returned
    expect(result).toHaveLength(1);
    expect(result[0].originalResultId).toBe(resultId);
    expect(result[0].duplicateResultId).toBe('result2');
    expect(result[0].confidenceScore).toBe(0.9);
  });

  test('should queue search requests for background processing', async () => {
    // Mock the processRawResults method
    const processRawResultsSpy = jest.spyOn(
      DeduplicationService.prototype, 
      'processRawResults'
    ).mockResolvedValue({
      totalProcessed: 2,
      uniqueResults: 2,
      duplicatesFound: 0,
      processingTime: 100
    });

    // Queue a search request
    const searchRequestId = 'test-search-id';
    const queued = backgroundProcessor.queueForProcessing(searchRequestId);

    // Verify request was queued
    expect(queued).toBe(true);

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify processing was called
    expect(processRawResultsSpy).toHaveBeenCalledWith(
      searchRequestId,
      expect.any(Object)
    );

    // Restore the original method
    processRawResultsSpy.mockRestore();
  });
});
