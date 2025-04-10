import { describe, it, expect, beforeEach } from 'vitest';
import { ReadabilityModule } from '../readability-module';
import { SearchResult as BaseSearchResult } from '../../../types'; // Adjust path as needed

// Mock BaseSearchResult data for testing
const createMockResult = (snippet: string, title: string = 'Test Title', url: string = 'https://example.com'): BaseSearchResult => ({
  title,
  url,
  snippet,
  searchEngine: 'mock',
  timestamp: new Date(),
  metadata: {}
});

describe('ReadabilityModule', () => {
  let readabilityModule: ReadabilityModule;

  beforeEach(() => {
    // Initialize with default or specific options if needed
    readabilityModule = new ReadabilityModule();
  });

  describe('process', () => {
    it('should calculate readability scores for a single result', async () => {
      const result = createMockResult('This is a simple sentence. It should be easy to read.');
      const enrichedResult = await readabilityModule.process(result);
      
      expect(enrichedResult.metadata?.readability).toBeDefined();
      expect(enrichedResult.metadata?.readability?.score).toBeTypeOf('number');
      expect(enrichedResult.metadata?.readability?.level).toBeTypeOf('string');
      expect(enrichedResult.metadata?.readability?.analyzed).toBe(true);
    });

    it('should handle empty or very short snippets gracefully', async () => {
      const emptySnippetResult = createMockResult('');
      const enrichedEmpty = await readabilityModule.process(emptySnippetResult);
      expect(enrichedEmpty.metadata?.readability).toBeDefined();
      expect(enrichedEmpty.metadata?.readability?.analyzed).toBe(false);
      expect(enrichedEmpty.metadata?.readability?.reason).toBe('insufficient content');
      expect(enrichedEmpty.metadata?.readability?.score).toBeNull();
      expect(enrichedEmpty.metadata?.readability?.level).toBe('unknown');

      const shortSnippetResult = createMockResult('Short text under fifty chars.');
      const enrichedShort = await readabilityModule.process(shortSnippetResult);
      expect(enrichedShort.metadata?.readability?.analyzed).toBe(false);
      expect(enrichedShort.metadata?.readability?.reason).toBe('insufficient content');
    });

    it('should handle snippets with complex language', async () => {
      const complexSnippet = 'The juxtaposition of intricate lexical items necessitates advanced cognitive processing, potentially elevating the perceived difficulty.';
      const result = createMockResult(complexSnippet);
      const enrichedResult = await readabilityModule.process(result);
      
      expect(enrichedResult.metadata?.readability).toBeDefined();
      expect(enrichedResult.metadata?.readability?.analyzed).toBe(true);
      expect(enrichedResult.metadata?.readability?.score).toBeTypeOf('number');
      expect(enrichedResult.metadata?.readability?.score).toBeLessThan(50);
      expect(['difficult', 'very difficult']).toContain(enrichedResult.metadata?.readability?.level);
    });
    
    it('should preserve existing metadata', async () => {
       const initialMetadata = { existing: 'value', other: 123 };
       const result: BaseSearchResult = { 
         ...createMockResult('Simple text for readability check.'), 
         metadata: { ...initialMetadata } 
       };
       const enrichedResult = await readabilityModule.process(result);
       
       expect(enrichedResult.metadata?.existing).toBe('value');
       expect(enrichedResult.metadata?.other).toBe(123);
       expect(enrichedResult.metadata?.readability).toBeDefined();
       expect(enrichedResult.metadata?.readability?.analyzed).toBe(true);
    });
  });

  describe('processBatch', () => {
    it('should calculate readability scores for multiple results in a batch', async () => {
      const results = [
        createMockResult('Easy text here. Very simple indeed.'),
        createMockResult('Slightly more complex text requires a bit more effort to understand fully, considering various linguistic factors.')
      ];
      const enrichmentResult = await readabilityModule.processBatch(results);
      const enrichedResults = enrichmentResult.results;
      
      expect(enrichedResults.length).toBe(2);
      expect(enrichedResults[0].metadata?.readability?.analyzed).toBe(true);
      expect(enrichedResults[1].metadata?.readability?.analyzed).toBe(true);
      expect(enrichedResults[0].metadata?.readability?.score).toBeGreaterThan(enrichedResults[1].metadata?.readability?.score);
      
      expect(enrichmentResult.metrics.totalProcessed).toBe(2);
      expect(enrichmentResult.metrics.totalEnriched).toBe(2);
      expect(enrichmentResult.metrics.moduleMetrics['readability']).toBeDefined();
    });

    it('should handle an empty batch', async () => {
      const enrichmentResult = await readabilityModule.processBatch([]);
      expect(enrichmentResult.results.length).toBe(0);
      expect(enrichmentResult.metrics.totalProcessed).toBe(0);
    });
    
    it('should correctly report metrics when some items are not analyzed', async () => {
       const results = [
        createMockResult('Easy text here. Very simple indeed.'),
        createMockResult('Short.')
      ];
      const enrichmentResult = await readabilityModule.processBatch(results);
      expect(enrichmentResult.results.length).toBe(2);
      expect(enrichmentResult.metrics.totalProcessed).toBe(2);
      expect(enrichmentResult.metrics.totalEnriched).toBe(1);
    });
  });
  
  describe('getConfig/updateConfig', () => {
     it('should return current configuration', () => {
      const config = readabilityModule.getConfig();
      expect(config.minCharactersForAnalysis).toBe(50);
      expect(config.applyToSnippetsOnly).toBe(true);
      expect(config.scoreThresholds).toEqual({ easy: 80, moderate: 50, difficult: 30 });
    });

    it('should update configuration correctly', () => {
      readabilityModule.updateConfig({ minCharactersForAnalysis: 10, applyToSnippetsOnly: false });
      const config = readabilityModule.getConfig();
      expect(config.minCharactersForAnalysis).toBe(10);
      expect(config.applyToSnippetsOnly).toBe(false);
      
      const shortSnippetResult = createMockResult('This is now long enough.');
      const promise = readabilityModule.process(shortSnippetResult).then(enrichedShort => {
         expect(enrichedShort.metadata?.readability?.analyzed).toBe(true);
      });
      return promise;
    });
  });
}); 