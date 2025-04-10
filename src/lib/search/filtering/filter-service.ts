import { SearchResult as BaseSearchResult } from '../types';
import { 
  FilterRule, 
  FilterRuleType, 
  FilterRuleUnion, 
  FilterResult, 
  DomainFilterRule,
  KeywordFilterRule,
  UrlPatternFilterRule,
  FileTypeFilterRule,
  CustomFilterRule,
  CompositeFilterRule,
  FilterOperator,
  MatchStrategy,
  FilterSet,
  FilterJunction,
  FilterConfig
} from './types';

/**
 * Service for applying filters to search results
 */
export class FilterService {
  private filterSets: Map<string, FilterSet>;

  constructor() {
    this.filterSets = new Map();
  }

  /**
   * Add or update a filter set
   */
  addFilterSet(filterSet: FilterSet): void {
    this.filterSets.set(filterSet.id, filterSet);
  }

  /**
   * Get a filter set by ID
   */
  getFilterSet(id: string): FilterSet | undefined {
    return this.filterSets.get(id);
  }

  /**
   * Remove a filter set
   */
  removeFilterSet(id: string): boolean {
    return this.filterSets.delete(id);
  }

  /**
   * Get all filter sets
   */
  getAllFilterSets(): FilterSet[] {
    return Array.from(this.filterSets.values());
  }

  /**
   * Apply a filter set to search results.
   * NOTE: This method currently bypasses the `FilterConfig[]` within the FilterSet 
   * due to the incomplete `convertConfigsToRules` function. It relies on the `applyFilters` 
   * method expecting specific `FilterRuleUnion[]` objects (like those created by static helpers).
   * The `filters` array within the passed FilterSet is effectively ignored by the current logic.
   * 
   * @param filterSetId The ID of the FilterSet to apply.
   * @param results The array of BaseSearchResult to filter.
   * @returns A FilterResult object with filtered/excluded results and stats.
   */
  applyFilterSet(filterSetId: string, results: BaseSearchResult[]): FilterResult {
    const filterSet = this.filterSets.get(filterSetId);
    
    if (!filterSet || !filterSet.enabled) {
      return {
        filtered: [...results],
        excluded: [],
        stats: {
          totalProcessed: results.length,
          totalIncluded: results.length,
          totalExcluded: 0,
          ruleStats: {}
        }
      };
    }

    // TODO: Implement conversion from FilterSet.filters (FilterConfig[]) to FilterRuleUnion[]
    // The current implementation effectively ignores filterSet.filters
    const filterRules = this.convertConfigsToRules(filterSet.filters);
    
    // If conversion is not implemented, applyFilters will receive an empty array 
    // unless rules are manually added/managed elsewhere. 
    // For robust behavior, FilterSet should perhaps hold FilterRuleUnion[] directly,
    // or this conversion must be completed.
    // Temporarily returning unfiltered if conversion yields nothing to avoid unexpected behavior.
    if (filterRules.length === 0) {
        console.warn(`FilterSet '${filterSetId}' applied, but no FilterRules were generated/found. FilterConfig conversion might be incomplete. Returning unfiltered results.`);
        return {
            filtered: [...results],
            excluded: [],
            stats: { totalProcessed: results.length, totalIncluded: results.length, totalExcluded: 0, ruleStats: {} }
        };
    }

    // Pass the potentially empty or converted rules to applyFilters
    return this.applyFilters(filterRules, results);
  }

  /**
   * Convert FilterConfig[] to FilterRuleUnion[]
   * Placeholder - Needs implementation to translate generic configs to specific rule types.
   */
  private convertConfigsToRules(configs: FilterConfig[]): FilterRuleUnion[] {
    // TODO: Implement the actual conversion logic here.
    // This should iterate through configs and create appropriate 
    // DomainFilterRule, KeywordFilterRule, etc. based on field, operator, value.
    console.warn('FilterService: convertConfigsToRules() is not implemented. FilterSet configurations are currently ignored by applyFilterSet.');
    return []; // Return empty array until implemented
  }

  /**
   * Apply an array of specific filter rules (FilterRuleUnion) to search results.
   * Note: This method expects specific rule types (DomainFilterRule, KeywordFilterRule, etc.), 
   * not the generic FilterConfig.
   */
  applyFilters(rules: FilterRuleUnion[], results: BaseSearchResult[]): FilterResult {
    const enabledRules = rules.filter(rule => rule.enabled);
    
    if (enabledRules.length === 0) {
      return {
        filtered: [...results],
        excluded: [],
        stats: {
          totalProcessed: results.length,
          totalIncluded: results.length,
          totalExcluded: 0,
          ruleStats: {}
        }
      };
    }

    // Track rule matches for stats
    const ruleMatches: Record<string, number> = {};
    const excluded: BaseSearchResult[] = [];
    const filtered: BaseSearchResult[] = [];

    // Initialize rule match counts
    enabledRules.forEach(rule => {
      ruleMatches[rule.id] = 0;
    });

    // Apply each rule to each result
    for (const result of results) {
      let shouldExclude = false;

      for (const rule of enabledRules) {
        const matches = this.applyRule(rule, result);
        
        if (matches) {
          ruleMatches[rule.id] = (ruleMatches[rule.id] || 0) + 1;
          
          // Handle require vs block rules
          if (
            rule.type === FilterRuleType.DOMAIN_BLOCK ||
            rule.type === FilterRuleType.KEYWORD_BLOCK ||
            (rule.type === FilterRuleType.CUSTOM && matches)
          ) {
            shouldExclude = true;
            break;
          }
        } else if (
          rule.type === FilterRuleType.DOMAIN_ALLOW ||
          rule.type === FilterRuleType.KEYWORD_REQUIRE
        ) {
          // If a require rule doesn't match, exclude the result
          shouldExclude = true;
          break;
        }
      }

      if (shouldExclude) {
        excluded.push(result);
      } else {
        filtered.push(result);
      }
    }

    // Build rule statistics
    const ruleStats: FilterResult['stats']['ruleStats'] = {};
    enabledRules.forEach(rule => {
      ruleStats[rule.id] = {
        ruleId: rule.id,
        ruleName: rule.name,
        matches: ruleMatches[rule.id] || 0
      };
    });

    return {
      filtered,
      excluded,
      stats: {
        totalProcessed: results.length,
        totalIncluded: filtered.length,
        totalExcluded: excluded.length,
        ruleStats
      }
    };
  }

  /**
   * Apply a single filter rule (specific type) to a search result.
   * ...
   */
  private applyRule(rule: FilterRuleUnion, result: BaseSearchResult): boolean {
    switch (rule.type) {
      case FilterRuleType.DOMAIN_BLOCK:
      case FilterRuleType.DOMAIN_ALLOW:
        return this.applyDomainRule(rule as DomainFilterRule, result);
      
      case FilterRuleType.KEYWORD_BLOCK:
      case FilterRuleType.KEYWORD_REQUIRE:
        return this.applyKeywordRule(rule as KeywordFilterRule, result);
      
      case FilterRuleType.URL_PATTERN:
        return this.applyUrlPatternRule(rule as UrlPatternFilterRule, result);
      
      case FilterRuleType.FILE_TYPE:
        return this.applyFileTypeRule(rule as FileTypeFilterRule, result);
      
      case FilterRuleType.CUSTOM:
        return this.applyCustomRule(rule as CustomFilterRule, result);
      
      default:
        if ('operator' in rule && 'rules' in rule) {
          return this.applyCompositeRule(rule as CompositeFilterRule, result);
        }
        return false;
    }
  }

  /**
   * Apply a domain filter rule
   */
  private applyDomainRule(rule: DomainFilterRule, result: BaseSearchResult): boolean {
    try {
      const resultUrl = new URL(result.url);
      const resultDomain = resultUrl.hostname;
      
      for (const domain of rule.domains) {
        if (rule.matchSubdomains) {
          // Check if the result domain ends with the rule domain
          if (resultDomain === domain || resultDomain.endsWith(`.${domain}`)) {
            return true;
          }
        } else {
          // Exact domain match
          if (resultDomain === domain) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      // If URL parsing fails, assume no match
      return false;
    }
  }

  /**
   * Apply a keyword filter rule
   */
  private applyKeywordRule(rule: KeywordFilterRule, result: BaseSearchResult): boolean {
    // Prepare fields to check
    const fields: (keyof BaseSearchResult)[] = rule.fields as (keyof BaseSearchResult)[];
    
    // Check each field for each keyword
    for (const field of fields) {
      const fieldValue = result[field];
      
      // Skip if the field doesn't exist or isn't a string
      if (!fieldValue || typeof fieldValue !== 'string') {
        continue;
      }
      
      const valueToCheck = rule.caseSensitive ? fieldValue : fieldValue.toLowerCase();
      
      for (const keyword of rule.keywords) {
        const keywordToCheck = rule.caseSensitive ? keyword : keyword.toLowerCase();
        
        let matches = false;
        
        switch (rule.matchStrategy) {
          case MatchStrategy.EXACT:
            matches = valueToCheck === keywordToCheck;
            break;
          
          case MatchStrategy.CONTAINS:
            matches = valueToCheck.includes(keywordToCheck);
            break;
          
          case MatchStrategy.STARTS_WITH:
            matches = valueToCheck.startsWith(keywordToCheck);
            break;
          
          case MatchStrategy.ENDS_WITH:
            matches = valueToCheck.endsWith(keywordToCheck);
            break;
          
          case MatchStrategy.REGEX:
            try {
              const regex = new RegExp(keywordToCheck, rule.caseSensitive ? '' : 'i');
              matches = regex.test(valueToCheck);
            } catch (error) {
              // If regex is invalid, assume no match
              matches = false;
            }
            break;
        }
        
        if (matches) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Apply a URL pattern filter rule
   */
  private applyUrlPatternRule(rule: UrlPatternFilterRule, result: BaseSearchResult): boolean {
    if (!result.url) {
      return false;
    }
    
    const url = result.url;
    
    for (const pattern of rule.patterns) {
      let matches = false;
      
      switch (rule.matchStrategy) {
        case MatchStrategy.EXACT:
          matches = url === pattern;
          break;
        
        case MatchStrategy.CONTAINS:
          matches = url.includes(pattern);
          break;
        
        case MatchStrategy.STARTS_WITH:
          matches = url.startsWith(pattern);
          break;
        
        case MatchStrategy.ENDS_WITH:
          matches = url.endsWith(pattern);
          break;
        
        case MatchStrategy.REGEX:
          try {
            const regex = new RegExp(pattern);
            matches = regex.test(url);
          } catch (error) {
            // If regex is invalid, assume no match
            matches = false;
          }
          break;
      }
      
      if (matches) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Apply a file type filter rule
   */
  private applyFileTypeRule(rule: FileTypeFilterRule, result: BaseSearchResult): boolean {
    if (!result.url) {
      return false;
    }
    
    const url = result.url.toLowerCase();
    
    for (const fileType of rule.fileTypes) {
      const fileTypeToCheck = fileType.startsWith('.') ? fileType : `.${fileType}`;
      
      let matches = false;
      
      switch (rule.matchStrategy) {
        case MatchStrategy.EXACT:
          // This is tricky for file types, we'll check if the URL path ends with the exact file extension
          matches = url.endsWith(fileTypeToCheck);
          break;
        
        case MatchStrategy.ENDS_WITH:
          matches = url.endsWith(fileTypeToCheck);
          break;
      }
      
      if (matches) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Apply a custom filter rule
   */
  private applyCustomRule(rule: CustomFilterRule, result: BaseSearchResult): boolean {
    try {
      return rule.filterFn(result);
    } catch (error) {
      // If the custom function throws, assume no match
      console.error(`Error in custom filter rule ${rule.id}:`, error);
      return false;
    }
  }

  /**
   * Apply a composite filter rule
   */
  private applyCompositeRule(rule: CompositeFilterRule, result: BaseSearchResult): boolean {
    if (rule.rules.length === 0) {
      return false;
    }
    
    const enabledRules = rule.rules.filter(r => r.enabled);
    
    if (enabledRules.length === 0) {
      return false;
    }
    
    switch (rule.operator) {
      case FilterOperator.AND:
        // All rules must match
        return enabledRules.every(r => this.applyRule(r as FilterRuleUnion, result));
      
      case FilterOperator.OR:
        // At least one rule must match
        return enabledRules.some(r => this.applyRule(r as FilterRuleUnion, result));
      
      case FilterOperator.NOT:
        // None of the rules should match
        return !enabledRules.some(r => this.applyRule(r as FilterRuleUnion, result));
      
      default:
        return false;
    }
  }

  /**
   * Create a filter rule factory method
   */
  static createDomainBlockRule(
    id: string,
    name: string,
    domains: string[],
    matchSubdomains: boolean = true
  ): DomainFilterRule {
    return {
      id,
      name,
      type: FilterRuleType.DOMAIN_BLOCK,
      enabled: true,
      domains,
      matchSubdomains
    };
  }

  /**
   * Create a domain allow rule
   */
  static createDomainAllowRule(
    id: string,
    name: string,
    domains: string[],
    matchSubdomains: boolean = true
  ): DomainFilterRule {
    return {
      id,
      name,
      type: FilterRuleType.DOMAIN_ALLOW,
      enabled: true,
      domains,
      matchSubdomains
    };
  }

  /**
   * Create a keyword block rule
   */
  static createKeywordBlockRule(
    id: string,
    name: string,
    keywords: string[],
    fields: Array<'title' | 'snippet' | 'url'> = ['title', 'snippet'],
    matchStrategy: MatchStrategy = MatchStrategy.CONTAINS,
    caseSensitive: boolean = false
  ): KeywordFilterRule {
    return {
      id,
      name,
      type: FilterRuleType.KEYWORD_BLOCK,
      enabled: true,
      keywords,
      fields,
      matchStrategy,
      caseSensitive
    };
  }

  /**
   * Create a keyword require rule
   */
  static createKeywordRequireRule(
    id: string,
    name: string,
    keywords: string[],
    fields: Array<'title' | 'snippet' | 'url'> = ['title', 'snippet'],
    matchStrategy: MatchStrategy = MatchStrategy.CONTAINS,
    caseSensitive: boolean = false
  ): KeywordFilterRule {
    return {
      id,
      name,
      type: FilterRuleType.KEYWORD_REQUIRE,
      enabled: true,
      keywords,
      fields,
      matchStrategy,
      caseSensitive
    };
  }

  /**
   * Create a new filter set
   */
  static createFilterSet(
    id: string,
    name: string,
    rules: FilterRuleUnion[] = [],
    description?: string
  ): FilterSet {
    // This is a temporary adapter while migrating the codebase
    // In a real implementation, we would convert each FilterRuleUnion to the appropriate FilterConfig
    const filters: FilterConfig[] = rules.map(rule => ({
      id: rule.id,
      field: 'type', // Using type as a placeholder field
      operator: FilterOperator.EQUALS, // Using EQUALS as a placeholder operator
      value: rule.type,
      enabled: rule.enabled
    }));

    return {
      id,
      name,
      description,
      enabled: true,
      filters,
      junction: FilterJunction.AND
    };
  }
} 