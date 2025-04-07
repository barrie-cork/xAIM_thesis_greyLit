import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { appRouter } from '@/server/trpc/router';
import { createInnerTRPCContext } from '@/server/trpc/context';
import { inferProcedureInput } from '@trpc/server';
import { type AppRouter } from '@/server/trpc/router';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
jest.mock('@/server/db/client', () => ({
  prisma: {
    reviewTag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    searchResult: {
      findUnique: jest.fn(),
    },
    searchRequest: {
      findUnique: jest.fn(),
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

describe('Review API', () => {
  const mockUserId = 'user123';
  const mockResultId = 'result123';
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

    // Mock search result for auth checks
    (prisma.searchResult.findUnique as jest.Mock).mockResolvedValue({
      id: mockResultId,
      queryId: mockQueryId,
      searchRequest: {
        userId: mockUserId
      }
    });

    // Mock search request for auth checks
    (prisma.searchRequest.findUnique as jest.Mock).mockResolvedValue({
      queryId: mockQueryId,
      userId: mockUserId
    });

    // No existing tag by default
    (prisma.reviewTag.findFirst as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('should create a new review tag', async () => {
      // Mock data
      const mockTag = {
        resultId: mockResultId,
        tag: 'include' as const,
        exclusionReason: null,
        notes: 'This is relevant',
        retrieved: true,
      };

      const mockCreatedTag = {
        id: 'tag123',
        ...mockTag,
        reviewerId: mockUserId,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      // Setup mock response
      (prisma.reviewTag.create as jest.Mock).mockResolvedValue(mockCreatedTag);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['review']['create']>;
      const input: Input = mockTag;

      // Execute the mutation
      const result = await caller.review.create(input);

      // Verify the result
      expect(result).toEqual(mockCreatedTag);
      expect(prisma.reviewTag.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          resultId: mockTag.resultId,
          tag: mockTag.tag,
          exclusionReason: mockTag.exclusionReason,
          notes: mockTag.notes,
          retrieved: mockTag.retrieved,
          reviewerId: mockUserId,
          createdAt: expect.any(Date),
          updatedAt: null,
        },
      });
    });

    test('should throw error if result not found', async () => {
      // Setup mock response for not found result
      (prisma.searchResult.findUnique as jest.Mock).mockResolvedValue(null);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['review']['create']>;
      const input: Input = {
        resultId: 'non-existent-result',
        tag: 'include',
      };

      // Execute the mutation and expect error
      await expect(caller.review.create(input)).rejects.toThrow(TRPCError);
    });

    test('should throw error if user already tagged the result', async () => {
      // Setup mock response for existing tag
      (prisma.reviewTag.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-tag',
        resultId: mockResultId,
        reviewerId: mockUserId,
      });

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['review']['create']>;
      const input: Input = {
        resultId: mockResultId,
        tag: 'include',
      };

      // Execute the mutation and expect error
      await expect(caller.review.create(input)).rejects.toThrow(TRPCError);
    });
  });

  describe('update', () => {
    test('should update an existing review tag', async () => {
      // Mock data for existing tag
      const existingTag = {
        id: 'tag123',
        resultId: mockResultId,
        tag: 'maybe' as const,
        reviewerId: mockUserId,
        exclusionReason: null,
        notes: 'Need to review more',
        retrieved: false,
      };

      // Mock update data
      const updateData = {
        id: 'tag123',
        tag: 'include' as const,
        notes: 'Definitely relevant',
        retrieved: true,
      };

      const updatedTag = {
        ...existingTag,
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      // Setup mock responses
      (prisma.reviewTag.findUnique as jest.Mock).mockResolvedValue(existingTag);
      (prisma.reviewTag.update as jest.Mock).mockResolvedValue(updatedTag);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['review']['update']>;
      const input: Input = updateData;

      // Execute the mutation
      const result = await caller.review.update(input);

      // Verify the result
      expect(result).toEqual(updatedTag);
      expect(prisma.reviewTag.update).toHaveBeenCalledWith({
        where: { id: updateData.id },
        data: {
          tag: updateData.tag,
          notes: updateData.notes,
          retrieved: updateData.retrieved,
          updatedAt: expect.any(Date),
        },
      });
    });

    test('should throw error if tag not found', async () => {
      // Setup mock response
      (prisma.reviewTag.findUnique as jest.Mock).mockResolvedValue(null);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['review']['update']>;
      const input: Input = {
        id: 'non-existent-tag',
        tag: 'include',
      };

      // Execute the mutation and expect error
      await expect(caller.review.update(input)).rejects.toThrow(TRPCError);
    });
  });

  describe('getByQueryId', () => {
    test('should return review tags for a query', async () => {
      // Mock data
      const mockTags = [
        {
          id: 'tag1',
          resultId: 'result1',
          tag: 'include',
          exclusionReason: null,
          notes: 'Relevant',
          createdAt: new Date().toISOString(),
          result: {
            id: 'result1',
            title: 'Test Result 1',
            url: 'https://example.com/1',
          },
        },
        {
          id: 'tag2',
          resultId: 'result2',
          tag: 'exclude',
          exclusionReason: 'Not relevant to research question',
          notes: null,
          createdAt: new Date().toISOString(),
          result: {
            id: 'result2',
            title: 'Test Result 2',
            url: 'https://example.com/2',
          },
        },
      ];

      // Setup mock response
      (prisma.reviewTag.findMany as jest.Mock).mockResolvedValue(mockTags);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the query
      type Input = inferProcedureInput<AppRouter['review']['getByQueryId']>;
      const input: Input = {
        queryId: mockQueryId,
      };

      // Execute the query
      const result = await caller.review.getByQueryId(input);

      // Verify the result
      expect(result).toEqual(mockTags);
      expect(prisma.reviewTag.findMany).toHaveBeenCalledWith({
        where: {
          result: {
            queryId: mockQueryId,
          },
        },
        include: {
          result: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
}); 