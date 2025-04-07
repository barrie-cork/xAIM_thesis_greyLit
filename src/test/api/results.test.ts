import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { appRouter } from '@/server/trpc/router';
import { createInnerTRPCContext } from '@/server/trpc/context';
import { inferProcedureInput } from '@trpc/server';
import { type AppRouter } from '@/server/trpc/router';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
jest.mock('@/server/db/client', () => ({
  prisma: {
    searchResult: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    searchRequest: {
      findUnique: jest.fn(),
    },
    duplicateLog: {
      create: jest.fn(),
    }
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

// Import the mocked modules
import { prisma } from '@/server/db/client';
import { createServerClient } from '@/lib/supabase/server';

describe('Results API', () => {
  const mockUserId = 'user123';
  const mockQueryId = 'query123';
  
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

    // Mock search request for auth checks
    (prisma.searchRequest.findUnique as jest.Mock).mockResolvedValue({
      queryId: mockQueryId,
      userId: mockUserId,
      query: 'test query',
      source: 'Google Scholar',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByQueryId', () => {
    test('should return results for a specified query ID', async () => {
      // Mock data
      const mockResults = [
        {
          id: 'result1',
          queryId: mockQueryId,
          title: 'Test Result 1',
          url: 'https://example.com/1',
          snippet: 'This is a test result snippet',
          source: 'Google Scholar',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'result2',
          queryId: mockQueryId,
          title: 'Test Result 2',
          url: 'https://example.com/2',
          snippet: 'Another test result snippet',
          source: 'Google Scholar',
          timestamp: new Date().toISOString(),
        },
      ];

      // Setup mock response
      (prisma.searchResult.findMany as jest.Mock).mockResolvedValue(mockResults);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the query
      type Input = inferProcedureInput<AppRouter['results']['getByQueryId']>;
      const input: Input = {
        queryId: mockQueryId,
      };

      // Execute the query
      const result = await caller.results.getByQueryId(input);

      // Verify the result
      expect(result).toEqual(mockResults);
      expect(prisma.searchResult.findMany).toHaveBeenCalledWith({
        where: {
          queryId: mockQueryId,
        },
        orderBy: {
          rank: 'asc',
        },
      });
    });

    test('should throw error when query does not belong to user', async () => {
      // Mock data for a query that doesn't belong to the user
      (prisma.searchRequest.findUnique as jest.Mock).mockResolvedValue({
        queryId: mockQueryId,
        userId: 'different-user-id',
        query: 'test query',
        source: 'Google Scholar',
      });

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the query
      type Input = inferProcedureInput<AppRouter['results']['getByQueryId']>;
      const input: Input = {
        queryId: mockQueryId,
      };

      // Execute the query and expect error
      await expect(caller.results.getByQueryId(input)).rejects.toThrow(TRPCError);
    });
  });

  describe('saveResult', () => {
    test('should save a new search result', async () => {
      // Mock data
      const mockInput = {
        queryId: mockQueryId,
        title: 'New Result',
        url: 'https://example.com/new',
        snippet: 'New result snippet',
        source: 'PubMed',
      };

      const mockSavedResult = {
        id: 'new-result-id',
        ...mockInput,
        timestamp: new Date().toISOString(),
      };

      // Setup mock response
      (prisma.searchResult.create as jest.Mock).mockResolvedValue(mockSavedResult);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['results']['saveResult']>;
      const input: Input = mockInput;

      // Execute the mutation
      const result = await caller.results.saveResult(input);

      // Verify the result
      expect(result).toEqual(mockSavedResult);
      expect(prisma.searchResult.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          queryId: mockInput.queryId,
          title: mockInput.title,
          url: mockInput.url,
          snippet: mockInput.snippet,
          source: mockInput.source,
        },
      });
    });

    test('should throw error when query does not exist', async () => {
      // Mock data - query not found
      (prisma.searchRequest.findUnique as jest.Mock).mockResolvedValue(null);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['results']['saveResult']>;
      const input: Input = {
        queryId: 'non-existent-query',
        title: 'New Result',
        url: 'https://example.com/new',
        snippet: 'New result snippet',
        source: 'PubMed',
      };

      // Execute the mutation and expect error
      await expect(caller.results.saveResult(input)).rejects.toThrow(TRPCError);
    });
  });
}); 