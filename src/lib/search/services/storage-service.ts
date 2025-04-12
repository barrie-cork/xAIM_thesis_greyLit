import { PrismaClient, SearchResult, RawSearchResult, DuplicateRelationship, SearchResultStatus } from '@prisma/client';
import { SearchRequest } from '../types';

/**
 * StorageService is responsible for all database operations related to search results
 */
export class StorageService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Save raw search results to the database
   * @param searchRequestId The ID of the search request
   * @param results The raw search results to save
   * @returns The saved raw search results
   */
  async saveRawResults(
    searchRequestId: string,
    results: Array<{
      title: string;
      url: string;
      source: string;
      metadata?: any;
    }>
  ): Promise<RawSearchResult[]> {
    // Create an array of raw search results to insert
    const rawResults = results.map(result => ({
      searchRequestId,
      title: result.title,
      url: result.url,
      source: result.source,
      metadata: result.metadata || {}
    }));

    // Use a transaction to ensure all results are saved
    return this.prisma.$transaction(
      rawResults.map(result => 
        this.prisma.rawSearchResult.create({
          data: result
        })
      )
    );
  }

  /**
   * Get raw search results for a search request
   * @param searchRequestId The ID of the search request
   * @returns The raw search results
   */
  async getRawResults(searchRequestId: string): Promise<RawSearchResult[]> {
    return this.prisma.rawSearchResult.findMany({
      where: {
        searchRequestId
      }
    });
  }

  /**
   * Save processed search results to the database
   * @param searchRequestId The ID of the search request
   * @param results The processed search results to save
   * @returns The saved search results
   */
  async saveProcessedResults(
    searchRequestId: string,
    results: Array<{
      title?: string;
      url?: string;
      snippet?: string;
      rank?: number;
      resultType?: string;
      searchEngine?: string;
      rawResponse?: any;
      status?: SearchResultStatus;
    }>
  ): Promise<SearchResult[]> {
    // Create an array of search results to insert
    const searchResults = results.map(result => ({
      queryId: searchRequestId,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      rank: result.rank,
      resultType: result.resultType,
      searchEngine: result.searchEngine,
      rawResponse: result.rawResponse || {},
      status: result.status || SearchResultStatus.processed
    }));

    // Use a transaction to ensure all results are saved
    return this.prisma.$transaction(
      searchResults.map(result => 
        this.prisma.searchResult.create({
          data: result
        })
      )
    );
  }

  /**
   * Mark search results as duplicates
   * @param originalResultId The ID of the original result
   * @param duplicateResultIds The IDs of the duplicate results
   * @param confidenceScores Optional confidence scores for each duplicate
   * @returns The created duplicate relationships
   */
  async markDuplicates(
    originalResultId: string,
    duplicateResultIds: string[],
    confidenceScores?: number[]
  ): Promise<DuplicateRelationship[]> {
    // Update the status of duplicate results
    await this.prisma.searchResult.updateMany({
      where: {
        id: {
          in: duplicateResultIds
        }
      },
      data: {
        status: SearchResultStatus.duplicate,
        duplicateOfId: originalResultId
      }
    });

    // Create duplicate relationships
    const relationships = duplicateResultIds.map((duplicateId, index) => ({
      originalResultId,
      duplicateResultId: duplicateId,
      confidenceScore: confidenceScores ? confidenceScores[index] : undefined
    }));

    // Use a transaction to ensure all relationships are created
    return this.prisma.$transaction(
      relationships.map(relationship => 
        this.prisma.duplicateRelationship.create({
          data: relationship
        })
      )
    );
  }

  /**
   * Get all search results for a search request
   * @param searchRequestId The ID of the search request
   * @param includeRaw Whether to include raw results
   * @param includeDuplicates Whether to include duplicate results
   * @returns The search results
   */
  async getSearchResults(
    searchRequestId: string,
    includeRaw: boolean = false,
    includeDuplicates: boolean = false
  ): Promise<SearchResult[]> {
    return this.prisma.searchResult.findMany({
      where: {
        queryId: searchRequestId,
        status: includeDuplicates 
          ? undefined 
          : {
              not: SearchResultStatus.duplicate
            }
      },
      include: {
        duplicateOf: includeDuplicates,
        duplicates: includeDuplicates,
        originalInDuplicateRelationships: includeDuplicates,
        duplicateInDuplicateRelationships: includeDuplicates
      }
    });
  }

  /**
   * Get duplicate relationships for a search result
   * @param resultId The ID of the search result
   * @returns The duplicate relationships
   */
  async getDuplicateRelationships(resultId: string): Promise<DuplicateRelationship[]> {
    return this.prisma.duplicateRelationship.findMany({
      where: {
        OR: [
          { originalResultId: resultId },
          { duplicateResultId: resultId }
        ]
      },
      include: {
        originalResult: true,
        duplicateResult: true
      }
    });
  }

  /**
   * Create a new search request
   * @param userId The ID of the user
   * @param query The search query
   * @param source The search source
   * @param filters Optional filters
   * @returns The created search request
   */
  async createSearchRequest(
    userId: string,
    query: string,
    source: string,
    filters?: any
  ): Promise<{ queryId: string }> {
    const result = await this.prisma.searchRequest.create({
      data: {
        userId,
        query,
        source,
        filters: filters || {}
      },
      select: {
        queryId: true
      }
    });

    return result;
  }
}
