// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

// Direct fetch test for Serper API
async function testSerperApi() {
  console.log('Testing Serper API directly...');
  
  try {
    // Get API key from environment variables
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    
    if (!SERPER_API_KEY || SERPER_API_KEY.includes('your-serper-api-key-here')) {
      throw new Error('Valid SERPER_API_KEY environment variable is not set in .env file');
    }
    
    console.log('Using Serper API key:', SERPER_API_KEY.substring(0, 5) + '...');
    
    // Test query
    const query = 'diabetes treatment guidelines site:cdc.gov';
    
    // Make direct fetch request to Serper API
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': SERPER_API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
        num: 3
      })
    });
    
    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('\nSerper API Results:');
    console.log('===================');
    
    if (data.organic && data.organic.length > 0) {
      data.organic.forEach((result, index) => {
        console.log(`\n[${index + 1}] ${result.title}`);
        console.log(`URL: ${result.link}`);
        console.log(`Snippet: ${result.snippet}`);
      });
    } else {
      console.log('No organic results found');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during Serper API test:', error);
  }
}

// Execute the test
testSerperApi(); 