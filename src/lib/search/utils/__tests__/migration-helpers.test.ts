import { describe, expect, test, vi } from 'vitest';
import {
  migrateExistingResults,
  isSearchRequestMigrated,
  getSearchResultsWithCompatibility
} from '../migration-helpers';

// Create mock objects
const mockPrisma = {
  searchResult: {
    findMany: vi.fn(),
  },
  rawSearchResult: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn((operations) => Promise.all(operations)),
};

const mockStorageService = {
  prisma: mockPrisma,
  getRawResults: vi.fn(),
  getSearchResults: vi.fn(),
  saveRawResults: vi.fn(),
};

const mockBackgroundProcessor = {
  queueForProcessing: vi.fn().mockReturnValue(true),
};

describe('Migration Helpers', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
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
    mockPrisma.searchResult.findMany.mockResolvedValue(existingResults);

    // Migrate existing results
    const result = await migrateExistingResults(queryId, mockStorageService as any, mockBackgroundProcessor as any);

    // Verify results were retrieved
    expect(mockPrisma.searchResult.findMany).toHaveBeenCalledWith({
      where: { queryId }
    });

    // Verify saveRawResults was called with the correct data
    expect(mockStorageService.saveRawResults).toHaveBeenCalledWith(
      queryId,
      [
        {
          title: 'Test Result 1',
          url: 'https://example.com/1',
          source: 'google',
          metadata: {
            snippet: 'Test snippet 1',
            rank: 1,
            resultType: 'organic',
            searchEngine: 'google',
            device: 'desktop',
            location: 'us',
            language: 'en',
            rawResponse: { key: 'value1' }
          }
        },
        {
          title: 'Test Result 2',
          url: 'https://example.com/2',
          source: 'google',
          metadata: {
            snippet: 'Test snippet 2',
            rank: 2,
            resultType: 'organic',
            searchEngine: 'google',
            device: 'desktop',
            location: 'us',
            language: 'en',
            rawResponse: { key: 'value2' }
          }
        }
      ]
    );


    // Verify processing was queued
    expect(mockBackgroundProcessor.queueForProcessing).toHaveBeenCalledWith(queryId);

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

    // Mock the getRawResults method
    mockStorageService.getRawResults.mockResolvedValue(rawResults);

    // Check if search request is migrated
    const result = await isSearchRequestMigrated(queryId, mockStorageService as any);

    // Verify raw results were retrieved
    expect(mockStorageService.getRawResults).toHaveBeenCalledWith(queryId);

    // Verify return value
    expect(result).toBe(true);
  });

  test('isSearchRequestMigrated should return false if no raw results exist', async () => {
    // Mock empty raw search results
    const queryId = 'test-query-id';

    // Mock the getRawResults method
    mockStorageService.getRawResults.mockResolvedValue([]);

    // Check if search request is migrated
    const result = await isSearchRequestMigrated(queryId, mockStorageService as any);

    // Verify raw results were retrieved
    expect(mockStorageService.getRawResults).toHaveBeenCalledWith(queryId);

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

    // Mock the methods
    mockStorageService.getRawResults.mockResolvedValue(rawResults);
    mockStorageService.getSearchResults.mockResolvedValue(processedResults);

    // Get search results
    const results = await getSearchResultsWithCompatibility(queryId, mockStorageService as any);

    // Verify raw results were checked
    expect(mockStorageService.getRawResults).toHaveBeenCalledWith(queryId);

    // Verify new method was used
    expect(mockStorageService.getSearchResults).toHaveBeenCalledWith(
      queryId,
      false,
      false
    );

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

    // Mock the methods
    mockStorageService.getRawResults.mockResolvedValue([]);
    mockPrisma.searchResult.findMany.mockResolvedValue(oldResults);

    // Get search results
    const results = await getSearchResultsWithCompatibility(queryId, mockStorageService as any);

    // Verify raw results were checked
    expect(mockStorageService.getRawResults).toHaveBeenCalledWith(queryId);

    // Verify old method was used
    expect(mockPrisma.searchResult.findMany).toHaveBeenCalledWith({
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
