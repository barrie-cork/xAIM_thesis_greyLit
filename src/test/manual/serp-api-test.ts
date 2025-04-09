import { DEFAULT_SEARCH_CONFIG, FileType, SearchProviderType, SearchService } from '../../lib/search';

/**
 * This is a manual test for the SERP API integration.
 * Run with: npx ts-node src/test/manual/serp-api-test.ts
 */
async function testSearchService() {
  console.log('Starting search service test...');
  
  try {
    // Initialize search service
    const searchService = new SearchService(DEFAULT_SEARCH_CONFIG);
    console.log('Search service initialized');
    
    // Get available providers
    const providers = searchService.getAvailableProviders();
    console.log('Available providers:', providers);
    
    // Test search query building
    const baseQuery = 'diabetes treatment guidelines';
    const fileTypes = [FileType.PDF, FileType.DOC];
    const domain = 'cdc.gov';
    
    const query = SearchService.buildSearchQuery(baseQuery, fileTypes, domain);
    console.log('Built query:', query);
    
    // Execute a search with Serper
    console.log('\nExecuting search with Serper...');
    const serperResults = await searchService.search({
      query: baseQuery,
      fileType: fileTypes,
      domain,
      maxResults: 3,
      providers: [SearchProviderType.SERPER]
    });
    
    // Log results
    console.log(`Found ${serperResults[0].results.length} results with Serper:`);
    serperResults[0].results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.title}`);
      console.log(`URL: ${result.url}`);
      console.log(`Snippet: ${result.snippet.substring(0, 100)}...`);
    });
    
    // Execute a search with SerpApi
    console.log('\nExecuting search with SerpApi...');
    const serpApiResults = await searchService.search({
      query: baseQuery,
      fileType: fileTypes,
      domain,
      maxResults: 3,
      providers: [SearchProviderType.SERPAPI]
    });
    
    // Log results
    console.log(`Found ${serpApiResults[0].results.length} results with SerpApi:`);
    serpApiResults[0].results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.title}`);
      console.log(`URL: ${result.url}`);
      console.log(`Snippet: ${result.snippet.substring(0, 100)}...`);
    });
    
    console.log('\nSearch service test completed successfully!');
  } catch (error) {
    console.error('Error during search service test:', error);
  }
}

// Execute the test
testSearchService(); 