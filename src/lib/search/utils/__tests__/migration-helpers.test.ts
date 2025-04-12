import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  migrateExistingResults,
  isSearchRequestMigrated,
  getSearchResultsWithCompatibility
} from '../migration-helpers';
import { StorageService } from '../../services/storage-service';
import { BackgroundProcessor } from '../../services/background-processor';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    searchRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    searchResult: {
      findMany: jest.fn(),
    },
    rawSearchResult: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('Migration Helpers', () => {
  let storageService: StorageService;
  let backgroundProcessor: BackgroundProcessor;
  let prismaClient: PrismaClient;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Create a new PrismaClient instance
    prismaClient = new PrismaClient();
    
    // Initialize services
    storageService = new StorageService(prismaClient);
    backgroundProcessor = new BackgroundProcessor(storageService);
    
    // Mock the queueForProcessing method
    jest.spyOn(backgroundProcessor, 'queueForProcessing').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('migrateExistingResults should convert existing results to raw format', async () => {
    // Mock existing search results
    const queryId = 'test-query-id';
    const existingResults = [
      {
        id: 'result1',
        queryId,
        title: 'Test Result 1',
        url: 'https://example.com/1',
        snippet: 'Test snippet 1',
        rank: 1,
        resultType: 'organic',
        searchEngine: 'google',
        device: 'desktop',
        location: 'us',
        language: 'en',
        rawResponse: { key: 'value1' }
      },
      {
        id: 'result2',
        queryId,
        title: 'Test Result 2',
        url: 'https://example.com/2',
        snippet: 'Test snippet 2',
        rank: 2,
        resultType: 'organic',
        searchEngine: 'google',
        device: 'desktop',
        location: 'us',
        language: 'en',
        rawResponse: { key: 'value2' }
      }
    ];

    // Mock the findMany method
    (prismaClient.searchResult.findMany as jest.Mock).mockResolvedValue(existingResults);

    // Migrate existing results
    const result = await migrateExistingResults(queryId, storageService, backgroundProcessor);

    // Verify results were retrieved
    expect(prismaClient.searchResult.findMany).toHaveBeenCalledWith({
      where: { queryId }
    });

    // Verify raw results were created
    expect(prismaClient.rawSearchResult.create).toHaveBeenCalledTimes(2);
    
    // Verify the raw results contain the correct data
    const createCalls = (prismaClient.$transaction as jest.Mock).mock.calls[0][0];
    expect(createCalls).toHaveLength(2);
    
    // Check first raw result
    expect(createCalls[0].data.title).toBe('Test Result 1');
    expect(createCalls[0].data.url).toBe('https://example.com/1');
    expect(createCalls[0].data.source).toBe('google');
    expect(createCalls[0].data.metadata).toEqual({
      snippet: 'Test snippet 1',
      rank: 1,
      resultType: 'organic',
      searchEngine: 'google',
      device: 'desktop',
      location: 'us',
      language: 'en',
      rawResponse: { key: 'value1' }
    });
    
    // Check second raw result
    expect(createCalls[1].data.title).toBe('Test Result 2');
    expect(createCalls[1].data.url).toBe('https://example.com/2');
    
    // Verify processing was queued
    expect(backgroundProcessor.queueForProcessing).toHaveBeenCalledWith(queryId);
    
    // Verify return value
    expect(result).toEqual({
      rawResultsCreated: 2,
      processingQueued: true
    });
  });

  test('isSearchRequestMigrated should return true if raw results exist', async () => {
    // Mock raw search results
    const queryId = 'test-query-id';
    const rawResults = [
      {
        id: 'raw1',
        searchRequestId: queryId,
        title: 'Raw Result 1',
        url: 'https://example.com/1',
        source: 'google',
        metadata: {}
      }
    ];

    // Mock the findMany method
    (prismaClient.rawSearchResult.findMany as jest.Mock).mockResolvedValue(rawResults);

    // Check if search request is migrated
    const result = await isSearchRequestMigrated(queryId, storageService);

    // Verify raw results were retrieved
    expect(prismaClient.rawSearchResult.findMany).toHaveBeenCalledWith({
      where: { searchRequestId: queryId }
    });

    // Verify return value
    expect(result).toBe(true);
  });

  test('isSearchRequestMigrated should return false if no raw results exist', async () => {
    // Mock empty raw search results
    const queryId = 'test-query-id';
    
    // Mock the findMany method
    (prismaClient.rawSearchResult.findMany as jest.Mock).mockResolvedValue([]);

    // Check if search request is migrated
    const result = await isSearchRequestMigrated(queryId, storageService);

    // Verify raw results were retrieved
    expect(prismaClient.rawSearchResult.findMany).toHaveBeenCalledWith({
      where: { searchRequestId: queryId }
    });

    // Verify return value
    expect(result).toBe(false);
  });

  test('getSearchResultsWithCompatibility should use new method for migrated requests', async () => {
    // Mock raw search results (to indicate migration)
    const queryId = 'test-query-id';
    const rawResults = [{ id: 'raw1' }];
    
    // Mock processed results
    const processedResults = [
      { id: 'result1', title: 'Result 1' },
      { id: 'result2', title: 'Result 2' }
    ];

    // Mock the findMany methods
    (prismaClient.rawSearchResult.findMany as jest.Mock).mockResolvedValue(rawResults);
    (prismaClient.searchResult.findMany as jest.Mock).mockResolvedValue(processedResults);

    // Get search results
    const results = await getSearchResultsWithCompatibility(queryId, storageService);

    // Verify raw results were checked
    expect(prismaClient.rawSearchResult.findMany).toHaveBeenCalledWith({
      where: { searchRequestId: queryId }
    });

    // Verify new method was used
    expect(prismaClient.searchResult.findMany).toHaveBeenCalledWith({
      where: {
        queryId,
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

    // Verify return value
    expect(results).toEqual(processedResults);
  });

  test('getSearchResultsWithCompatibility should use old method for non-migrated requests', async () => {
    // Mock empty raw search results (to indicate no migration)
    const queryId = 'test-query-id';
    
    // Mock old-style results
    const oldResults = [
      { id: 'result1', title: 'Result 1', deduped: true },
      { id: 'result2', title: 'Result 2', deduped: true }
    ];

    // Mock the findMany methods
    (prismaClient.rawSearchResult.findMany as jest.Mock).mockResolvedValue([]);
    (prismaClient.searchResult.findMany as jest.Mock).mockResolvedValue(oldResults);

    // Get search results
    const results = await getSearchResultsWithCompatibility(queryId, storageService);

    // Verify raw results were checked
    expect(prismaClient.rawSearchResult.findMany).toHaveBeenCalledWith({
      where: { searchRequestId: queryId }
    });

    // Verify old method was used
    expect(prismaClient.searchResult.findMany).toHaveBeenCalledWith({
      where: {
        queryId,
        deduped: true
      },
      orderBy: {
        rank: 'asc'
      }
    });

    // Verify return value
    expect(results).toEqual(oldResults);
  });
});
