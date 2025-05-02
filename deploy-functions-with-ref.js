// Script to deploy Supabase Edge Functions with project reference
import { execSync } from 'child_process';

// Configuration
const projectRef = 'akwvmljopucsnorvdwuu'; // DateApril project
const functions = [
  'search-events-unified',
  'get-mapbox-token',
  'rapidapi-events',
  'search-events'
];

// Deploy functions
async function deployFunctions() {
  console.log('Deploying Supabase Edge Functions to DateApril project...');

  for (const functionName of functions) {
    try {
      console.log(`\nDeploying ${functionName}...`);

      // Deploy the function with project reference
      execSync(`supabase functions deploy ${functionName} --project-ref ${projectRef}`, { stdio: 'inherit' });

      console.log(`Successfully deployed ${functionName}!`);
    } catch (error) {
      console.error(`Error deploying ${functionName}:`, error.message);
    }
  }

  console.log('\nAll functions deployed!');

  // Set environment variables
  try {
    console.log('\nSetting environment variables...');

    // Set Mapbox token
    const mapboxToken = 'pk.eyJ1IjoiYmVzdGZyaWVuZGFpIiwiYSI6ImNsdGJtZnRnZzBhcGoya3BjcWVtbWJvdXcifQ.Zy8lxHYC_-4TQU_l-l_QQA';
    execSync(`supabase secrets set MAPBOX_TOKEN="${mapboxToken}" --project-ref ${projectRef}`, { stdio: 'inherit' });

    // Set RapidAPI key
    const rapidApiKey = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';
    execSync(`supabase secrets set RAPIDAPI_KEY="${rapidApiKey}" X_RAPIDAPI_KEY="${rapidApiKey}" REAL_TIME_EVENTS_API_KEY="${rapidApiKey}" --project-ref ${projectRef}`, { stdio: 'inherit' });

    console.log('Environment variables set successfully!');
  } catch (error) {
    console.error('Error setting environment variables:', error.message);
  }

  console.log('\nNext steps:');
  console.log('1. Test the functions:');
  console.log('   - Run: node test-unified-function.js');
  console.log('   - Or open test-rapidapi-browser.html in your browser');
}

// Run the deployment
deployFunctions();
