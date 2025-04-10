import { SearchResult as BaseSearchResult } from '../types';
import { 
  FilterService,
} from './filter-service';
import { 
  EnrichmentPipeline 
} from './enrichment-pipeline';
import { 
  FilterRuleUnion, 
  FilterSet, 
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
  private filterService: FilterService;
  private enrichmentPipeline: EnrichmentPipeline;
  private enableFiltering: boolean = true;
  private enableEnrichment: boolean = true;
  private enableSorting: boolean = true;

  constructor(options?: PipelineOptions) {
    this.filterService = new FilterService();
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

    // Step 1: Apply filters if enabled
    let filteredResults = results;
    let filterResult = null;

    if (this.enableFiltering && filterSetId) {
      filterResult = this.filterService.applyFilterSet(filterSetId, results);
      filteredResults = filterResult.filtered;
    }

    // Step 2: Apply enrichment if enabled
    let enrichedResults = filteredResults;
    let enrichmentResult = null;

    if (this.enableEnrichment) {
      enrichmentResult = await this.enrichmentPipeline.process(filteredResults);
      enrichedResults = enrichmentResult.results;
    }

    // Step 3: Sort results if enabled
    let sortedResults = enrichedResults;

    if (this.enableSorting && sortingOptions) {
      sortedResults = this.sortResults(enrichedResults, sortingOptions);
    }

    // Create the final result
    return {
      results: sortedResults,
      originalCount,
      filteredCount: filterResult ? filterResult.stats.totalIncluded : originalCount,
      enrichedCount: enrichmentResult ? enrichmentResult.metrics.totalEnriched : 0,
      filterStats: filterResult ? filterResult.stats : undefined,
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
      
      // Handle undefined/null values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return options.direction === 'asc' ? 1 : -1;
      if (bValue == null) return options.direction === 'asc' ? -1 : 1;
      
      // Determine comparison based on field type
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
      // Check if it's a valid date string
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}|T|Z/)) {
        return 'date';
      }
      
      // Check if it's a numeric string
      if (!isNaN(Number(value)) && value.trim() !== '') {
        return 'number';
      }
    }
    
    return 'string';
  }

  /**
   * Add a filter set
   */
  addFilterSet(filterSet: FilterSet): void {
    this.filterService.addFilterSet(filterSet);
  }

  /**
   * Get a filter set by ID
   */
  getFilterSet(id: string): FilterSet | undefined {
    return this.filterService.getFilterSet(id);
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
   * Enable or disable filtering
   */
  setFilteringEnabled(enabled: boolean): void {
    this.enableFiltering = enabled;
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
   * Get the filter service
   */
  getFilterService(): FilterService {
    return this.filterService;
  }

  /**
   * Get the enrichment pipeline
   */
  getEnrichmentPipeline(): EnrichmentPipeline {
    return this.enrichmentPipeline;
  }

  /**
   * Create a domain block filter rule
   */
  createDomainBlockRule(
    id: string,
    name: string,
    domains: string[],
    matchSubdomains: boolean = true
  ): FilterRuleUnion {
    return FilterService.createDomainBlockRule(id, name, domains, matchSubdomains);
  }

  /**
   * Create a domain allow filter rule
   */
  createDomainAllowRule(
    id: string,
    name: string,
    domains: string[],
    matchSubdomains: boolean = true
  ): FilterRuleUnion {
    return FilterService.createDomainAllowRule(id, name, domains, matchSubdomains);
  }

  /**
   * Create a keyword block filter rule
   */
  createKeywordBlockRule(
    id: string,
    name: string,
    keywords: string[],
    fields: Array<'title' | 'snippet' | 'url'> = ['title', 'snippet'],
    matchStrategy: 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'regex' = 'contains',
    caseSensitive: boolean = false
  ): FilterRuleUnion {
    return FilterService.createKeywordBlockRule(
      id, name, keywords, fields, matchStrategy as any, caseSensitive
    );
  }

  /**
   * Create a keyword require filter rule
   */
  createKeywordRequireRule(
    id: string,
    name: string,
    keywords: string[],
    fields: Array<'title' | 'snippet' | 'url'> = ['title', 'snippet'],
    matchStrategy: 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'regex' = 'contains',
    caseSensitive: boolean = false
  ): FilterRuleUnion {
    return FilterService.createKeywordRequireRule(
      id, name, keywords, fields, matchStrategy as any, caseSensitive
    );
  }

  /**
   * Create a new filter set
   */
  createFilterSet(
    id: string,
    name: string,
    rules: FilterRuleUnion[] = [],
    description?: string
  ): FilterSet {
    return FilterService.createFilterSet(id, name, rules, description);
  }
} 