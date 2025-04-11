import { CacheService, CacheOptions } from '../cache-service';
import { SearchResponse, SearchRequest } from '../types';
import { SearchProviderType } from '../factory';
import { PrismaClient } from '@prisma/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Define mock prisma type
type MockPrisma = {
  cacheEntry: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction?: ReturnType<typeof vi.fn>;
};

// Create a mock of PrismaClient
const createMockPrisma = (): MockPrisma => ({
  cacheEntry: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
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
    vi.resetAllMocks();
    prisma = createMockPrisma();
    
    cacheService = new CacheService(prisma as any, {
      ttl: 60,
      enabled: true
    });
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
    await cacheService.set(sampleRequest, sampleResponse);
    
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
    await cacheService.set(sampleRequest, sampleResponse);
    
    const fingerprint = cacheService.generateFingerprint(sampleRequest);
    
    cacheService.invalidate(fingerprint);
    
    const cachedResult = await cacheService.get(sampleRequest);
    
    expect(cachedResult).toBeNull();
  });

  it('should invalidate all cache entries', async () => {
    await cacheService.set(sampleRequest, sampleResponse);
    await cacheService.set({ query: 'another query' }, sampleResponse);
    
    cacheService.invalidateAll();
    
    const cachedResult1 = await cacheService.get(sampleRequest);
    const cachedResult2 = await cacheService.get({ query: 'another query' });
    
    expect(cachedResult1).toBeNull();
    expect(cachedResult2).toBeNull();
  });

  it('should track hit/miss statistics', async () => {
    const initialStats = cacheService.getStats();
    expect(initialStats.hits).toBe(0);
    expect(initialStats.misses).toBe(0);
    
    await cacheService.get(sampleRequest);
    let stats = cacheService.getStats();
    expect(stats.misses).toBe(1);
    
    await cacheService.set(sampleRequest, sampleResponse);
    
    await cacheService.get(sampleRequest);
    stats = cacheService.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  test('should interact with cacheEntry table in database', async () => {
    prisma.cacheEntry.findUnique.mockResolvedValue(null);
    prisma.cacheEntry.upsert.mockResolvedValue({ 
        fingerprint: 'test-fingerprint', 
        results: '[]', 
        expiresAt: new Date() 
    } as any);
    
    await cacheService.set(sampleRequest, sampleResponse);
    
    expect(prisma.cacheEntry.upsert).toHaveBeenCalled();
    const upsertArgs = prisma.cacheEntry.upsert.mock.calls[0][0];
    expect(upsertArgs.where.fingerprint).toBeDefined();
    expect(upsertArgs.create.results).toEqual(JSON.stringify(sampleResponse));
    expect(upsertArgs.update.results).toEqual(JSON.stringify(sampleResponse));

    const fingerprint = cacheService.generateFingerprint(sampleRequest);
    const mockDbResult = {
      fingerprint: fingerprint,
      results: JSON.stringify(sampleResponse),
      expiresAt: new Date(Date.now() + 60000),
    };
    
    prisma.cacheEntry.findUnique.mockResolvedValue(mockDbResult as any);
    
    const result = await cacheService.get(sampleRequest);
    
    expect(prisma.cacheEntry.findUnique).toHaveBeenCalled();
    const findArgs = prisma.cacheEntry.findUnique.mock.calls[0][0];
    expect(findArgs.where.fingerprint).toBe(fingerprint);
    
    expect(result).toEqual(sampleResponse);
  });

  test('should clean up database entries', async () => {
    prisma.cacheEntry.deleteMany.mockResolvedValue({ count: 5 });
    
    const deletedCount = await cacheService.cleanupDatabase(60);
    
    expect(prisma.cacheEntry.deleteMany).toHaveBeenCalled();
    const deleteArgs = prisma.cacheEntry.deleteMany.mock.calls[0][0];
    expect(deleteArgs.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(deletedCount).toBe(5);
  });
}); 