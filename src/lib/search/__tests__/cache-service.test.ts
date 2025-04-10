import { CacheService, CacheOptions } from '../cache-service';
import { SearchResponse, SearchRequest } from '../search-service';
import { SearchProviderType } from '../factory';
import { PrismaClient } from '@prisma/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Define mock prisma type
type MockPrisma = {
  searchCache: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  searchRequest: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

// Create a mock of PrismaClient
const createMockPrisma = (): MockPrisma => ({
  searchCache: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  searchRequest: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(async (callback) => {
    if (typeof callback === 'function') {
      return callback(createMockPrisma());
    }
    return Promise.all(callback as any[]);
  })
});

// Mock Prisma
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => createMockPrisma())
  };
});

describe('CacheService', () => {
  let cacheService: CacheService;
  let prisma: MockPrisma;
  
  // Sample search request
  const sampleRequest: SearchRequest = {
    query: 'test query',
    providers: [SearchProviderType.SERPER],
    maxResults: 10
  };
  
  // Sample search response
  const sampleResponse: SearchResponse[] = [
    {
      results: [
        {
          title: 'Test Result',
          url: 'https://example.com',
          snippet: 'This is a test result',
          rank: 1,
          searchEngine: 'google',
          timestamp: new Date()
        }
      ],
      provider: SearchProviderType.SERPER,
      metadata: {
        searchEngine: 'google',
        creditsUsed: 1,
        timestamp: new Date()
      }
    }
  ];

  beforeEach(() => {
    // Reset mocks before each test
    prisma = createMockPrisma();
    cacheService = new CacheService(prisma as unknown as PrismaClient, {
      ttl: 60, // 1 minute for testing
      enabled: true
    });
    
    // Reset all mock functions
    vi.clearAllMocks();
  });

  it('should generate consistent fingerprints for identical requests', () => {
    const request1: SearchRequest = {
      query: 'test query',
      providers: [SearchProviderType.SERPER]
    };
    
    const request2: SearchRequest = {
      query: 'test query',
      providers: [SearchProviderType.SERPER]
    };
    
    const fingerprint1 = cacheService.generateFingerprint(request1);
    const fingerprint2 = cacheService.generateFingerprint(request2);
    
    expect(fingerprint1).toBe(fingerprint2);
  });

  it('should generate different fingerprints for different queries', () => {
    const request1: SearchRequest = {
      query: 'test query',
      providers: [SearchProviderType.SERPER]
    };
    
    const request2: SearchRequest = {
      query: 'different query',
      providers: [SearchProviderType.SERPER]
    };
    
    const fingerprint1 = cacheService.generateFingerprint(request1);
    const fingerprint2 = cacheService.generateFingerprint(request2);
    
    expect(fingerprint1).not.toBe(fingerprint2);
  });

  it('should normalize whitespace and case when configured', () => {
    const request1: SearchRequest = {
      query: 'TEST QUERY',
      providers: [SearchProviderType.SERPER]
    };
    
    const request2: SearchRequest = {
      query: 'test   query',
      providers: [SearchProviderType.SERPER]
    };
    
    const fingerprint1 = cacheService.generateFingerprint(request1);
    const fingerprint2 = cacheService.generateFingerprint(request2);
    
    expect(fingerprint1).toBe(fingerprint2);
  });

  it('should store and retrieve from memory cache', async () => {
    // Store in cache
    await cacheService.set(sampleRequest, sampleResponse);
    
    // Retrieve from cache
    const cachedResult = await cacheService.get(sampleRequest);
    
    expect(cachedResult).toEqual(sampleResponse);
  });

  it('should return null for missing cache entries', async () => {
    const result = await cacheService.get({
      query: 'missing query'
    });
    
    expect(result).toBeNull();
  });

  it('should invalidate specific cache entries', async () => {
    // Store in cache
    await cacheService.set(sampleRequest, sampleResponse);
    
    // Get fingerprint
    const fingerprint = cacheService.generateFingerprint(sampleRequest);
    
    // Invalidate entry
    cacheService.invalidate(fingerprint);
    
    // Try to retrieve
    const cachedResult = await cacheService.get(sampleRequest);
    
    expect(cachedResult).toBeNull();
  });

  it('should invalidate all cache entries', async () => {
    // Store multiple entries
    await cacheService.set(sampleRequest, sampleResponse);
    await cacheService.set({ query: 'another query' }, sampleResponse);
    
    // Invalidate all
    cacheService.invalidateAll();
    
    // Try to retrieve
    const cachedResult1 = await cacheService.get(sampleRequest);
    const cachedResult2 = await cacheService.get({ query: 'another query' });
    
    expect(cachedResult1).toBeNull();
    expect(cachedResult2).toBeNull();
  });

  it('should track hit/miss statistics', async () => {
    // Initial stats
    const initialStats = cacheService.getStats();
    expect(initialStats.hits).toBe(0);
    expect(initialStats.misses).toBe(0);
    
    // Miss
    await cacheService.get(sampleRequest);
    let stats = cacheService.getStats();
    expect(stats.misses).toBe(1);
    
    // Store
    await cacheService.set(sampleRequest, sampleResponse);
    
    // Hit
    await cacheService.get(sampleRequest);
    stats = cacheService.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  test('should interact with database for caching when userId is provided', async () => {
    const userId = 'user-123';
    
    // Mock database queries
    prisma.searchRequest.findFirst.mockResolvedValue(null);
    prisma.searchRequest.create.mockResolvedValue({ queryId: 'query-123' } as any);
    
    // Mock transaction to just return the result of the callback
    prisma.$transaction.mockImplementation((callback: any) => {
      // If callback is a function, call it with prisma
      if (typeof callback === 'function') {
        return Promise.resolve(callback(prisma));
      }
      // Otherwise, just resolve with the input (for array case)
      return Promise.resolve(callback);
    });
    
    // Store in cache with userId
    await cacheService.set(sampleRequest, sampleResponse, userId);
    
    // Verify db was called
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.searchRequest.create).toHaveBeenCalled();
    
    // Setup mock for db retrieval
    const mockDbResult = {
      queryId: 'query-123',
      userId,
      query: sampleRequest.query,
      timestamp: new Date(),
      searchResults: [
        {
          id: 'result-123',
          title: 'Test Result',
          url: 'https://example.com',
          snippet: 'This is a test result',
          searchEngine: 'google',
          timestamp: new Date()
        }
      ]
    };
    
    prisma.searchRequest.findFirst.mockResolvedValue(mockDbResult as any);
    
    // Retrieve from cache with userId
    await cacheService.get(sampleRequest, userId);
    
    // Verify db was queried
    expect(prisma.searchRequest.findFirst).toHaveBeenCalled();
  });

  test('should clean up database entries', async () => {
    // Mock database delete
    prisma.searchRequest.deleteMany.mockResolvedValue({ count: 5 });
    
    // Clean up database
    const deletedCount = await cacheService.cleanupDatabase(60);
    
    // Verify db was called with correct date
    expect(prisma.searchRequest.deleteMany).toHaveBeenCalled();
    expect(deletedCount).toBe(5);
  });
}); 