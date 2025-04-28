// Test script for the search-events-debug function
import fetch from 'node-fetch';

async function testSearchEventsDebug() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events-debug';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    console.log(`Testing search-events-debug function at: ${url}`);

    // Get the anon key from Supabase project settings
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('Success! Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check if RapidAPI keys are set and valid
    if (data.environment && data.validation) {
      console.log('\nRapidAPI Environment Variables:');
      console.log(`RAPIDAPI_KEY: ${data.environment.RAPIDAPI_KEY}`);
      console.log(`X_RAPIDAPI_KEY: ${data.environment.X_RAPIDAPI_KEY}`);
      console.log(`REAL_TIME_EVENTS_API_KEY: ${data.environment.REAL_TIME_EVENTS_API_KEY}`);
      
      console.log('\nRapidAPI Key Validation:');
      console.log(`RAPIDAPI_KEY: ${JSON.stringify(data.validation.RAPIDAPI_KEY, null, 2)}`);
      console.log(`X_RAPIDAPI_KEY: ${JSON.stringify(data.validation.X_RAPIDAPI_KEY, null, 2)}`);
      console.log(`REAL_TIME_EVENTS_API_KEY: ${JSON.stringify(data.validation.REAL_TIME_EVENTS_API_KEY, null, 2)}`);
      
      // Check if any key is valid
      const hasValidKey = 
        (data.validation.RAPIDAPI_KEY && data.validation.RAPIDAPI_KEY.isValid) ||
        (data.validation.X_RAPIDAPI_KEY && data.validation.X_RAPIDAPI_KEY.isValid) ||
        (data.validation.REAL_TIME_EVENTS_API_KEY && data.validation.REAL_TIME_EVENTS_API_KEY.isValid);
        
      if (hasValidKey) {
        console.log('\n✅ At least one RapidAPI key is valid!');
      } else {
        console.log('\n❌ No valid RapidAPI keys found!');
      }
    }
  } catch (error) {
    console.error("Error testing search-events-debug function:", error);
  }
}

testSearchEventsDebug();