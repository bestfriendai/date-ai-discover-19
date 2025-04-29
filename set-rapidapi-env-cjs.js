// Script to set the RapidAPI key as an environment variable for Supabase Edge Functions
const fetch = require('node-fetch');

// Configuration
const config = {
  projectRef: 'akwvmljopucsnorvdwuu',
  functions: ['search-events', 'rapidapi-events', 'rapidapi-debug'],
  rapidApiKey: '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'
};

async function setRapidApiEnv() {
  try {
    console.log('Setting RapidAPI key as environment variable...');
    
    // Get the service role key from environment or prompt user
    const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!serviceRoleKey) {
      console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set.');
      console.log('Please set the SUPABASE_SERVICE_KEY environment variable with your Supabase service role key.');
      console.log('You can find this in your Supabase project settings under API > Project API keys > service_role key.');
      console.log('Or provide manual instructions for setting the environment variable.');
      
      // Print manual instructions anyway
      console.log('\nManual method:');
      console.log('1. Go to the Supabase dashboard: https://app.supabase.com/project/akwvmljopucsnorvdwuu/settings/functions');
      console.log('2. For each function (search-events, rapidapi-events, rapidapi-debug):');
      console.log('3. Add the following environment variables:');
      console.log(`   - RAPIDAPI_KEY: ${config.rapidApiKey}`);
      console.log(`   - X_RAPIDAPI_KEY: ${config.rapidApiKey}`);
      console.log(`   - REAL_TIME_EVENTS_API_KEY: ${config.rapidApiKey}`);
      console.log('4. Save the changes');
      return;
    }
    
    // Set the environment variables for each function
    for (const functionName of config.functions) {
      console.log(`Setting environment variables for ${functionName}...`);
      
      // Set the environment variables using the Supabase API
      const url = `https://api.supabase.com/v1/projects/${config.projectRef}/functions/${functionName}/env`;
      
      try {
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
          console.error(`Error setting environment variables for ${functionName}: ${response.status} ${response.statusText}`);
          console.error(`Response: ${errorText}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`Environment variables for ${functionName} set successfully!`);
      } catch (error) {
        console.error(`Error setting environment variables for ${functionName}:`, error);
      }
    }
    
    // For backward compatibility, also try the alternative method
    try {
      console.log('\nTrying alternative method to set environment variables...');
      const response = await fetch(`https://${config.projectRef}.supabase.co/functions/v1/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          name: 'rapidapi-events',
          config: {
            RAPIDAPI_KEY: config.rapidApiKey,
            X_RAPIDAPI_KEY: config.rapidApiKey,
            REAL_TIME_EVENTS_API_KEY: config.rapidApiKey
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText}`);
      } else {
        console.log('Alternative method successful!');
      }
    } catch (error) {
      console.error('Error with alternative method:', error);
    }
    
    console.log('\nManual method:');
    console.log('1. Go to the Supabase dashboard: https://app.supabase.com/project/akwvmljopucsnorvdwuu/settings/functions');
    console.log('2. For each function (search-events, rapidapi-events, rapidapi-debug):');
    console.log('3. Add the following environment variables:');
    console.log(`   - RAPIDAPI_KEY: ${config.rapidApiKey}`);
    console.log(`   - X_RAPIDAPI_KEY: ${config.rapidApiKey}`);
    console.log(`   - REAL_TIME_EVENTS_API_KEY: ${config.rapidApiKey}`);
    console.log('4. Save the changes');
    
    console.log('\nEnvironment variables set successfully!');
    console.log('You can now test the RapidAPI integration with: node test-rapidapi-key.js');
  } catch (error) {
    console.error('Error setting environment variables:', error);
    
    console.log('\nPlease set the environment variables manually:');
    console.log('1. Go to the Supabase dashboard: https://app.supabase.com/project/akwvmljopucsnorvdwuu/settings/functions');
    console.log('2. For each function (search-events, rapidapi-events, rapidapi-debug):');
    console.log('3. Add the following environment variables:');
    console.log(`   - RAPIDAPI_KEY: ${config.rapidApiKey}`);
    console.log(`   - X_RAPIDAPI_KEY: ${config.rapidApiKey}`);
    console.log(`   - REAL_TIME_EVENTS_API_KEY: ${config.rapidApiKey}`);
    console.log('4. Save the changes');
  }
}

setRapidApiEnv();
