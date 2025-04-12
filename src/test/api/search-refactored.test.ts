import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { appRouter } from '@/server/trpc/router';
import { createInnerTRPCContext } from '@/server/trpc/context';
import { inferProcedureInput } from '@trpc/server';
import { type AppRouter } from '@/server/trpc/router';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
jest.mock('@/server/db/client', () => ({
  prisma: {
    searchRequest: {
      create: jest.fn().mockResolvedValue({ queryId: 'mock-query-id' }),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
  },
}));

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

// Mock the search service
jest.mock('@/lib/search', () => {
  const originalModule = jest.requireActual('@/lib/search');
  
  return {
    ...originalModule,
    SearchService: jest.fn().mockImplementation(() => ({
      search: jest.fn().mockResolvedValue([{
        searchRequestId: 'mock-query-id',
        provider: 'SERPER',
        results: [
          { title: 'Test Result 1', url: 'https://example.com/1' },
          { title: 'Test Result 2', url: 'https://example.com/2' }
        ],
        metadata: {
          rawResultsCount: 2
        }
      }]),
      getAvailableProviders: jest.fn().mockReturnValue(['SERPER', 'SERPAPI'])
    })),
    StorageService: jest.fn().mockImplementation(() => ({
      getSearchResults: jest.fn().mockResolvedValue([
        { id: 'result1', title: 'Test Result 1', url: 'https://example.com/1' },
        { id: 'result2', title: 'Test Result 2', url: 'https://example.com/2' }
      ]),
      getRawResults: jest.fn().mockResolvedValue([
        { id: 'raw1', title: 'Raw Result 1', url: 'https://example.com/1' },
        { id: 'raw2', title: 'Raw Result 2', url: 'https://example.com/2' }
      ]),
      getDuplicateRelationships: jest.fn().mockResolvedValue([
        { 
          id: 'rel1', 
          originalResultId: 'result1', 
          duplicateResultId: 'result3',
          confidenceScore: 0.9,
          originalResult: { id: 'result1', title: 'Original' },
          duplicateResult: { id: 'result3', title: 'Duplicate' }
        }
      ])
    })),
    BackgroundProcessor: jest.fn().mockImplementation(() => ({
      queueForProcessing: jest.fn().mockReturnValue(true),
      processImmediately: jest.fn().mockResolvedValue({
        totalProcessed: 2,
        uniqueResults: 1,
        duplicatesFound: 1,
        processingTime: 100
      }),
      getStatus: jest.fn().mockReturnValue({
        isProcessing: false,
        queueLength: 0
      })
    }))
  };
});

// Import the mocked modules
import { prisma } from '@/server/db/client';
import { createServerClient } from '@/lib/supabase/server';

describe('Search API (Refactored)', () => {
  const mockUserId = 'user123';
  
  // Mock authenticated user for all tests
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Default setup for authenticated user
    (createServerClient as jest.Mock).mockImplementation(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: mockUserId } } 
        }),
        getSession: jest.fn().mockResolvedValue({ 
          data: { session: { user: { id: mockUserId } } } 
        }),
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeV2', () => {
    test('should execute a search and queue processing', async () => {
      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['search']['executeV2']>;
      const input: Input = {
        query: 'test query',
        maxResults: 10,
        fileTypes: ['PDF'],
        domain: 'example.com'
      };

      // Execute the mutation
      const result = await caller.search.executeV2(input);

      // Verify the result
      expect(result).toEqual({
        searchRequestId: 'mock-query-id',
        processingQueued: true,
        searchResponses: [{
          searchRequestId: 'mock-query-id',
          provider: 'SERPER',
          results: [
            { title: 'Test Result 1', url: 'https://example.com/1' },
            { title: 'Test Result 2', url: 'https://example.com/2' }
          ],
          metadata: {
            rawResultsCount: 2
          }
        }]
      });
    });

    test('should throw error when not authenticated', async () => {
      // Override the default auth mock to simulate unauthenticated user
      (createServerClient as jest.Mock).mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      }));

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['search']['executeV2']>;
      const input: Input = {
        query: 'test query'
      };

      // Execute the mutation and expect error
      await expect(caller.search.executeV2(input)).rejects.toThrow(TRPCError);
    });
  });

  describe('getProcessedResults', () => {
    test('should return processed search results', async () => {
      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the query
      type Input = inferProcedureInput<AppRouter['search']['getProcessedResults']>;
      const input: Input = {
        searchRequestId: 'mock-query-id',
        includeDuplicates: false
      };

      // Execute the query
      const result = await caller.search.getProcessedResults(input);

      // Verify the result
      expect(result).toEqual({
        results: [
          { id: 'result1', title: 'Test Result 1', url: 'https://example.com/1' },
          { id: 'result2', title: 'Test Result 2', url: 'https://example.com/2' }
        ],
        totalResults: 2,
        includingDuplicates: false
      });
    });
  });

  describe('getRawResults', () => {
    test('should return raw search results', async () => {
      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the query
      type Input = inferProcedureInput<AppRouter['search']['getRawResults']>;
      const input: Input = {
        searchRequestId: 'mock-query-id'
      };

      // Execute the query
      const result = await caller.search.getRawResults(input);

      // Verify the result
      expect(result).toEqual({
        results: [
          { id: 'raw1', title: 'Raw Result 1', url: 'https://example.com/1' },
          { id: 'raw2', title: 'Raw Result 2', url: 'https://example.com/2' }
        ],
        totalResults: 2
      });
    });
  });

  describe('processResults', () => {
    test('should process search results immediately', async () => {
      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['search']['processResults']>;
      const input: Input = {
        searchRequestId: 'mock-query-id',
        deduplicationOptions: {
          titleSimilarityThreshold: 0.8,
          strictUrlMatching: false
        }
      };

      // Execute the mutation
      const result = await caller.search.processResults(input);

      // Verify the result
      expect(result).toEqual({
        totalProcessed: 2,
        uniqueResults: 1,
        duplicatesFound: 1,
        processingTime: 100
      });
    });
  });

  describe('getProcessingStatus', () => {
    test('should return the current processing status', async () => {
      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Execute the query
      const result = await caller.search.getProcessingStatus();

      // Verify the result
      expect(result).toEqual({
        isProcessing: false,
        queueLength: 0
      });
    });
  });

  describe('getDuplicateRelationships', () => {
    test('should return duplicate relationships for a result', async () => {
      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the query
      type Input = inferProcedureInput<AppRouter['results']['getDuplicateRelationships']>;
      const input: Input = {
        resultId: 'result1'
      };

      // Execute the query
      const result = await caller.results.getDuplicateRelationships(input);

      // Verify the result
      expect(result).toEqual({
        relationships: [
          { 
            id: 'rel1', 
            originalResultId: 'result1', 
            duplicateResultId: 'result3',
            confidenceScore: 0.9,
            originalResult: { id: 'result1', title: 'Original' },
            duplicateResult: { id: 'result3', title: 'Duplicate' }
          }
        ],
        totalRelationships: 1
      });
    });
  });
});
