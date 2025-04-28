// Test script for the test-rapidapi function
import fetch from 'node-fetch';

async function testRapidAPIEnv() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'test-rapidapi';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    console.log(`Testing RapidAPI environment variables at: ${url}`);

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
    
    // Check if RapidAPI keys are set
    if (data.environment) {
      console.log('\nRapidAPI Environment Variables:');
      console.log(`RAPIDAPI_KEY: ${data.environment.RAPIDAPI_KEY}`);
      console.log(`X_RAPIDAPI_KEY: ${data.environment.X_RAPIDAPI_KEY}`);
      console.log(`REAL_TIME_EVENTS_API_KEY: ${data.environment.REAL_TIME_EVENTS_API_KEY}`);
      
      const allKeysSet = 
        data.environment.RAPIDAPI_KEY.startsWith('SET:') &&
        data.environment.X_RAPIDAPI_KEY.startsWith('SET:') &&
        data.environment.REAL_TIME_EVENTS_API_KEY.startsWith('SET:');
        
      if (allKeysSet) {
        console.log('\n✅ All RapidAPI keys are properly set!');
      } else {
        console.log('\n❌ Some RapidAPI keys are missing!');
      }
    }
  } catch (error) {
    console.error("Error testing RapidAPI environment:", error);
  }
}

testRapidAPIEnv();