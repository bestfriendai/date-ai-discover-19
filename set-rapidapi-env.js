// Script to set the RapidAPI key as an environment variable for the search-events function
import fetch from 'node-fetch';

// Configuration
const config = {
  projectRef: 'akwvmljopucsnorvdwuu',
  functionName: 'search-events',
  rapidApiKey: '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'
};

async function setRapidApiEnv() {
  try {
    console.log('Setting RapidAPI key as environment variable...');
    
    // You need to get your service role key from the Supabase dashboard
    // This is required to update function environment variables
    const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!serviceRoleKey) {
      console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set.');
      console.log('Please set your Supabase service role key as an environment variable:');
      console.log('  export SUPABASE_SERVICE_KEY=your_service_role_key');
      console.log('Or provide manual instructions for setting the environment variable.');
      return;
    }
    
    // Set the environment variables using the Supabase API
    const url = `https://api.supabase.com/v1/projects/${config.projectRef}/functions/${config.functionName}/env`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        RAPIDAPI_KEY: config.rapidApiKey,
        X_RAPIDAPI_KEY: config.rapidApiKey,
        REAL_TIME_EVENTS_API_KEY: config.rapidApiKey
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      
      console.log('\nAlternative method:');
      console.log('1. Go to the Supabase dashboard: https://app.supabase.com/project/akwvmljopucsnorvdwuu/settings/functions');
      console.log('2. Find the search-events function');
      console.log('3. Add the following environment variables:');
      console.log(`   - RAPIDAPI_KEY: ${config.rapidApiKey}`);
      console.log(`   - X_RAPIDAPI_KEY: ${config.rapidApiKey}`);
      console.log(`   - REAL_TIME_EVENTS_API_KEY: ${config.rapidApiKey}`);
      console.log('4. Save the changes');
      return;
    }
    
    const data = await response.json();
    console.log('Environment variables set successfully!');
    console.log('Response:', data);
    
    console.log('\nYou can now test the RapidAPI integration with:');
    console.log('  node test-rapidapi.js');
    
  } catch (error) {
    console.error('Error setting environment variables:', error);
    
    console.log('\nPlease set the environment variables manually:');
    console.log('1. Go to the Supabase dashboard: https://app.supabase.com/project/akwvmljopucsnorvdwuu/settings/functions');
    console.log('2. Find the search-events function');
    console.log('3. Add the following environment variables:');
    console.log(`   - RAPIDAPI_KEY: ${config.rapidApiKey}`);
    console.log(`   - X_RAPIDAPI_KEY: ${config.rapidApiKey}`);
    console.log(`   - REAL_TIME_EVENTS_API_KEY: ${config.rapidApiKey}`);
    console.log('4. Save the changes');
  }
}

setRapidApiEnv();
