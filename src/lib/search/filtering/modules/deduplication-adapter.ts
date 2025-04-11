import { SearchResult as BaseSearchResult } from '../../types';
import { EnrichmentModule } from '../types';
import { DeduplicationService, DeduplicationOptions } from '../../deduplication';
import { convertSearchResult, SearchResultTypeMap } from '../../common-types';

/**
 * Adapter that integrates the DeduplicationService with the EnrichmentModule interface
 */
export class DeduplicationAdapter implements EnrichmentModule {
  readonly id: string = 'deduplication';
  readonly name: string = 'Deduplication';
  readonly description: string = 'Removes duplicate search results based on URL and title similarity';
  readonly enabled: boolean = true;

  private deduplicationService: DeduplicationService;
  private preserveMetadata: boolean = true;

  /**
   * Create a new DeduplicationAdapter
   * @param service An instance of DeduplicationService to use.
   * @param preserveMetadata Whether to include detailed duplicate info in result metadata
   */
  constructor(
    service: DeduplicationService,
    preserveMetadata?: boolean
  ) {
    this.deduplicationService = service;
    if (preserveMetadata !== undefined) {
      this.preserveMetadata = preserveMetadata;
    }
  }

  /**
   * Process a batch of search results
   */
  async processBatch(results: BaseSearchResult[]): Promise<BaseSearchResult[]> {
    if (results.length <= 1) {
      // Add default metadata even if deduplication is skipped
      return results.map(result => ({
        ...result,
        metadata: {
          ...result.metadata,
          deduplication: {
            timestamp: new Date(),
            originalCount: results.length,
            uniqueCount: results.length,
            duplicatesRemoved: 0
          }
        }
      }));
    }

    // Convert BaseSearchResult to DeduplicationSearchResult using the utility function
    const deduplicationResults = results.map(result => {
      const converted = convertSearchResult<BaseSearchResult, BaseSearchResult>(
        result, 
        SearchResultTypeMap.apiToDeduplication
      );
      
      // Store reference to original result for later
      const deduplicationResult = {
        ...converted,
        originalResult: result
      };
      
      return deduplicationResult;
    });

    // Perform deduplication
    const deduplicationResult = this.deduplicationService.deduplicate(deduplicationResults);

    // Map back to original BaseSearchResult format with added metadata
    const uniqueResults: BaseSearchResult[] = deduplicationResult.results.map((result: any) => {
      const originalResult = result.originalResult as BaseSearchResult;
      
      return {
        ...originalResult,
        metadata: {
          ...originalResult.metadata,
          deduplication: {
            timestamp: new Date(),
            originalCount: results.length,
            uniqueCount: deduplicationResult.results.length,
            duplicatesRemoved: deduplicationResult.duplicatesRemoved,
            // Include duplicate groups if configured
            ...(this.preserveMetadata && {
              duplicateGroups: deduplicationResult.duplicateGroups.map((group: any) => ({
                original: group.original.url,
                duplicates: group.duplicates.map((d: any) => d.url)
              }))
            })
          }
        }
      };
    });

    return uniqueResults;
  }

  /**
   * Process a single search result
   * Note: Single-result processing doesn't make sense for deduplication
   */
  async process(result: BaseSearchResult): Promise<BaseSearchResult> {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        deduplication: {
          timestamp: new Date(),
          originalCount: 1,
          uniqueCount: 1,
          duplicatesRemoved: 0
        }
      }
    };
  }

  /**
   * Get module configuration
   */
  getConfig(): Record<string, any> {
    return {
      ...this.deduplicationService.getOptions(),
      preserveMetadata: this.preserveMetadata
    };
  }

  /**
   * Update module configuration
   */
  updateConfig(config: Record<string, any>): void {
    if (config.preserveMetadata !== undefined) {
      this.preserveMetadata = config.preserveMetadata;
    }

    // Forward relevant options to the deduplication service
    const deduplicationOptions: Partial<DeduplicationOptions> = {};
    
    if (config.threshold !== undefined) deduplicationOptions.threshold = config.threshold;
    if (config.enableUrlNormalization !== undefined) deduplicationOptions.enableUrlNormalization = config.enableUrlNormalization;
    if (config.enableTitleMatching !== undefined) deduplicationOptions.enableTitleMatching = config.enableTitleMatching;
    if (config.logDuplicates !== undefined) deduplicationOptions.logDuplicates = config.logDuplicates;
    if (config.treatSubdomainsAsSame !== undefined) deduplicationOptions.treatSubdomainsAsSame = config.treatSubdomainsAsSame;
    if (config.ignoreProtocol !== undefined) deduplicationOptions.ignoreProtocol = config.ignoreProtocol;
    if (config.ignoreWww !== undefined) deduplicationOptions.ignoreWww = config.ignoreWww;
    if (config.ignoreTrailingSlash !== undefined) deduplicationOptions.ignoreTrailingSlash = config.ignoreTrailingSlash;
    if (config.ignoreQueryParams !== undefined) deduplicationOptions.ignoreQueryParams = config.ignoreQueryParams;
    if (config.ignoreCaseInPath !== undefined) deduplicationOptions.ignoreCaseInPath = config.ignoreCaseInPath;
    if (config.mergeStrategy !== undefined) deduplicationOptions.mergeStrategy = config.mergeStrategy;
    if (config.enableMerging !== undefined) deduplicationOptions.enableMerging = config.enableMerging;
    
    this.deduplicationService.updateOptions(deduplicationOptions);
  }
} 