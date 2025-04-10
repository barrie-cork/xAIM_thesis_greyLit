import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService } from '../filter-service';
import { DomainFilterRule, FilterRuleType, MatchStrategy, KeywordFilterRule, UrlPatternFilterRule, FileTypeFilterRule, CompositeFilterRule, FilterOperator } from '../types';
import { SearchResult as BaseSearchResult } from '../../types';

// Mock BaseSearchResult data for testing
const createMockResult = (url: string, title: string = 'Test Title', snippet: string = 'Test Snippet'): BaseSearchResult => ({
  title,
  url,
  snippet,
  searchEngine: 'mock',
  timestamp: new Date(),
  metadata: { fileType: url.split('.').pop() || 'html' } // Basic file type extraction
});

describe('FilterService', () => {
  let filterService: FilterService;

  beforeEach(() => {
    filterService = new FilterService();
  });

  describe('applyDomainRule', () => {
    const result1 = createMockResult('https://www.blockthis.com/page');
    const result2 = createMockResult('http://allowed.com/another');
    const result3 = createMockResult('https://sub.blockthis.com/path');
    const result4 = createMockResult('https://anotherallowed.com');
    const invalidUrlResult = createMockResult('not-a-valid-url');

    const blockRuleExact: DomainFilterRule = {
      id: 'block1', name: 'Block blockthis.com', enabled: true,
      type: FilterRuleType.DOMAIN_BLOCK,
      domains: ['blockthis.com'],
      matchSubdomains: false
    };
    
    const blockRuleSubdomains: DomainFilterRule = {
      id: 'block2', name: 'Block blockthis.com and subs', enabled: true,
      type: FilterRuleType.DOMAIN_BLOCK,
      domains: ['blockthis.com'],
      matchSubdomains: true
    };
    
    const allowRuleExact: DomainFilterRule = {
      id: 'allow1', name: 'Allow allowed.com', enabled: true,
      type: FilterRuleType.DOMAIN_ALLOW,
      domains: ['allowed.com'],
      matchSubdomains: false
    };
    
    const allowRuleSubdomains: DomainFilterRule = {
      id: 'allow2', name: 'Allow allowed.com and subs', enabled: true,
      type: FilterRuleType.DOMAIN_ALLOW,
      domains: ['allowed.com'],
      matchSubdomains: true
    };

    it('should return true for domain block rules when domain matches exactly', () => {
      expect((filterService as any).applyDomainRule(blockRuleExact, result1)).toBe(true);
      expect((filterService as any).applyDomainRule(blockRuleExact, result3)).toBe(false); // Subdomain doesn't match
    });

    it('should return true for domain block rules when subdomain matches and matchSubdomains is true', () => {
      expect((filterService as any).applyDomainRule(blockRuleSubdomains, result1)).toBe(true);
      expect((filterService as any).applyDomainRule(blockRuleSubdomains, result3)).toBe(true);
    });
    
    it('should return false for domain block rules when domain does not match', () => {
      expect((filterService as any).applyDomainRule(blockRuleExact, result2)).toBe(false);
      expect((filterService as any).applyDomainRule(blockRuleSubdomains, result4)).toBe(false);
    });

    it('should return true for domain allow rules when domain matches exactly', () => {
      expect((filterService as any).applyDomainRule(allowRuleExact, result2)).toBe(true);
      // Assuming sub.allowed.com exists
      const subAllowedResult = createMockResult('https://sub.allowed.com');
      expect((filterService as any).applyDomainRule(allowRuleExact, subAllowedResult)).toBe(false); 
    });

    it('should return true for domain allow rules when subdomain matches and matchSubdomains is true', () => {
      expect((filterService as any).applyDomainRule(allowRuleSubdomains, result2)).toBe(true);
       const subAllowedResult = createMockResult('https://sub.allowed.com');
      expect((filterService as any).applyDomainRule(allowRuleSubdomains, subAllowedResult)).toBe(true); 
    });

    it('should return false for domain allow rules when domain does not match', () => {
      expect((filterService as any).applyDomainRule(allowRuleExact, result1)).toBe(false);
      expect((filterService as any).applyDomainRule(allowRuleSubdomains, result4)).toBe(false);
    });

    it('should handle invalid URLs gracefully and return false', () => {
      expect((filterService as any).applyDomainRule(blockRuleExact, invalidUrlResult)).toBe(false);
      expect((filterService as any).applyDomainRule(allowRuleExact, invalidUrlResult)).toBe(false);
    });
  });

  describe('applyKeywordRule', () => {
    const result1 = createMockResult('https://example.com', 'Contains Secret Keyword', 'Snippet text');
    const result2 = createMockResult('https://example.com', 'Title', 'Snippet has SECRET word');
    const result3 = createMockResult('https://secret.com/path', 'Title', 'Snippet');
    const result4 = createMockResult('https://example.com', 'Title', 'Snippet');

    const blockRule: KeywordFilterRule = {
      id: 'blockKeyword', name: 'Block secret', enabled: true,
      type: FilterRuleType.KEYWORD_BLOCK,
      keywords: ['secret', 'confidential'],
      fields: ['title', 'snippet', 'url'],
      matchStrategy: MatchStrategy.CONTAINS,
      caseSensitive: false
    };
    
    const requireRule: KeywordFilterRule = {
      id: 'requireKeyword', name: 'Require important', enabled: true,
      type: FilterRuleType.KEYWORD_REQUIRE,
      keywords: ['important'],
      fields: ['title', 'snippet'],
      matchStrategy: MatchStrategy.CONTAINS,
      caseSensitive: false
    };
    
    const blockRuleCaseSensitive: KeywordFilterRule = {
      ...blockRule,
      id: 'blockKeywordCS',
      keywords: ['SECRET'],
      caseSensitive: true
    };
    
    const blockRuleExactMatch: KeywordFilterRule = {
      ...blockRule,
      id: 'blockKeywordExact',
      keywords: ['Snippet text'],
      matchStrategy: MatchStrategy.EXACT
    };

    it('should return true for keyword block rule when keyword is found (case-insensitive)', () => {
      expect((filterService as any).applyKeywordRule(blockRule, result1)).toBe(true); // Title
      expect((filterService as any).applyKeywordRule(blockRule, result2)).toBe(true); // Snippet
      expect((filterService as any).applyKeywordRule(blockRule, result3)).toBe(true); // URL
    });

    it('should return false for keyword block rule when keyword is not found', () => {
      expect((filterService as any).applyKeywordRule(blockRule, result4)).toBe(false);
    });

    it('should return true for keyword require rule when keyword is found', () => {
      const importantResult = createMockResult('url', 'Title has IMPORTANT word');
      expect((filterService as any).applyKeywordRule(requireRule, importantResult)).toBe(true);
    });

    it('should return false for keyword require rule when keyword is not found', () => {
      expect((filterService as any).applyKeywordRule(requireRule, result4)).toBe(false);
    });
    
    it('should respect case sensitivity', () => {
      expect((filterService as any).applyKeywordRule(blockRuleCaseSensitive, result1)).toBe(false); // Title is 'Secret Keyword'
      expect((filterService as any).applyKeywordRule(blockRuleCaseSensitive, result2)).toBe(true); // Snippet is 'SECRET word'
    });
    
    it('should handle exact match strategy', () => {
      expect((filterService as any).applyKeywordRule(blockRuleExactMatch, result1)).toBe(true); // Snippet is 'Snippet text'
      const partialMatchResult = createMockResult('url', 'Title', 'This Snippet text has more');
      expect((filterService as any).applyKeywordRule(blockRuleExactMatch, partialMatchResult)).toBe(false);
    });

    it('should handle different fields correctly', () => {
      const titleOnlyRule: KeywordFilterRule = { ...blockRule, fields: ['title'] };
      expect((filterService as any).applyKeywordRule(titleOnlyRule, result1)).toBe(true);
      expect((filterService as any).applyKeywordRule(titleOnlyRule, result2)).toBe(false); // Keyword in snippet only
      expect((filterService as any).applyKeywordRule(titleOnlyRule, result3)).toBe(false); // Keyword in URL only
    });
  });

  describe('applyUrlPatternRule', () => {
    const result1 = createMockResult('https://example.com/products/123');
    const result2 = createMockResult('https://example.com/blog/post-name');
    const result3 = createMockResult('https://another.com/page');
    const invalidUrlResult = createMockResult('not-a-valid-url');

    const patternRule: UrlPatternFilterRule = {
      id: 'urlPattern1', name: 'Match product URLs', enabled: true,
      type: FilterRuleType.URL_PATTERN,
      patterns: ['/products/\\d+$', '/items/'], // Regex and simple string
      matchStrategy: MatchStrategy.REGEX // Or CONTAINS, depending on intended logic
    };

    it('should return true when URL matches one of the patterns (regex)', () => {
      const regexRule: UrlPatternFilterRule = { ...patternRule, matchStrategy: MatchStrategy.REGEX };
      expect((filterService as any).applyUrlPatternRule(regexRule, result1)).toBe(true);
    });

    it('should return true when URL matches one of the patterns (contains strategy)', () => {
      const itemResult = createMockResult('https://example.com/items/abc');
      const containsRule: UrlPatternFilterRule = { ...patternRule, matchStrategy: MatchStrategy.CONTAINS, patterns: ['/items/'] };
      expect((filterService as any).applyUrlPatternRule(containsRule, itemResult)).toBe(true);
    });

    it('should return false when URL does not match any pattern', () => {
      const regexRule: UrlPatternFilterRule = { ...patternRule, matchStrategy: MatchStrategy.REGEX };
      expect((filterService as any).applyUrlPatternRule(regexRule, result2)).toBe(false);
      expect((filterService as any).applyUrlPatternRule(regexRule, result3)).toBe(false);
    });

    it('should handle invalid URLs gracefully and return false', () => {
      expect((filterService as any).applyUrlPatternRule(patternRule, invalidUrlResult)).toBe(false);
    });
    
    it('should handle malformed regex patterns gracefully when using REGEX strategy', () => {
      const malformedPatternRule: UrlPatternFilterRule = { 
        ...patternRule, 
        patterns: ['(/invalid['], 
        matchStrategy: MatchStrategy.REGEX 
      };
      expect(() => (filterService as any).applyUrlPatternRule(malformedPatternRule, result1)).not.toThrow();
      expect((filterService as any).applyUrlPatternRule(malformedPatternRule, result1)).toBe(false); // Expect no match on error
    });
  });

  describe('applyFileTypeRule', () => {
    const pdfResult = createMockResult('https://example.com/document.pdf');
    const docxResult = createMockResult('https://example.com/report.docx');
    const htmlResult = createMockResult('https://example.com/page.html');
    const noExtResult = createMockResult('https://example.com/resource');
    const queryParamResult = createMockResult('https://example.com/file?type=pdf'); // Extension missing

    const pdfRuleExact: FileTypeFilterRule = {
      id: 'filePdfExact', name: 'Match PDF exact', enabled: true,
      type: FilterRuleType.FILE_TYPE,
      fileTypes: ['pdf'],
      matchStrategy: MatchStrategy.EXACT
    };
    
    const docRuleEndsWith: FileTypeFilterRule = {
      id: 'fileDocEnds', name: 'Match DOC/DOCX ends with', enabled: true,
      type: FilterRuleType.FILE_TYPE,
      fileTypes: ['doc', 'docx'],
      matchStrategy: MatchStrategy.ENDS_WITH // Typically used for file extensions
    };
    
    const htmlRuleExact: FileTypeFilterRule = {
      id: 'fileHtmlExact', name: 'Match HTML exact', enabled: true,
      type: FilterRuleType.FILE_TYPE,
      fileTypes: ['html'],
      matchStrategy: MatchStrategy.EXACT
    };

    it('should return true when file type matches exactly (EXACT strategy)', () => {
      // Note: EXACT strategy might compare against metadata.fileType or a derived value.
      // Let's assume it uses the derived metadata.fileType from createMockResult
      expect((filterService as any).applyFileTypeRule(pdfRuleExact, pdfResult)).toBe(true);
      expect((filterService as any).applyFileTypeRule(htmlRuleExact, htmlResult)).toBe(true);
    });

    it('should return true when URL ends with the file type (ENDS_WITH strategy)', () => {
      expect((filterService as any).applyFileTypeRule(docRuleEndsWith, docxResult)).toBe(true);
      // Check if it matches .doc too
      const docResult = createMockResult('https://example.com/report.doc');
      expect((filterService as any).applyFileTypeRule(docRuleEndsWith, docResult)).toBe(true);
    });

    it('should return false when file type does not match', () => {
      expect((filterService as any).applyFileTypeRule(pdfRuleExact, docxResult)).toBe(false);
      expect((filterService as any).applyFileTypeRule(docRuleEndsWith, pdfResult)).toBe(false);
      expect((filterService as any).applyFileTypeRule(htmlRuleExact, pdfResult)).toBe(false);
    });

    it('should handle URLs with no apparent extension', () => {
      // Exact match against derived 'html' (default in mock)
      expect((filterService as any).applyFileTypeRule(htmlRuleExact, noExtResult)).toBe(true); 
      // Ends with won't match anything specific
      expect((filterService as any).applyFileTypeRule(docRuleEndsWith, noExtResult)).toBe(false);
      // PDF exact won't match derived 'html'
       expect((filterService as any).applyFileTypeRule(pdfRuleExact, noExtResult)).toBe(false);
    });

    it('should handle URLs with query parameters', () => {
      // ENDS_WITH likely fails as URL doesn't end with .pdf
      expect((filterService as any).applyFileTypeRule({ ...pdfRuleExact, matchStrategy: MatchStrategy.ENDS_WITH }, queryParamResult)).toBe(false);
      // EXACT might work if metadata correctly identifies it as pdf, but our mock defaults to 'html'
      expect((filterService as any).applyFileTypeRule(pdfRuleExact, queryParamResult)).toBe(false); 
      // Check against mock's default 'html'
      expect((filterService as any).applyFileTypeRule(htmlRuleExact, queryParamResult)).toBe(true);
    });
    
    it('should handle case variations in file types if implementation is case-insensitive', () => {
      // Assuming the implementation normalizes to lowercase for comparison
      const pdfRuleUpper: FileTypeFilterRule = { ...pdfRuleExact, fileTypes: ['PDF'] };
      expect((filterService as any).applyFileTypeRule(pdfRuleUpper, pdfResult)).toBe(true);
      const docRuleMixed: FileTypeFilterRule = { ...docRuleEndsWith, fileTypes: ['DocX'] };
      expect((filterService as any).applyFileTypeRule(docRuleMixed, docxResult)).toBe(true);
    });
  });
  
  describe('applyCompositeRule', () => {
    const resultMatchDomain = createMockResult('https://allowed.com/page');
    const resultMatchKeyword = createMockResult('https://other.com', 'Has important keyword');
    const resultMatchBoth = createMockResult('https://allowed.com/another', 'Also important');
    const resultMatchNeither = createMockResult('https://blocked.com', 'Nothing relevant');

    const allowDomainRule: DomainFilterRule = {
      id: 'allowDomain', name: 'Allow allowed.com', enabled: true,
      type: FilterRuleType.DOMAIN_ALLOW,
      domains: ['allowed.com'],
      matchSubdomains: false
    };
    
    const requireKeywordRule: KeywordFilterRule = {
      id: 'requireKeyword', name: 'Require important', enabled: true,
      type: FilterRuleType.KEYWORD_REQUIRE,
      keywords: ['important'],
      fields: ['title'],
      matchStrategy: MatchStrategy.CONTAINS,
      caseSensitive: false
    };
    
     const blockDomainRule: DomainFilterRule = {
      id: 'blockDomain', name: 'Block blocked.com', enabled: true,
      type: FilterRuleType.DOMAIN_BLOCK,
      domains: ['blocked.com'],
      matchSubdomains: false
    };

    const compositeAndRule: CompositeFilterRule = {
      id: 'compositeAND', name: 'Require Domain AND Keyword', enabled: true,
      type: FilterRuleType.CUSTOM,
      operator: FilterOperator.AND,
      rules: [allowDomainRule, requireKeywordRule]
    };
    
    const compositeOrRule: CompositeFilterRule = {
      id: 'compositeOR', name: 'Require Domain OR Keyword', enabled: true,
      type: FilterRuleType.CUSTOM,
      operator: FilterOperator.OR,
      rules: [allowDomainRule, requireKeywordRule]
    };
    
     const nestedCompositeRule: CompositeFilterRule = {
      id: 'nestedComposite', name: '(Allow Domain OR Require Keyword) AND NOT Block Domain', enabled: true,
      type: FilterRuleType.CUSTOM,
      operator: FilterOperator.AND,
      rules: [
        compositeOrRule,
        { // This is effectively a NOT blockDomainRule
          id: 'notBlock',
          name: 'Not Blocked Domain',
          enabled: true,
          type: FilterRuleType.CUSTOM,
          operator: FilterOperator.NOT,
          rules: [blockDomainRule]
        } as CompositeFilterRule 
      ]
    };

    it('should return true for AND operator if all sub-rules match', () => {
      expect((filterService as any).applyCompositeRule(compositeAndRule, resultMatchBoth)).toBe(true);
    });

    it('should return false for AND operator if any sub-rule does not match', () => {
      expect((filterService as any).applyCompositeRule(compositeAndRule, resultMatchDomain)).toBe(false); // Keyword missing
      expect((filterService as any).applyCompositeRule(compositeAndRule, resultMatchKeyword)).toBe(false); // Domain missing
      expect((filterService as any).applyCompositeRule(compositeAndRule, resultMatchNeither)).toBe(false);
    });

    it('should return true for OR operator if any sub-rule matches', () => {
      expect((filterService as any).applyCompositeRule(compositeOrRule, resultMatchDomain)).toBe(true);
      expect((filterService as any).applyCompositeRule(compositeOrRule, resultMatchKeyword)).toBe(true);
      expect((filterService as any).applyCompositeRule(compositeOrRule, resultMatchBoth)).toBe(true);
    });

    it('should return false for OR operator if no sub-rules match', () => {
      expect((filterService as any).applyCompositeRule(compositeOrRule, resultMatchNeither)).toBe(false);
    });
    
    it('should return true for NOT operator if the sub-rule does NOT match', () => {
      const notRule: CompositeFilterRule = {
          id: 'notBlock', name: 'Not Blocked Domain', enabled: true,
          type: FilterRuleType.CUSTOM,
          operator: FilterOperator.NOT,
          rules: [blockDomainRule]
        };
      expect((filterService as any).applyCompositeRule(notRule, resultMatchDomain)).toBe(true); 
    });
    
     it('should return false for NOT operator if the sub-rule DOES match', () => {
       const notRule: CompositeFilterRule = {
          id: 'notBlock', name: 'Not Blocked Domain', enabled: true,
          type: FilterRuleType.CUSTOM,
          operator: FilterOperator.NOT,
          rules: [blockDomainRule]
        };
      expect((filterService as any).applyCompositeRule(notRule, resultMatchNeither)).toBe(false); 
    });
    
    it('should handle nested composite rules correctly', () => {
      // Matches OR part (domain) and matches NOT part (not blocked)
      expect((filterService as any).applyCompositeRule(nestedCompositeRule, resultMatchDomain)).toBe(true);
      // Matches OR part (keyword) and matches NOT part (not blocked)
      expect((filterService as any).applyCompositeRule(nestedCompositeRule, resultMatchKeyword)).toBe(true);
       // Matches OR part (both) and matches NOT part (not blocked)
      expect((filterService as any).applyCompositeRule(nestedCompositeRule, resultMatchBoth)).toBe(true);
      // Fails OR part (neither matches) even though it matches NOT part
      expect((filterService as any).applyCompositeRule(nestedCompositeRule, resultMatchNeither)).toBe(false); 
      // Matches OR part, but Fails NOT part (is blocked)
      const blockedButAllowed = createMockResult('https://blocked.com', 'This is important');
      expect((filterService as any).applyCompositeRule(nestedCompositeRule, blockedButAllowed)).toBe(false); 
    });
    
    it('should handle empty rules array gracefully', () => {
      const emptyAndRule: CompositeFilterRule = { ...compositeAndRule, type: FilterRuleType.CUSTOM, rules: [] };
      const emptyOrRule: CompositeFilterRule = { ...compositeOrRule, type: FilterRuleType.CUSTOM, rules: [] };
      const emptyNotRule: CompositeFilterRule = { id:'notEmpty', name:'', enabled: true, type: FilterRuleType.CUSTOM, operator: FilterOperator.NOT, rules: [] };
      
      // AND with empty rules should likely be true (vacuously true)
      expect((filterService as any).applyCompositeRule(emptyAndRule, resultMatchBoth)).toBe(true);
      // OR with empty rules should likely be false
      expect((filterService as any).applyCompositeRule(emptyOrRule, resultMatchBoth)).toBe(false);
      // NOT with empty rules should likely be true (NOT false = true)
       expect((filterService as any).applyCompositeRule(emptyNotRule, resultMatchBoth)).toBe(true);
    });
  });
  
  describe('applyFilters (Integration)', () => {
    const results = [
      createMockResult('https://block.com/page1', 'Allowed Title'),        // Should be blocked by domain
      createMockResult('https://allow.com/page2', 'Contains forbidden word'), // Should be blocked by keyword
      createMockResult('https://allow.com/page3', 'Safe Title'),            // Should be allowed
      createMockResult('https://another.com/page4', 'Also Safe'),          // Should be allowed (passes require rules implicitly)
      createMockResult('https://require.com/page5', 'Needs important word'), // Should be blocked (missing required keyword)
      createMockResult('https://require.com/page6', 'Has important info'),  // Should be allowed
    ];

    const blockDomain: DomainFilterRule = {
      id: 'block1', type: FilterRuleType.DOMAIN_BLOCK, name: 'Block block.com', enabled: true,
      domains: ['block.com'], matchSubdomains: true
    };
    
    const blockKeyword: KeywordFilterRule = {
      id: 'block2', type: FilterRuleType.KEYWORD_BLOCK, name: 'Block forbidden', enabled: true,
      keywords: ['forbidden'], fields: ['title', 'snippet'], matchStrategy: MatchStrategy.CONTAINS, caseSensitive: false
    };
    
    // Note: Allow rules usually define what *can* pass, but applyFilters logic uses them 
    // as requirements. If an allow rule doesn't match, the item is excluded.
    // This might be counter-intuitive. Let's assume allow rules mean "must match one of these".
    const allowDomain: DomainFilterRule = {
       id: 'allow1', type: FilterRuleType.DOMAIN_ALLOW, name: 'Allow allow.com', enabled: true,
       domains: ['allow.com', 'require.com'], matchSubdomains: true
    }; 
    
    const requireKeyword: KeywordFilterRule = {
      id: 'require1', type: FilterRuleType.KEYWORD_REQUIRE, name: 'Require important', enabled: true,
      keywords: ['important'], fields: ['title'], matchStrategy: MatchStrategy.CONTAINS, caseSensitive: false
    };
    
    const disabledRule: DomainFilterRule = {
       id: 'disabled1', type: FilterRuleType.DOMAIN_BLOCK, name: 'Disabled Rule', enabled: false,
       domains: ['another.com'], matchSubdomains: true
    }; 

    it('should filter results based on combined block rules', () => {
      const rules = [blockDomain, blockKeyword];
      const filterResult = filterService.applyFilters(rules, results);
      
      expect(filterResult.filtered.length).toBe(4);
      expect(filterResult.excluded.length).toBe(2);
      expect(filterResult.excluded).toEqual([results[0], results[1]]);
      expect(filterResult.filtered).toEqual([results[2], results[3], results[4], results[5]]);
      expect(filterResult.stats.ruleStats['block1']?.matches).toBe(1);
      expect(filterResult.stats.ruleStats['block2']?.matches).toBe(1);
    });

    it('should filter results based on combined require rules (implicit AND)', () => {
      // If applyFilters treats un-matched ALLOW/REQUIRE as exclusion criteria
      const rules = [allowDomain, requireKeyword];
      const filterResult = filterService.applyFilters(rules, results);

      // Expected: only result 6 matches both allowDomain and requireKeyword
      expect(filterResult.filtered.length).toBe(1);
      expect(filterResult.excluded.length).toBe(5);
      expect(filterResult.filtered).toEqual([results[5]]);
       expect(filterResult.excluded).toEqual([results[0], results[1], results[2], results[3], results[4]]);
       expect(filterResult.stats.ruleStats['allow1']?.matches).toBe(4); // allow.com or require.com
       expect(filterResult.stats.ruleStats['require1']?.matches).toBe(1); // 'important' in title
    });
    
    it('should handle a mix of block and require rules', () => {
      const rules = [blockDomain, requireKeyword];
      const filterResult = filterService.applyFilters(rules, results);
      
       // Expected: Block result 0. Require 'important', excluding 2, 3, 4. Pass 5. Block 1 anyway.
      expect(filterResult.filtered.length).toBe(1); // Only result 5 passes both
      expect(filterResult.excluded.length).toBe(5);
      expect(filterResult.filtered).toEqual([results[5]]); 
      expect(filterResult.excluded).toEqual(expect.arrayContaining([results[0], results[1], results[2], results[3], results[4]]));
      expect(filterResult.stats.ruleStats['block1']?.matches).toBe(1);
      expect(filterResult.stats.ruleStats['require1']?.matches).toBe(1);
    });

    it('should ignore disabled rules', () => {
      const rules = [blockDomain, disabledRule];
      const filterResult = filterService.applyFilters(rules, results);
      
      // Should only apply blockDomain
      expect(filterResult.filtered.length).toBe(5);
      expect(filterResult.excluded.length).toBe(1);
      expect(filterResult.excluded).toEqual([results[0]]);
      expect(filterResult.stats.ruleStats['disabled1']).toBeUndefined();
      expect(Object.keys(filterResult.stats.ruleStats).length).toBe(1); // Only block1 stats
    });

    it('should return all results if no rules are provided or enabled', () => {
      const noRulesResult = filterService.applyFilters([], results);
      expect(noRulesResult.filtered).toEqual(results);
      expect(noRulesResult.excluded).toEqual([]);
      expect(noRulesResult.stats.totalExcluded).toBe(0);

      const onlyDisabledResult = filterService.applyFilters([disabledRule], results);
      expect(onlyDisabledResult.filtered).toEqual(results);
      expect(onlyDisabledResult.excluded).toEqual([]);
      expect(onlyDisabledResult.stats.totalExcluded).toBe(0);
    });
    
    it('should correctly calculate statistics', () => {
      const rules = [blockDomain, requireKeyword];
      const filterResult = filterService.applyFilters(rules, results);
      
      expect(filterResult.stats.totalProcessed).toBe(results.length);
      expect(filterResult.stats.totalIncluded).toBe(1);
      expect(filterResult.stats.totalExcluded).toBe(5);
      expect(filterResult.stats.ruleStats['block1']?.ruleId).toBe('block1');
      expect(filterResult.stats.ruleStats['block1']?.matches).toBe(1);
      expect(filterResult.stats.ruleStats['require1']?.ruleId).toBe('require1');
      expect(filterResult.stats.ruleStats['require1']?.matches).toBe(1);
    });
  });

  // TODO: Add tests for Filter Set management (add/get/remove)
  // TODO: Add tests for applyFilterSet
}); 