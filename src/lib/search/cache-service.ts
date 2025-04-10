import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { SearchRequest, SearchResponse } from './search-service';
import { SearchResult } from './types';

/**
 * Cache configuration options for the SearchService.
 * Passed via `SearchServiceConfig.cache`.
 */
export interface CacheOptions {
  /** 
   * Time-to-live for cache entries in seconds. 
   * Default: 3600 (1 hour).
   */
  ttl: number; 
  /** 
   * Master switch to enable/disable the cache service.
   * Default: true.
   */
  enabled: boolean;
  /** 
   * Options controlling how a unique cache key (fingerprint) is generated 
   * from a SearchRequest.
   */
  fingerprinting: {
    /** 
     * Ignore case in the search query string.
     * Default: true.
     */
    ignoreCase: boolean;
    /** 
     * Trim whitespace and collapse multiple spaces in the query string.
     * Default: true.
     */
    normalizeWhitespace: boolean;
    /** 
     * Include request filters (fileType, domain, providers) in the fingerprint.
     * If false, requests with the same query but different filters may share cache entries.
     * Default: true.
     */
    includeFilters: boolean;
  };
}

/**
 * Cache stats for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * In-memory cache item
 */
interface CacheItem<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  fingerprint: string;
}

/**
 * Cache service for search results.
 * Provides an in-memory cache layer with optional database persistence 
 * via Prisma for longer-term storage.
 */
export class CacheService {
  private cache: Map<string, CacheItem<SearchResponse['results']>>;
  private prisma: PrismaClient;
  private options: CacheOptions;
  private stats: {
    hits: number;
    misses: number;
  };

  /**
   * Creates an instance of CacheService.
   * 
   * @param prismaClient A PrismaClient instance for database interactions.
   * @param options Optional configuration settings to override defaults. See CacheOptions.
   */
  constructor(prismaClient: PrismaClient, options?: Partial<CacheOptions>) {
    this.prisma = prismaClient;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
    };

    // Define default options
    const defaultOptions: CacheOptions = {
      ttl: 3600, // 1 hour
      enabled: true,
      fingerprinting: {
        ignoreCase: true,
        normalizeWhitespace: true,
        includeFilters: true,
      },
    };
    
    // Merge provided partial options with defaults
    this.options = {
       ...defaultOptions,
       ...options,
       // Deep merge for fingerprinting object
       fingerprinting: {
         ...defaultOptions.fingerprinting,
         ...(options?.fingerprinting || {}),
       },
    };
  }

  /**
   * Generate a fingerprint for a search request
   * This is used to identify identical searches
   */
  generateFingerprint(request: SearchRequest): string {
    let query = request.query;
    
    // Apply fingerprinting options
    if (this.options.fingerprinting.ignoreCase) {
      query = query.toLowerCase();
    }
    
    if (this.options.fingerprinting.normalizeWhitespace) {
      query = query.trim().replace(/\s+/g, ' ');
    }
    
    // Create the object to hash
    const toHash: Record<string, any> = { query };
    
    // Include filters in fingerprint if configured
    if (this.options.fingerprinting.includeFilters) {
      if (request.fileType) toHash.fileType = request.fileType;
      if (request.domain) toHash.domain = request.domain;
      if (request.providers) toHash.providers = [...request.providers].sort();
    }
    
    // Generate the hash
    return createHash('sha256')
      .update(JSON.stringify(toHash))
      .digest('hex');
  }

  /**
   * Check if a cache item is still valid
   */
  private isValid(item: CacheItem<any>): boolean {
    return new Date() < item.expiresAt;
  }

  /**
   * Retrieve cached search results for a given request.
   * Checks in-memory cache first, then the database.
   *
   * @param request The search request.
   * @returns Cached results if found and valid, otherwise null.
   */
  async get(request: SearchRequest): Promise<SearchResponse['results'] | null> {
    if (!this.options.enabled) {
      return null;
    }

    const fingerprint = this.generateFingerprint(request);
    const now = Date.now();

    // 1. Check in-memory cache
    const memoryItem = this.cache.get(fingerprint);
    if (memoryItem && this.isValid(memoryItem)) {
      this.stats.hits++;
      return memoryItem.data;
    } else if (memoryItem) {
      // Expired entry found in memory, remove it
      this.cache.delete(fingerprint);
    }
    
    // 2. Check database cache (if Prisma client is available)
    if (this.prisma) {
      try {
        const dbItem = await this.prisma.cacheEntry.findUnique({
          where: { fingerprint },
        });
        
        if (dbItem && now < dbItem.expiresAt.getTime()) {
          this.stats.hits++;
          const cachedResults = JSON.parse(dbItem.results) as SearchResponse['results'];
          
          // Update in-memory cache with DB data
          this.cache.set(fingerprint, {
            data: cachedResults,
            timestamp: new Date(),
            expiresAt: dbItem.expiresAt,
            fingerprint,
          });
          
          return cachedResults;
        } else if (dbItem) {
          // Expired entry found in DB, remove it asynchronously (optional, could rely on TTL cleanup)
          // Consider adding a cleanup job instead of deleting on miss
          this.prisma.cacheEntry.delete({ where: { fingerprint } }).catch((err: Error) => 
            console.error('Error deleting expired cache entry:', err)
          );
        }
      } catch (error) {
        console.error('Error retrieving from cache database:', error);
        // Continue execution, just with a cache miss
      }
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Store search results in cache
   */
  async set(request: SearchRequest, results: SearchResponse['results']): Promise<void> {
    if (!this.options.enabled || !results || results.length === 0) {
      return;
    }

    const fingerprint = this.generateFingerprint(request);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.options.ttl * 1000);
    
    // Store in memory cache
    this.cache.set(fingerprint, {
      data: results,
      timestamp: now,
      expiresAt: expiresAt,
      fingerprint: fingerprint,
    });
    
    // Store in database cache (if Prisma client is available)
    if (this.prisma) {
      try {
        await this.prisma.cacheEntry.upsert({
          where: { fingerprint },
          update: {
            results: JSON.stringify(results),
            expiresAt: expiresAt,
          },
          create: {
            fingerprint: fingerprint,
            results: JSON.stringify(results),
            expiresAt: expiresAt,
          },
        });
      } catch (error) {
        console.error('Error saving to cache database:', error);
        // Log error but don't block execution
      }
    }
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(fingerprint: string): void {
    this.cache.delete(fingerprint);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired items from the cache
   */
  cleanup(): void {
    const now = new Date();
    
    // Clean memory cache
    for (const [fingerprint, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(fingerprint);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Flattens the results object into a single array.
   * @param results The results object from SearchResponse.
   * @returns A flat array of SearchResult or SearchError objects.
   */
  private flattenSearchResults(results: SearchResponse['results']): any[] {
    if (!results.length) return [];
    
    // Group results by provider
    const resultsByProvider = results.reduce((acc, result) => {
      const provider = result.searchEngine;
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(result);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Convert to SearchResponse format
    return Object.entries(resultsByProvider).map(([provider, providerResults]) => {
      const firstResult = providerResults[0];
      
      return {
        results: providerResults.map(result => ({
          title: result.title || '',
          url: result.url || '',
          snippet: result.snippet || '',
          rank: result.rank,
          resultType: result.resultType || 'organic',
          searchEngine: result.searchEngine,
          device: result.device,
          location: result.location,
          language: result.language,
          timestamp: result.timestamp,
          rawResponse: result.rawResponse,
        })),
        provider: provider as any, // Cast to SearchProviderType
        pagination: {
          totalResults: firstResult.totalResults,
        },
        metadata: {
          searchEngine: provider,
          searchId: firstResult.searchId,
          creditsUsed: firstResult.creditsUsed || 1,
          searchUrl: firstResult.searchUrl,
          timestamp: firstResult.timestamp,
        },
      };
    });
  }

  /**
   * Delete outdated cache entries from the database
   * @param maxAgeInSeconds Maximum age of cache entries to keep
   */
  async cleanupDatabase(maxAgeInSeconds: number = this.options.ttl): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeInSeconds * 1000);
      
      const result = await this.prisma.searchRequest.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
          isSaved: false, // Only delete non-saved searches
        },
      });
      
      return result.count;
    } catch (error) {
      console.error('Error cleaning up cache database:', error);
      return 0;
    }
  }
} 