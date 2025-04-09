// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

// Verify the API keys
async function verifyApiKeys() {
  console.log('Verifying Search API Keys...');
  
  // Check Serper API Key
  const serperKey = process.env.SERPER_API_KEY;
  const serperKeyValid = serperKey && serperKey.length > 10 && !serperKey.includes('your-serper-api-key-here');
  
  console.log('SERPER_API_KEY:', serperKeyValid ? 
    `Valid (${serperKey.substring(0, 5)}...)` : 
    'Invalid or not set');
  
  // Check SerpAPI Key
  const serpApiKey = process.env.SERPAPI_API_KEY;
  const serpApiKeyValid = serpApiKey && serpApiKey.length > 10 && !serpApiKey.includes('your-serpapi-api-key-here');
  
  console.log('SERPAPI_API_KEY:', serpApiKeyValid ? 
    `Valid (${serpApiKey.substring(0, 5)}...)` : 
    'Invalid or not set');
  
  if (serperKeyValid) {
    // Test a simple Serper API call
    console.log('\nTesting Serper API with a simple query...');
    
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': serperKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          q: 'test query',
          gl: 'us',
          hl: 'en',
          num: 1
        })
      });
      
      if (response.ok) {
        console.log('Serper API test: SUCCESS - API responded with status', response.status);
        
        // Show one result
        const data = await response.json();
        if (data.organic && data.organic.length > 0) {
          console.log('Example result:', data.organic[0].title);
        }
      } else {
        console.log('Serper API test: FAILED - API responded with status', response.status);
        console.log('Error:', await response.text());
      }
    } catch (error) {
      console.log('Serper API test: FAILED - Error connecting to API');
      console.error(error);
    }
  }
  
  if (serpApiKeyValid) {
    // Test a simple SerpApi call
    console.log('\nTesting SerpAPI with a simple query...');
    
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('q', 'test query');
      url.searchParams.append('api_key', serpApiKey);
      url.searchParams.append('engine', 'google');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('SerpAPI test: SUCCESS - API responded with status', response.status);
        
        // Show one result
        const data = await response.json();
        if (data.organic_results && data.organic_results.length > 0) {
          console.log('Example result:', data.organic_results[0].title);
        }
      } else {
        console.log('SerpAPI test: FAILED - API responded with status', response.status);
        console.log('Error:', await response.text());
      }
    } catch (error) {
      console.log('SerpAPI test: FAILED - Error connecting to API');
      console.error(error);
    }
  }
}

// Run the verification
verifyApiKeys(); 