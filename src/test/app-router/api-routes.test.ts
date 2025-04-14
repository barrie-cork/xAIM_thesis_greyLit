import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/server/db/client';

// Mock the auth server utilities
vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(),
}));

// Mock the prisma client
vi.mock('@/server/db/client', () => ({
  prisma: {
    searchRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Import the API route handlers
import { POST as createSearch, GET as getSavedSearches } from '@/app/api/search/route';
import { DELETE as deleteSearch } from '@/app/api/search/[id]/route';
import { POST as executeSearch } from '@/app/api/search/execute/route';

describe('API Routes', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Search API', () => {
    it('should create a search request when authenticated', async () => {
      // Mock session data
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      (requireAuth as any).mockResolvedValue(mockSession);

      // Mock request data
      const requestData = {
        query: 'test query',
        source: 'Google Scholar',
        filters: { year: 2023 },
        search_title: 'Test Search',
        is_saved: true,
      };

      // Mock prisma response
      const mockSearchRequest = {
        query_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user123',
        ...requestData,
        timestamp: new Date().toISOString(),
      };
      (prisma.searchRequest.create as any).mockResolvedValue(mockSearchRequest);

      // Create request
      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Call the API route
      const response = await createSearch(request);
      const responseData = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockSearchRequest);
      expect(requireAuth).toHaveBeenCalled();
      expect(prisma.searchRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'user123',
          query: 'test query',
          source: 'Google Scholar',
          filters: { year: 2023 },
          search_title: 'Test Search',
          is_saved: true,
        }),
      });
    });

    it('should get saved searches when authenticated', async () => {
      // Mock session data
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      (requireAuth as any).mockResolvedValue(mockSession);

      // Mock prisma response
      const mockSavedSearches = [
        {
          query_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: 'user123',
          query: 'test query 1',
          source: 'Google Scholar',
          filters: { year: 2023 },
          timestamp: new Date().toISOString(),
          search_title: 'Test Search 1',
          is_saved: true,
        },
        {
          query_id: '223e4567-e89b-12d3-a456-426614174001',
          user_id: 'user123',
          query: 'test query 2',
          source: 'PubMed',
          filters: { year: 2022 },
          timestamp: new Date().toISOString(),
          search_title: 'Test Search 2',
          is_saved: true,
        },
      ];
      (prisma.searchRequest.findMany as any).mockResolvedValue(mockSavedSearches);

      // Create request
      const request = new Request('http://localhost:3000/api/search');

      // Call the API route
      const response = await getSavedSearches(request);
      const responseData = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockSavedSearches);
      expect(requireAuth).toHaveBeenCalled();
      expect(prisma.searchRequest.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user123',
          is_saved: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });
    });

    it('should delete a search request when authenticated and authorized', async () => {
      // Mock session data
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      (requireAuth as any).mockResolvedValue(mockSession);

      // Mock search request
      const mockSearchRequest = {
        query_id: 'search123',
        user_id: 'user123',
        query: 'test query',
        source: 'Google Scholar',
        filters: { year: 2023 },
        timestamp: new Date().toISOString(),
        search_title: 'Test Search',
        is_saved: true,
      };
      (prisma.searchRequest.findUnique as any).mockResolvedValue(mockSearchRequest);
      (prisma.searchRequest.delete as any).mockResolvedValue(mockSearchRequest);

      // Create request
      const request = new Request('http://localhost:3000/api/search/search123', {
        method: 'DELETE',
      });

      // Call the API route
      const response = await deleteSearch(request, { params: { id: 'search123' } });
      const responseData = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(requireAuth).toHaveBeenCalled();
      expect(prisma.searchRequest.findUnique).toHaveBeenCalledWith({
        where: {
          query_id: 'search123',
        },
      });
      expect(prisma.searchRequest.delete).toHaveBeenCalledWith({
        where: {
          query_id: 'search123',
        },
      });
    });

    it('should execute a search when authenticated', async () => {
      // Mock session data
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      (requireAuth as any).mockResolvedValue(mockSession);

      // Mock request data
      const requestData = {
        query: 'test query',
        source: 'Google Scholar',
        filters: { year: 2023 },
        search_title: 'Test Search',
        is_saved: false,
      };

      // Mock prisma response
      const mockSearchRequest = {
        query_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user123',
        ...requestData,
        timestamp: new Date().toISOString(),
      };
      (prisma.searchRequest.create as any).mockResolvedValue(mockSearchRequest);

      // Create request
      const request = new Request('http://localhost:3000/api/search/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Call the API route
      const response = await executeSearch(request);
      const responseData = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.searchId).toBe(mockSearchRequest.query_id);
      expect(responseData.data.message).toBe('Search execution started');
      expect(requireAuth).toHaveBeenCalled();
      expect(prisma.searchRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'user123',
          query: 'test query',
          source: 'Google Scholar',
          filters: { year: 2023 },
          search_title: 'Test Search',
          is_saved: false,
        }),
      });
    });
  });
});
