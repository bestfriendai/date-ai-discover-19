// Test script for CORS configuration
import fetch from 'node-fetch';

async function testCORS() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events-debug';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    console.log(`Testing CORS for function at: ${url}`);

    // Get the anon key from Supabase project settings
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

    // First, test OPTIONS request (preflight)
    console.log('\nTesting OPTIONS request (preflight)...');
    const optionsResponse = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        'Origin': 'http://localhost:8080',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    console.log(`OPTIONS response status: ${optionsResponse.status} ${optionsResponse.statusText}`);
    
    // Log all response headers
    console.log('OPTIONS response headers:');
    optionsResponse.headers.forEach((value, name) => {
      console.log(`${name}: ${value}`);
    });

    // Now test actual GET request
    console.log('\nTesting GET request...');
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8080',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    console.log(`GET response status: ${getResponse.status} ${getResponse.statusText}`);
    
    // Log all response headers
    console.log('GET response headers:');
    getResponse.headers.forEach((value, name) => {
      console.log(`${name}: ${value}`);
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('GET response body:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await getResponse.text();
      console.error(`GET response error: ${errorText}`);
    }

    // Check if CORS headers are present
    const corsHeadersToCheck = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];

    console.log('\nCORS Headers Check:');
    let allCorsHeadersPresent = true;
    
    corsHeadersToCheck.forEach(header => {
      const optionsHasHeader = optionsResponse.headers.has(header);
      const getHasHeader = getResponse.headers.has(header);
      
      console.log(`${header}: OPTIONS: ${optionsHasHeader ? 'Present' : 'Missing'}, GET: ${getHasHeader ? 'Present' : 'Missing'}`);
      
      if (!optionsHasHeader || !getHasHeader) {
        allCorsHeadersPresent = false;
      }
    });
    
    if (allCorsHeadersPresent) {
      console.log('\n✅ All required CORS headers are present!');
    } else {
      console.log('\n❌ Some CORS headers are missing!');
    }
    
    // Check if the Origin is properly reflected
    const allowOrigin = optionsResponse.headers.get('access-control-allow-origin');
    if (allowOrigin === '*' || allowOrigin === 'http://localhost:8080') {
      console.log('✅ Origin is properly allowed!');
    } else {
      console.log(`❌ Origin is not properly allowed! Got: ${allowOrigin}`);
    }
  } catch (error) {
    console.error("Error testing CORS:", error);
  }
}

testCORS();