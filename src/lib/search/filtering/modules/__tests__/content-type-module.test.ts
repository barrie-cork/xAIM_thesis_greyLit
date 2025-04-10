import { describe, it, expect, beforeEach } from 'vitest';
import { ContentTypeModule, ContentTypeModuleConfig, OrganizationType } from '../content-type-module';
import { SearchResult as BaseSearchResult } from '../../../types'; // Adjust path as needed

// Mock BaseSearchResult data for testing
const createMockResult = (url: string, metadata: Record<string, any> = {}, title: string = 'Test Title', snippet: string = 'Test Snippet'): BaseSearchResult => ({
  title,
  url,
  snippet,
  searchEngine: 'mock',
  timestamp: new Date(),
  metadata: { ...metadata }
});

describe('ContentTypeModule', () => {
  let contentTypeModule: ContentTypeModule;

  beforeEach(() => {
    contentTypeModule = new ContentTypeModule(); // Use default config
  });

  describe('process', () => {
    it('should detect fileType based on URL extension', async () => {
      const pdfResult = createMockResult('https://example.com/document.pdf');
      const enrichedPdf = await contentTypeModule.process(pdfResult);
      // Check the specific metadata structure used by this module
      expect(enrichedPdf.metadata?.contentTypeData?.fileType).toBe('PDF');
      expect(enrichedPdf.metadata?.contentTypeData?.confidence?.fileType).toBeGreaterThan(0);

      const htmlResult = createMockResult('https://example.com/page.html');
      const enrichedHtml = await contentTypeModule.process(htmlResult);
      expect(enrichedHtml.metadata?.contentTypeData?.fileType).toBe('HTML');
    });

    it('should detect contentType based on URL and snippet patterns', async () => {
      const researchResult = createMockResult('https://example.com/doi/123', {}, 'Study Results', 'Abstract: This paper details...');
      const enrichedResearch = await contentTypeModule.process(researchResult);
      expect(enrichedResearch.metadata?.contentTypeData?.contentType).toBe('RESEARCH_PAPER');
      expect(enrichedResearch.metadata?.contentTypeData?.confidence?.contentType).toBeGreaterThan(0);
      
      const blogResult = createMockResult('https://myblog.com/post-about-cats', {}, 'My Cat Post', 'Opinion piece by me...');
      const enrichedBlog = await contentTypeModule.process(blogResult);
       expect(enrichedBlog.metadata?.contentTypeData?.contentType).toBe('BLOG_POST');
    });
    
    it('should extract publication dates when found', async () => {
      const dateResult = createMockResult('https://news.com/article', {}, 'News Title', 'Published on January 15, 2023, this article...');
      const enrichedDate = await contentTypeModule.process(dateResult);
      expect(enrichedDate.metadata?.contentTypeData?.publicationDate).toBeInstanceOf(Date);
      expect(enrichedDate.metadata?.contentTypeData?.publicationYear).toBe(2023);
       expect(enrichedDate.metadata?.contentTypeData?.confidence?.publicationDate).toBeGreaterThan(0);
    });
    
    it('should identify academic content', async () => {
      const academicResult = createMockResult('https://university.edu/paper.pdf');
      const enrichedAcademic = await contentTypeModule.process(academicResult);
      expect(enrichedAcademic.metadata?.contentTypeData?.isAcademic).toBe(true);
       expect(enrichedAcademic.metadata?.contentTypeData?.confidence?.isAcademic).toBeGreaterThan(0);
       
      const nonAcademicResult = createMockResult('https://commercial.com/product');
      const enrichedNonAcademic = await contentTypeModule.process(nonAcademicResult);
       expect(enrichedNonAcademic.metadata?.contentTypeData?.isAcademic).toBe(false);
    });
    
    it('should detect language', async () => {
       const englishResult = createMockResult('url', {}, 'Title', 'The quick brown fox jumps over the lazy dog.');
       const enrichedEnglish = await contentTypeModule.process(englishResult);
       expect(enrichedEnglish.metadata?.contentTypeData?.language).toBe('ENGLISH');
       expect(enrichedEnglish.metadata?.contentTypeData?.confidence?.language).toBeGreaterThan(0);
       
       const spanishResult = createMockResult('url', {}, 'Titulo', 'El rápido zorro marrón salta sobre el perro perezoso.');
       const enrichedSpanish = await contentTypeModule.process(spanishResult);
        expect(enrichedSpanish.metadata?.contentTypeData?.language).toBe('SPANISH');
    });
    
    it('should identify organization type', async () => {
       const govResult = createMockResult('https://agency.gov/report');
       const enrichedGov = await contentTypeModule.process(govResult);
       expect(enrichedGov.metadata?.contentTypeData?.organizationType).toBe(OrganizationType.GOVERNMENT);
       expect(enrichedGov.metadata?.contentTypeData?.confidence?.organizationType).toBeGreaterThan(0);
       
       const nonprofitResult = createMockResult('https://charity.org/about');
       const enrichedNonprofit = await contentTypeModule.process(nonprofitResult);
       expect(enrichedNonprofit.metadata?.contentTypeData?.organizationType).toBe(OrganizationType.NONPROFIT);
    });

    it('should respect configuration disabling features', async () => {
      contentTypeModule.updateConfig({ detectFromUrl: false, extractDates: false });
      const pdfResult = createMockResult('https://example.com/document.pdf');
      const dateResult = createMockResult('https://news.com/article', {}, 'News Title', 'Published on January 15, 2023...');
      
      const enrichedPdf = await contentTypeModule.process(pdfResult);
      expect(enrichedPdf.metadata?.contentTypeData?.fileType).toBeUndefined(); // detectFromUrl is false
      
      const enrichedDate = await contentTypeModule.process(dateResult);
      expect(enrichedDate.metadata?.contentTypeData?.publicationDate).toBeUndefined(); // extractDates is false
    });

    it('should preserve other existing metadata', async () => {
       const result = createMockResult('https://example.com/page.html', { existing: 'value' });
       const enrichedResult = await contentTypeModule.process(result);
       expect(enrichedResult.metadata?.existing).toBe('value');
       expect(enrichedResult.metadata?.contentTypeData).toBeDefined();
       expect(enrichedResult.metadata?.contentTypeData?.fileType).toBe('HTML');
    });
  });

  describe('processBatch', () => {
    // Corrected: processBatch returns Promise<BaseSearchResult[]>
    it('should process content types for multiple results in a batch', async () => {
      const results = [
        createMockResult('https://example.com/image.jpg'),
        createMockResult('https://example.com/styles.css'),
        createMockResult('https://example.com/nodata')
      ];
      const enrichedResults = await contentTypeModule.processBatch(results);
      
      expect(enrichedResults.length).toBe(3);
      expect(enrichedResults[0].metadata?.contentTypeData?.fileType).toBe('IMAGE');
      expect(enrichedResults[1].metadata?.contentTypeData?.fileType).toBe('TEXT'); // Assuming CSS falls under TEXT or needs specific handling
      expect(enrichedResults[2].metadata?.contentTypeData?.fileType).toBeUndefined(); // Or default like HTML
      
      // processBatch doesn't return metrics, just the results array
    });
  });
  
  describe('getConfig/updateConfig', () => {
     it('should return current configuration', () => {
      const config = contentTypeModule.getConfig();
      // Corrected: Assert default config values based on implementation
      expect(config.detectFromUrl).toBe(true);
      expect(config.detectFromSnippet).toBe(true);
      expect(config.extractDates).toBe(true);
      expect(config.identifyAcademic).toBe(true);
      expect(config.detectLanguage).toBe(true);
      expect(config.identifyOrganizationType).toBe(true);
    });

    it('should update configuration correctly', () => {
      // Corrected: Use actual config properties
      contentTypeModule.updateConfig({ detectLanguage: false, identifyAcademic: false });
      const config = contentTypeModule.getConfig();
      expect(config.detectLanguage).toBe(false);
      expect(config.identifyAcademic).toBe(false);
    });
  });
}); 