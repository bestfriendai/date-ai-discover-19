// Script to deploy Supabase Edge Functions
const { execSync } = require('child_process');

// Configuration
const functions = [
  'rapidapi-events',
  'rapidapi-debug',
  'search-events'
];

// Deploy functions
async function deployFunctions() {
  console.log('Deploying Supabase Edge Functions...');
  
  for (const functionName of functions) {
    try {
      console.log(`\nDeploying ${functionName}...`);
      
      // Deploy the function
      execSync(`supabase functions deploy ${functionName}`, { stdio: 'inherit' });
      
      console.log(`Successfully deployed ${functionName}!`);
    } catch (error) {
      console.error(`Error deploying ${functionName}:`, error.message);
    }
  }
  
  console.log('\nAll functions deployed!');
  console.log('\nNext steps:');
  console.log('1. Set the RapidAPI key in the Supabase environment:');
  console.log('   - Run: node set-rapidapi-env.js');
  console.log('   - Or set it manually in the Supabase dashboard');
  console.log('2. Test the functions:');
  console.log('   - Open test-rapidapi-browser.html in your browser');
  console.log('   - Or run: node test-rapidapi-key.js');
}

// Run the deployment
deployFunctions();
