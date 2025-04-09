// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

// Test just the SerpAPI key
async function verifySerpApiKey() {
  console.log('Verifying SerpAPI Key...');
  
  // Get the SerpAPI key from environment variables
  const serpApiKey = process.env.SERPAPI_API_KEY;
  console.log('SERPAPI_API_KEY present:', Boolean(serpApiKey));
  console.log('SERPAPI_API_KEY length:', serpApiKey?.length || 0);
  console.log('SERPAPI_API_KEY first chars:', serpApiKey?.substring(0, 5) + '...');
  
  // Test a simple SerpApi call
  console.log('\nTesting SerpAPI with a simple query...');
  
  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('q', 'test query');
    url.searchParams.append('api_key', serpApiKey);
    url.searchParams.append('engine', 'google');
    
    console.log('Request URL:', url.toString().replace(serpApiKey, '[REDACTED]'));
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    
    const responseText = await response.text();
    console.log('Response text preview:', responseText.substring(0, 200) + '...');
    
    if (response.ok) {
      console.log('SerpAPI test: SUCCESS');
      try {
        const data = JSON.parse(responseText);
        if (data.organic_results && data.organic_results.length > 0) {
          console.log('Example result:', data.organic_results[0].title);
        } else {
          console.log('No organic results found in the response');
        }
      } catch (parseError) {
        console.log('Error parsing JSON response:', parseError.message);
      }
    } else {
      console.log('SerpAPI test: FAILED');
      console.log('Full error:', responseText);
    }
  } catch (error) {
    console.log('SerpAPI test: FAILED - Error connecting to API');
    console.error(error);
  }
}

// Run the verification
verifySerpApiKey(); 