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
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

// Import the mocked modules
import { prisma } from '@/server/db/client';
import { createServerClient } from '@/lib/supabase/server';

describe('Search API', () => {
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

  describe('create', () => {
    test('should create a new search request', async () => {
      // Mock data
      const mockSearchRequest = {
        query_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: mockUserId,
        query: 'test query',
        source: 'Google Scholar',
        filters: { year: 2023 },
        timestamp: new Date().toISOString(),
        search_title: 'Test Search',
        is_saved: true,
      };

      // Setup mock response
      (prisma.searchRequest.create as jest.Mock).mockResolvedValue(mockSearchRequest);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['search']['create']>;
      const input: Input = {
        query: 'test query',
        source: 'Google Scholar',
        filters: { year: 2023 },
        search_title: 'Test Search',
        is_saved: true,
      };

      // Execute the mutation
      const result = await caller.search.create(input);

      // Verify the result
      expect(result).toEqual(mockSearchRequest);
      expect(prisma.searchRequest.create).toHaveBeenCalledWith({
        data: {
          query: input.query,
          source: input.source,
          filters: input.filters,
          search_title: input.search_title,
          is_saved: input.is_saved,
          user_id: mockUserId,
        },
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
      type Input = inferProcedureInput<AppRouter['search']['create']>;
      const input: Input = {
        query: 'test query',
        source: 'Google Scholar',
        filters: { year: 2023 },
        search_title: 'Test Search',
        is_saved: true,
      };

      // Execute the mutation and expect error
      await expect(caller.search.create(input)).rejects.toThrow(TRPCError);
    });
  });

  describe('getSavedSearches', () => {
    test('should return saved searches for the user', async () => {
      // Mock data
      const mockSavedSearches = [
        {
          query_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: mockUserId,
          query: 'test query 1',
          source: 'Google Scholar',
          filters: { year: 2023 },
          timestamp: new Date().toISOString(),
          search_title: 'Test Search 1',
          is_saved: true,
        },
        {
          query_id: '223e4567-e89b-12d3-a456-426614174001',
          user_id: mockUserId,
          query: 'test query 2',
          source: 'PubMed',
          filters: { year: 2022 },
          timestamp: new Date().toISOString(),
          search_title: 'Test Search 2',
          is_saved: true,
        },
      ];

      // Setup mock response
      (prisma.searchRequest.findMany as jest.Mock).mockResolvedValue(mockSavedSearches);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Execute the query
      const result = await caller.search.getSavedSearches();

      // Verify the result
      expect(result).toEqual(mockSavedSearches);
      expect(prisma.searchRequest.findMany).toHaveBeenCalledWith({
        where: {
          user_id: mockUserId,
          is_saved: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });
    });
  });
}); 