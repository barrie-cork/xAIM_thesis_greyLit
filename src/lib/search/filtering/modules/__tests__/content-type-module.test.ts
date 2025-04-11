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
      expect(enrichedPdf.metadata?.fileType).toBe('PDF');
      expect(enrichedPdf.metadata?.confidence?.fileType).toBeGreaterThan(0);

      const htmlResult = createMockResult('https://example.com/page.html');
      const enrichedHtml = await contentTypeModule.process(htmlResult);
      expect(enrichedHtml.metadata?.fileType).toBe('HTML');
      expect(enrichedHtml.metadata?.confidence?.fileType).toBeGreaterThan(0);
    });

    it('should detect contentType based on URL and snippet patterns', async () => {
      const researchResult = createMockResult('https://example.com/doi/123', {}, 'Study Results', 'Abstract: This paper details...');
      const enrichedResearch = await contentTypeModule.process(researchResult);
      expect(enrichedResearch.metadata?.contentType).toBe('RESEARCH_PAPER');
      expect(enrichedResearch.metadata?.confidence?.contentType).toBeGreaterThan(0);
      
      const blogResult = createMockResult('https://myblog.com/post-about-cats', {}, 'My Cat Post', 'Opinion piece by me...');
      const enrichedBlog = await contentTypeModule.process(blogResult);
       expect(enrichedBlog.metadata?.contentType).toBe('BLOG_POST');
    });
    
    it('should extract publication dates when found', async () => {
      const dateResult = createMockResult('https://news.com/article', {}, 'News Title', 'Published on January 15, 2023, this article...');
      const enrichedDate = await contentTypeModule.process(dateResult);
      expect(enrichedDate.metadata?.publicationDate).toBeInstanceOf(Date);
      expect(enrichedDate.metadata?.publicationYear).toBe(2023);
       expect(enrichedDate.metadata?.confidence?.publicationDate).toBeGreaterThan(0);
    });
    
    it('should identify academic content', async () => {
      // Add a snippet with academic keywords to meet the score threshold
      const academicResult = createMockResult('https://university.edu/paper.pdf', {}, 'Research Paper', 'Abstract: This study investigates...');
      const enrichedAcademic = await contentTypeModule.process(academicResult);
      expect(enrichedAcademic.metadata?.isAcademic).toBe(true);
      expect(enrichedAcademic.metadata?.confidence?.isAcademic).toBeGreaterThan(0);

      const nonAcademicResult = createMockResult('https://commercial.com/product');
      const enrichedNonAcademic = await contentTypeModule.process(nonAcademicResult);
      // Check for falsy (false or undefined is acceptable if not academic)
      expect(enrichedNonAcademic.metadata?.isAcademic).toBeFalsy();
    });
    
    it('should detect language', async () => {
       const englishResult = createMockResult('url', {}, 'Title', 'The quick brown fox jumps over the lazy dog.');
       const enrichedEnglish = await contentTypeModule.process(englishResult);
       expect(enrichedEnglish.metadata?.language).toBe('ENGLISH');
       expect(enrichedEnglish.metadata?.confidence?.language).toBeGreaterThan(0);
       
       const spanishResult = createMockResult('url', {}, 'Titulo', 'El rápido zorro marrón salta sobre el perro perezoso.');
       const enrichedSpanish = await contentTypeModule.process(spanishResult);
        expect(enrichedSpanish.metadata?.language).toBe('SPANISH');
    });
    
    it('should identify organization type', async () => {
       const govResult = createMockResult('https://agency.gov/report');
       const enrichedGov = await contentTypeModule.process(govResult);
       expect(enrichedGov.metadata?.organizationType).toBe(OrganizationType.GOVERNMENT);
       expect(enrichedGov.metadata?.confidence?.organizationType).toBeGreaterThan(0);
       
       const nonprofitResult = createMockResult('https://charity.org/about');
       const enrichedNonprofit = await contentTypeModule.process(nonprofitResult);
       expect(enrichedNonprofit.metadata?.organizationType).toBe(OrganizationType.NONPROFIT);
    });

    it('should respect configuration disabling features', async () => {
      contentTypeModule.updateConfig({ detectFromUrl: false, extractDates: false });
      const pdfResult = createMockResult('https://example.com/document.pdf');
      const dateResult = createMockResult('https://news.com/article', {}, 'News Title', 'Published on January 15, 2023...');
      
      const enrichedPdf = await contentTypeModule.process(pdfResult);
      expect(enrichedPdf.metadata?.fileType).toBeUndefined(); // detectFromUrl is false
      
      const enrichedDate = await contentTypeModule.process(dateResult);
      expect(enrichedDate.metadata?.publicationDate).toBeUndefined(); // extractDates is false
    });

    it('should preserve other existing metadata', async () => {
       const result = createMockResult('https://example.com/page.html', { existing: 'value' });
       const enrichedResult = await contentTypeModule.process(result);
       expect(enrichedResult.metadata?.existing).toBe('value');
       expect(enrichedResult.metadata).toBeDefined();
       expect(enrichedResult.metadata?.fileType).toBe('HTML');
    });
  });

  describe('processBatch', () => {
    it('should process content types for multiple results in a batch', async () => {
      const results = [
        createMockResult('https://example.com/image.jpg', {}, 'Image', 'An image'),
        createMockResult('https://example.com/doc.txt', {}, 'Text', 'Some text'),
        createMockResult('https://unknown.site/path', {}, 'Unknown', 'Unknown content') // No extension
      ];
      const enrichedResults = await contentTypeModule.processBatch(results);

      expect(enrichedResults.length).toBe(3);
      expect(enrichedResults[0].metadata?.fileType).toBe('IMAGE');
      expect(enrichedResults[1].metadata?.fileType).toBe('TEXT'); // Still expect TEXT for .txt
      // Correct the expectation based on the default HTML logic for URLs without recognized extensions
      expect(enrichedResults[2].metadata?.fileType).toBe('HTML');
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