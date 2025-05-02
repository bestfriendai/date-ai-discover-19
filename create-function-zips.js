// Script to create zip files for Supabase Edge Functions
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const functions = [
  'search-events-unified',
  'get-mapbox-token',
  'rapidapi-events',
  'search-events'
];

// Create zip files
async function createZipFiles() {
  console.log('Creating zip files for Supabase Edge Functions...');
  
  for (const functionName of functions) {
    try {
      console.log(`\nCreating zip for ${functionName}...`);
      
      // Check if function directory exists
      const functionDir = path.join('supabase', 'functions', functionName);
      if (!fs.existsSync(functionDir)) {
        console.error(`Function directory not found: ${functionDir}`);
        continue;
      }
      
      // Create zip file
      const zipPath = path.join('supabase', `${functionName}-deploy.zip`);
      
      // Change to function directory
      process.chdir(functionDir);
      
      // Create zip file (using zip command on macOS)
      execSync(`zip -r ../../../${zipPath} .`, { stdio: 'inherit' });
      
      // Return to root directory
      process.chdir('../../..');
      
      console.log(`Successfully created zip for ${functionName} at ${zipPath}`);
    } catch (error) {
      console.error(`Error creating zip for ${functionName}:`, error.message);
    }
  }
  
  console.log('\nAll zip files created!');
  console.log('\nNext steps:');
  console.log('1. Upload the zip files to Supabase through the dashboard:');
  console.log('   - Go to https://supabase.com/dashboard/project/akwvmljopucsnorvdwuu/functions');
  console.log('   - For each function, click "New Function" or update existing');
  console.log('   - Upload the corresponding zip file');
  console.log('2. Set environment variables in the Supabase dashboard:');
  console.log('   - MAPBOX_TOKEN=pk.eyJ1IjoiYmVzdGZyaWVuZGFpIiwiYSI6ImNsdGJtZnRnZzBhcGoya3BjcWVtbWJvdXcifQ.Zy8lxHYC_-4TQU_l-l_QQA');
  console.log('   - RAPIDAPI_KEY=92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9');
  console.log('   - X_RAPIDAPI_KEY=92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9');
  console.log('   - REAL_TIME_EVENTS_API_KEY=92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9');
}

// Run the function
createZipFiles();
