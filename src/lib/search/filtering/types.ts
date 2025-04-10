import { SearchResult as BaseSearchResult } from '../types';

/**
 * Filter rule types
 */
export enum FilterRuleType {
  DOMAIN_BLOCK = 'domain_block',
  DOMAIN_ALLOW = 'domain_allow',
  KEYWORD_BLOCK = 'keyword_block',
  KEYWORD_REQUIRE = 'keyword_require',
  URL_PATTERN = 'url_pattern',
  FILE_TYPE = 'file_type',
  CUSTOM = 'custom'
}

/**
 * Operator types for combining filter conditions
 */
export enum FilterOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
  IN = 'in',
  NOT_IN = 'not_in',
}

/**
 * Matching strategy for text-based filters
 */
export enum MatchStrategy {
  EXACT = 'exact',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX = 'regex'
}

/**
 * Base filter rule interface
 */
export interface FilterRule {
  id: string;
  type: FilterRuleType;
  name: string;
  enabled: boolean;
}

/**
 * Domain filter rule
 */
export interface DomainFilterRule extends FilterRule {
  type: FilterRuleType.DOMAIN_BLOCK | FilterRuleType.DOMAIN_ALLOW;
  domains: string[];
  matchSubdomains?: boolean;
}

/**
 * Keyword filter rule
 */
export interface KeywordFilterRule extends FilterRule {
  type: FilterRuleType.KEYWORD_BLOCK | FilterRuleType.KEYWORD_REQUIRE;
  keywords: string[];
  matchStrategy: MatchStrategy;
  caseSensitive?: boolean;
  fields: Array<'title' | 'snippet' | 'url'>;
}

/**
 * URL pattern filter rule
 */
export interface UrlPatternFilterRule extends FilterRule {
  type: FilterRuleType.URL_PATTERN;
  patterns: string[];
  matchStrategy: MatchStrategy;
}

/**
 * File type filter rule
 */
export interface FileTypeFilterRule extends FilterRule {
  type: FilterRuleType.FILE_TYPE;
  fileTypes: string[];
  matchStrategy: MatchStrategy.EXACT | MatchStrategy.ENDS_WITH;
}

/**
 * Custom filter rule with callback function
 */
export interface CustomFilterRule extends FilterRule {
  type: FilterRuleType.CUSTOM;
  filterFn: (result: BaseSearchResult) => boolean;
}

/**
 * Composite filter rule that combines multiple rules
 */
export interface CompositeFilterRule extends FilterRule {
  operator: FilterOperator;
  rules: FilterRule[];
}

/**
 * Union type of all possible filter rules
 */
export type FilterRuleUnion = 
  | DomainFilterRule
  | KeywordFilterRule
  | UrlPatternFilterRule
  | FileTypeFilterRule
  | CustomFilterRule
  | CompositeFilterRule;

/**
 * Filter set containing multiple filter rules
 */
export interface FilterSet {
  id: string;
  name: string;
  description?: string;
  filters: FilterConfig[];
  junction: FilterJunction;
  enabled: boolean;
}

/**
 * Filter result
 */
export interface FilterResult {
  filtered: BaseSearchResult[];
  excluded: BaseSearchResult[];
  stats: {
    totalProcessed: number;
    totalIncluded: number;
    totalExcluded: number;
    ruleStats: Record<string, {
      ruleId: string;
      ruleName: string;
      matches: number;
    }>;
  };
}

/**
 * Enrichment module interface
 */
export interface EnrichmentModule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  
  /**
   * Process a search result and return the enriched version
   */
  process(result: BaseSearchResult): Promise<BaseSearchResult>;
  
  /**
   * Process multiple search results in batch
   * Default implementation processes them sequentially
   */
  processBatch?(results: BaseSearchResult[]): Promise<BaseSearchResult[]>;
  
  /**
   * Get module configuration
   */
  getConfig(): Record<string, any>;
  
  /**
   * Update module configuration
   */
  updateConfig(config: Record<string, any>): void;
}

/**
 * Enrichment pipeline result
 */
export interface EnrichmentResult {
  results: BaseSearchResult[];
  metrics: {
    totalProcessed: number;
    totalEnriched: number;
    moduleMetrics: Record<string, {
      moduleId: string;
      moduleName: string;
      processingTimeMs: number;
      itemsProcessed: number;
    }>;
  };
}

/**
 * Pipeline options
 */
export interface PipelineOptions {
  parallelProcessing?: boolean;
  maxConcurrent?: number;
  timeoutMs?: number;
  measurePerformance?: boolean;
}

/**
 * Sorting options for results
 */
export interface SortingOptions {
  field: string;
  direction: 'asc' | 'desc';
  type?: 'string' | 'number' | 'date';
}

/**
 * Complete pipeline processing result
 */
export interface PipelineResult {
  results: BaseSearchResult[];
  originalCount: number;
  filteredCount: number;
  enrichedCount: number;
  filterStats?: FilterResult['stats'];
  enrichmentMetrics?: EnrichmentResult['metrics'];
  processingTimeMs: number;
}

/**
 * Interface for filter configuration
 */
export interface FilterConfig {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  enabled: boolean;
}

/**
 * Junction types for filters in a set
 */
export enum FilterJunction {
  AND = 'and',
  OR = 'or',
}

/**
 * Field types for filtering and sorting
 */
export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Sort directions
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: SortDirection;
}

/**
 * Extended search result with enrichment data
 * BaseSearchResult already includes metadata?: Record<string, any>
 * This interface extends the base SearchResult type imported from ../types.ts
 * and serves as the output type for enrichment processes. Any additional
 * enrichment data should be added to the metadata field.
 */
export interface EnrichedSearchResult extends BaseSearchResult {
  // No need to redeclare metadata as it's already in BaseSearchResult
} 