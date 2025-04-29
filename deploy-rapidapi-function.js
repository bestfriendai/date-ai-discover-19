// Script to deploy the updated RapidAPI function
const { execSync } = require('child_process');

// Configuration
const functionName = 'rapidapi-events';
const rapidApiKey = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';

console.log(`Deploying ${functionName} function with improved RapidAPI integration...`);

try {
  // Navigate to the function directory
  process.chdir(`supabase/functions/${functionName}`);
  console.log(`Changed directory to: ${process.cwd()}`);

  // Deploy the function
  console.log(`Deploying ${functionName}...`);
  execSync(`supabase functions deploy ${functionName}`, { stdio: 'inherit' });
  console.log(`Successfully deployed ${functionName}!`);

  // Set environment variables
  console.log('Setting RapidAPI environment variables...');
  execSync(`supabase secrets set RAPIDAPI_KEY="${rapidApiKey}" X_RAPIDAPI_KEY="${rapidApiKey}" REAL_TIME_EVENTS_API_KEY="${rapidApiKey}"`, { stdio: 'inherit' });
  console.log('Environment variables set successfully!');

  console.log('\nDeployment completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Test the function by making a request to:');
  console.log(`   https://[YOUR_PROJECT_REF].supabase.co/functions/v1/${functionName}`);
  console.log('2. Update your frontend code to use the new function.');
} catch (error) {
  console.error('Error deploying function:', error.message);
  console.log('\nManual deployment instructions:');
  console.log('1. Navigate to the Supabase dashboard');
  console.log('2. Go to Edge Functions');
  console.log(`3. Deploy the ${functionName} function`);
  console.log('4. Set the following environment variables:');
  console.log(`   - RAPIDAPI_KEY: ${rapidApiKey}`);
  console.log(`   - X_RAPIDAPI_KEY: ${rapidApiKey}`);
  console.log(`   - REAL_TIME_EVENTS_API_KEY: ${rapidApiKey}`);
}
