import { SearchResult as BaseSearchResult } from '../types';
import { 
  EnrichmentPipeline 
} from './enrichment-pipeline';
import { 
  EnrichmentModule, 
  PipelineOptions, 
  PipelineResult, 
  SortingOptions 
} from './types';

/**
 * Complete pipeline for result processing, including filtering,
 * enrichment, and sorting.
 */
export class ResultPipeline {
  private enrichmentPipeline: EnrichmentPipeline;
  private enableEnrichment: boolean = false; // Keep this disabled
  private enableSorting: boolean = true;

  constructor(options?: PipelineOptions) {
    this.enrichmentPipeline = new EnrichmentPipeline(options);
  }

  /**
   * Process search results through the complete pipeline
   */
  async process(
    results: BaseSearchResult[],
    filterSetId?: string,
    sortingOptions?: SortingOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const originalCount = results.length;

    let filteredResults = results;

    let enrichedResults = filteredResults;
    let enrichmentResult = null;

    if (this.enableEnrichment) {
      enrichmentResult = await this.enrichmentPipeline.process(filteredResults);
      enrichedResults = enrichmentResult.results;
    }

    let sortedResults = enrichedResults;

    if (this.enableSorting && sortingOptions) {
      sortedResults = this.sortResults(enrichedResults, sortingOptions);
    }

    return {
      results: sortedResults,
      originalCount,
      filteredCount: originalCount,
      enrichedCount: enrichmentResult ? enrichmentResult.metrics.totalEnriched : 0,
      filterStats: undefined,
      enrichmentMetrics: enrichmentResult ? enrichmentResult.metrics : undefined,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Sort results based on provided options
   */
  private sortResults(results: BaseSearchResult[], options: SortingOptions): BaseSearchResult[] {
    return [...results].sort((a, b) => {
      const aValue = this.getFieldValue(a, options.field);
      const bValue = this.getFieldValue(b, options.field);
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return options.direction === 'asc' ? 1 : -1;
      if (bValue == null) return options.direction === 'asc' ? -1 : 1;
      
      let comparison = 0;
      
      switch (options.type || this.detectFieldType(aValue)) {
        case 'number':
          comparison = (aValue as number) - (bValue as number);
          break;
          
        case 'date':
          comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
          break;
          
        case 'string':
        default:
          comparison = String(aValue).localeCompare(String(bValue));
          break;
      }
      
      return options.direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Get a field value from a search result, supports nested fields with dot notation
   */
  private getFieldValue(result: BaseSearchResult, field: string): any {
    const parts = field.split('.');
    let value: any = result;
    
    for (const part of parts) {
      if (value == null || typeof value !== 'object') {
        return undefined;
      }
      
      value = value[part];
    }
    
    return value;
  }

  /**
   * Detect the type of a field value
   */
  private detectFieldType(value: any): 'string' | 'number' | 'date' {
    if (typeof value === 'number') {
      return 'number';
    }
    
    if (value instanceof Date) {
      return 'date';
    }
    
    if (typeof value === 'string') {
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}|T|Z/)) {
        return 'date';
      }
      
      if (!isNaN(Number(value)) && value.trim() !== '') {
        return 'number';
      }
    }
    
    return 'string';
  }

  /**
   * Register an enrichment module
   */
  registerEnrichmentModule(module: EnrichmentModule, position?: number): void {
    this.enrichmentPipeline.registerModule(module, position);
  }

  /**
   * Remove an enrichment module
   */
  removeEnrichmentModule(moduleId: string): boolean {
    return this.enrichmentPipeline.removeModule(moduleId);
  }

  /**
   * Get an enrichment module by ID
   */
  getEnrichmentModule(moduleId: string): EnrichmentModule | undefined {
    return this.enrichmentPipeline.getModule(moduleId);
  }

  /**
   * Get all enrichment modules
   */
  getAllEnrichmentModules(): EnrichmentModule[] {
    return this.enrichmentPipeline.getAllModules();
  }

  /**
   * Enable or disable enrichment
   */
  setEnrichmentEnabled(enabled: boolean): void {
    this.enableEnrichment = enabled;
  }

  /**
   * Enable or disable sorting
   */
  setSortingEnabled(enabled: boolean): void {
    this.enableSorting = enabled;
  }

  /**
   * Get the enrichment pipeline
   */
  getEnrichmentPipeline(): EnrichmentPipeline {
    return this.enrichmentPipeline;
  }
} 