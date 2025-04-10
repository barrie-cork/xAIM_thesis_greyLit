import { ReadabilityModule } from '../filtering/modules/readability-module';
import { SearchResult as BaseSearchResult } from '../types';

describe('ReadabilityModule', () => {
  let readabilityModule: ReadabilityModule;
  
  beforeEach(() => {
    readabilityModule = new ReadabilityModule();
  });
  
  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(readabilityModule.id).toBe('readability');
      expect(readabilityModule.name).toBe('Readability Analyzer');
      expect(readabilityModule.enabled).toBe(true);
      expect(readabilityModule.getConfig()).toEqual({
        calculateFleschKincaid: true,
        calculateSmog: true,
        calculateColemanLiau: true,
        calculateAutomatedReadability: true,
        calculateAllScores: true,
        minTextLength: 50,
        analyzeTitle: false,
        analyzeSnippet: true
      });
    });
    
    it('should initialize with custom configuration', () => {
      const customConfig = {
        minTextLength: 100,
        analyzeTitle: true,
        calculateFleschKincaid: false
      };
      
      const customModule = new ReadabilityModule(customConfig);
      expect(customModule.getConfig().minTextLength).toBe(100);
      expect(customModule.getConfig().analyzeTitle).toBe(true);
      expect(customModule.getConfig().calculateFleschKincaid).toBe(false);
      
      // Default values should remain unchanged
      expect(customModule.getConfig().calculateSmog).toBe(true);
    });
  });
  
  describe('process method', () => {
    it('should skip processing if text is too short', async () => {
      const mockResult: BaseSearchResult = {
        title: 'Short',
        snippet: 'Text',
        url: 'https://example.com',
        searchEngine: 'google',
        timestamp: new Date()
      };
      
      const result = await readabilityModule.process(mockResult);
      expect(result).toEqual(mockResult);
      expect(result.metadata?.readability).toBeUndefined();
    });
    
    it('should process text and add readability metadata', async () => {
      const mockResult: BaseSearchResult = {
        title: 'Sample Article',
        snippet: 'This is a long text sample that should be analyzed for readability. ' +
          'It contains multiple sentences with varying complexity. The readability module ' +
          'should calculate various scores like Flesch-Kincaid, SMOG, Coleman-Liau, and others. ' +
          'Each of these scores measures the readability of text in different ways, focusing on ' +
          'elements like sentence length, word complexity, and syllable count.',
        url: 'https://example.com',
        searchEngine: 'google',
        timestamp: new Date()
      };
      
      const result = await readabilityModule.process(mockResult);
      
      // Verify metadata structure is correct
      expect(result.metadata?.readability).toBeDefined();
      expect(result.metadata?.readability.scores).toBeDefined();
      expect(result.metadata?.readability.textStats).toBeDefined();
      expect(result.metadata?.readability.calculatedAt).toBeDefined();
      
      // Verify some basic metrics are present
      const { textStats, scores } = result.metadata?.readability!;
      expect(textStats?.wordCount).toBeGreaterThan(0);
      expect(textStats?.sentenceCount).toBeGreaterThan(0);
      expect(textStats?.syllableCount).toBeGreaterThan(0);
      
      // At least one score should be calculated
      expect(
        scores.fleschKincaid !== undefined ||
        scores.smog !== undefined ||
        scores.colemanLiau !== undefined ||
        scores.automatedReadability !== undefined
      ).toBe(true);
      
      // Average grade level should be calculated
      expect(scores.averageGradeLevel).toBeDefined();
    });
    
    it('should use title when configured to do so', async () => {
      const customModule = new ReadabilityModule({
        analyzeTitle: true,
        analyzeSnippet: false,
        minTextLength: 10 // Lower threshold for testing
      });
      
      const mockResult: BaseSearchResult = {
        title: 'This is a moderate length title that should be analyzed for readability.',
        snippet: 'Short snippet',
        url: 'https://example.com',
        searchEngine: 'google',
        timestamp: new Date()
      };
      
      const result = await customModule.process(mockResult);
      
      // Should have readability metadata
      expect(result.metadata?.readability).toBeDefined();
      expect(result.metadata?.readability?.textStats?.wordCount).toBeGreaterThan(5);
    });
    
    it('should process results in batch', async () => {
      const mockResults: BaseSearchResult[] = [
        {
          title: 'Article 1',
          snippet: 'This is a long text sample that should be analyzed for readability.',
          url: 'https://example.com/1',
          searchEngine: 'google',
          timestamp: new Date()
        },
        {
          title: 'Article 2',
          snippet: 'Another sample with sufficient length to be processed by the module.',
          url: 'https://example.com/2',
          searchEngine: 'google',
          timestamp: new Date()
        }
      ];
      
      const results = await readabilityModule.processBatch!(mockResults);
      
      expect(results.length).toBe(2);
      expect(results[0].metadata?.readability).toBeDefined();
      expect(results[1].metadata?.readability).toBeDefined();
    });
  });
  
  describe('config updates', () => {
    it('should update configuration correctly', () => {
      readabilityModule.updateConfig({
        calculateSmog: false,
        minTextLength: 200
      });
      
      expect(readabilityModule.getConfig().calculateSmog).toBe(false);
      expect(readabilityModule.getConfig().minTextLength).toBe(200);
      expect(readabilityModule.getConfig().calculateFleschKincaid).toBe(true); // Unchanged
    });
  });
}); 