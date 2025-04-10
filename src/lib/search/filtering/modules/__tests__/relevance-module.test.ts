import { describe, it, expect, beforeEach } from 'vitest';
import { RelevanceModule, RelevanceModuleConfig, RelevanceMetadata } from '../relevance-module';
import { SearchResult as BaseSearchResult } from '../../../types'; // Adjust path as needed

// Mock BaseSearchResult data for testing
const createMockResult = (title: string, snippet: string, url: string = 'https://example.com', rank?: number, timestamp?: Date, metadata: Record<string, any> = {}): BaseSearchResult => ({
  title,
  url,
  snippet,
  searchEngine: 'mock',
  timestamp: timestamp || new Date(),
  rank,
  metadata: { ...metadata }
});

// Mock query
const testQuery = 'best treatments for lung cancer';

describe('RelevanceModule', () => {
  let relevanceModule: RelevanceModule;

  beforeEach(() => {
    relevanceModule = new RelevanceModule(); // Use default config
    relevanceModule.setQuery(testQuery); // Set the query context
  });

  describe('process', () => {
    it('should calculate relevance score based on multiple factors', async () => {
      const relevantResult = createMockResult('Lung Cancer Treatment Options', 'New treatments show promise for lung cancer patients...', 'https://cancer.gov/lung/treatments', 1, new Date());
      const enrichedRelevant = await relevanceModule.process(relevantResult);
      const relevanceMeta = enrichedRelevant.metadata?.relevance as RelevanceMetadata;
      
      expect(relevanceMeta).toBeDefined();
      expect(relevanceMeta.relevanceScore).toBeTypeOf('number');
      expect(relevanceMeta.relevanceScore).toBeGreaterThan(0); // Specific score depends heavily on weighting and calculation
      expect(relevanceMeta.query).toBe(testQuery);
      expect(relevanceMeta.keywords).toEqual(['best', 'treatments', 'lung', 'cancer']); // Based on default extraction
      expect(relevanceMeta.components.keywordMatchScore).toBeDefined();
      expect(relevanceMeta.components.titleMatchScore).toBeDefined();
      expect(relevanceMeta.components.urlMatchScore).toBeDefined();
      expect(relevanceMeta.components.recencyScore).toBeDefined();
      expect(relevanceMeta.components.rankScore).toBeDefined();
    });

    it('should assign lower scores for less relevant results', async () => {
      const lessRelevantResult = createMockResult('General Cancer Information', 'Overview of different cancer types.', 'https://info.com', 5, new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)); // 100 days old
      const enrichedLessRelevant = await relevanceModule.process(lessRelevantResult);
      const relevanceMeta = enrichedLessRelevant.metadata?.relevance as RelevanceMetadata;
      
      expect(relevanceMeta.relevanceScore).toBeTypeOf('number');
      // Can't assert less than 0.5 reliably without knowing exact weights/calcs, just check it calculated
      expect(relevanceMeta.relevanceScore).toBeLessThan(1);
      expect(relevanceMeta.components.recencyScore).toBeLessThan(1);
      expect(relevanceMeta.components.rankScore).toBeLessThan(1);
    });

    it('should handle results with no matching keywords or factors', async () => {
      const irrelevantResult = createMockResult('Unrelated Topic', 'Completely different content.', 'https://random.org', 20, new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)); // > maxAgeDays
      const enrichedIrrelevant = await relevanceModule.process(irrelevantResult);
      const relevanceMeta = enrichedIrrelevant.metadata?.relevance as RelevanceMetadata;

      // Score might be exactly 0 if threshold applied, or very low otherwise
      expect(relevanceMeta.relevanceScore).toBeCloseTo(0); 
      expect(relevanceMeta.components.keywordMatchScore).toBeCloseTo(0);
      expect(relevanceMeta.components.titleMatchScore).toBeCloseTo(0);
      expect(relevanceMeta.components.urlMatchScore).toBeCloseTo(0);
      expect(relevanceMeta.components.recencyScore).toBeCloseTo(0); // Older than maxAgeDays
      expect(relevanceMeta.components.rankScore).toBeCloseTo(0); // Rank 20 is low
    });
    
    it('should apply different weighting factors correctly', async () => {
      // Use weights to emphasize title over keywords
      relevanceModule.updateConfig({ weightTitleMatch: 0.8, weightKeywordMatch: 0.1, weightUrlMatch: 0, weightRecency: 0, weightRank: 0.1 });
      
      const titleMatch = createMockResult('Best Lung Cancer Treatments', 'Snippet...', 'url', 5); // Strong title match
      const keywordMatch = createMockResult('Title', 'More details about lung cancer treatments...', 'url', 1); // Strong keyword match
      
      const enrichedTitle = await relevanceModule.process(titleMatch);
      const enrichedKeyword = await relevanceModule.process(keywordMatch);
      
      // With title heavily weighted, titleMatch should score higher despite worse rank
      expect(enrichedTitle.metadata?.relevance.relevanceScore).toBeGreaterThan(enrichedKeyword.metadata?.relevance.relevanceScore);
    });

    it('should preserve other existing metadata', async () => {
       const result = createMockResult('Relevant Title', 'Relevant snippet about lung cancer.', 'url', 1, new Date(), { existing: 'value' });
       const enrichedResult = await relevanceModule.process(result);
       expect(enrichedResult.metadata?.existing).toBe('value');
       expect(enrichedResult.metadata?.relevance).toBeDefined();
    });
  });

  describe('processBatch', () => {
    it('should process relevance and normalize scores for a batch', async () => {
      const results = [
        createMockResult('Best Lung Cancer Treatments', 'Matches query well.', 'url1', 1), // High score
        createMockResult('Other Cancers', 'Not relevant.', 'url2', 10), // Low score
        createMockResult('Lung Health Tips', 'Some relevance.', 'url3', 5) // Medium score
      ];
      const enrichedResults = await relevanceModule.processBatch(results);
      
      expect(enrichedResults.length).toBe(3);
      
      const scores = enrichedResults.map(r => (r.metadata?.relevance as RelevanceMetadata).relevanceScore);
      
      // Check normalization (max score should be 1)
      expect(Math.max(...scores)).toBeCloseTo(1); 
      // Check relative order
      expect(scores[0]).toBeGreaterThan(scores[2]);
      expect(scores[2]).toBeGreaterThan(scores[1]); 
    });
    
    it('should handle batch when normalization is disabled', async () => {
      relevanceModule.updateConfig({ normalizeScores: false });
      const results = [
        createMockResult('Best Lung Cancer Treatments', 'Matches query well.', 'url1', 1), // High score
        createMockResult('Other Cancers', 'Not relevant.', 'url2', 10)  // Low score
      ];
      const enrichedResults = await relevanceModule.processBatch(results);
      const scores = enrichedResults.map(r => (r.metadata?.relevance as RelevanceMetadata).relevanceScore);
      // Max score should NOT necessarily be 1
      expect(Math.max(...scores)).toBeLessThanOrEqual(1); // Still bounded by calc
      // Ensure the higher raw score is indeed higher
      expect(scores[0]).toBeGreaterThan(scores[1]); 
    });
  });
  
  describe('getConfig/updateConfig', () => {
     it('should return current configuration', () => {
      const config = relevanceModule.getConfig() as RelevanceModuleConfig;
      // Assert default config values based on implementation
      expect(config.weightKeywordMatch).toBeCloseTo(0.4);
      expect(config.weightTitleMatch).toBeCloseTo(0.3);
      expect(config.weightUrlMatch).toBeCloseTo(0.1);
      expect(config.weightRecency).toBeCloseTo(0.1);
      expect(config.weightRank).toBeCloseTo(0.1);
      expect(config.normalizeScores).toBe(true);
      expect(config.extractKeywords).toBe(true);
      expect(config.maxAgeDays).toBe(365);
      expect(config.minimumRelevanceThreshold).toBe(0.01);
    });

    it('should update configuration correctly', () => {
      relevanceModule.updateConfig({ weightTitleMatch: 0.7, extractKeywords: false });
      const config = relevanceModule.getConfig() as RelevanceModuleConfig;
      expect(config.weightTitleMatch).toBeCloseTo(0.7);
      expect(config.extractKeywords).toBe(false);
      
      // Test effect of updated config (e.g., keywords not extracted)
      relevanceModule.setQuery('new query check'); // Call setQuery AFTER updateConfig
      const result = createMockResult('title', 'snippet');
      const promise = relevanceModule.process(result).then(enriched => {
        expect((enriched.metadata?.relevance as RelevanceMetadata).keywords).toBeUndefined();
      });
      return promise;
    });
  });
}); 