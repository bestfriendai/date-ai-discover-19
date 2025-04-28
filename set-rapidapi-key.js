// Script to set the RapidAPI key for the search-events function
import { createClient } from '@supabase/supabase-js';

// Configuration
const config = {
  projectRef: 'akwvmljopucsnorvdwuu',
  functionName: 'search-events',
  // Use the service role key from your Supabase project settings
  // This is needed to update environment variables
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY',
  rapidApiKey: '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'
};

async function setRapidApiKey() {
  try {
    console.log('Setting RapidAPI key for search-events function...');
    
    // Create Supabase client with service role key
    const supabaseUrl = `https://${config.projectRef}.supabase.co`;
    const supabase = createClient(supabaseUrl, config.supabaseServiceKey);
    
    // Set the environment variable
    const { error } = await supabase.functions.updateConfig(config.functionName, {
      RAPIDAPI_KEY: config.rapidApiKey,
      X_RAPIDAPI_KEY: config.rapidApiKey,
      REAL_TIME_EVENTS_API_KEY: config.rapidApiKey
    });
    
    if (error) {
      console.error('Error setting RapidAPI key:', error);
      return;
    }
    
    console.log('RapidAPI key set successfully!');
    console.log('You can now test the RapidAPI integration with: node test-rapidapi.js');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

setRapidApiKey();
