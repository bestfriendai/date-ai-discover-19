// Direct test script for RapidAPI connection
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to mask API keys for logging
function maskKey(key) {
  if (!key) return 'NOT SET';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function testRapidAPIConnection() {
  console.log('=== TESTING RAPIDAPI CONNECTION DIRECTLY ===');
  
  // Test 1: Check if environment variables are correctly set
  console.log('\n--- Test 1: Checking environment variables ---');
  const rapidApiKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
  const rapidApiEndpoint = process.env.VITE_RAPIDAPI_EVENTS_ENDPOINT || process.env.RAPIDAPI_EVENTS_ENDPOINT;
  
  console.log(`RapidAPI Key: ${rapidApiKey ? `SET: ${maskKey(rapidApiKey)}` : 'NOT SET'}`);
  console.log(`RapidAPI Endpoint: ${rapidApiEndpoint || 'NOT SET'}`);
  
  if (!rapidApiKey || !rapidApiEndpoint) {
    console.error('❌ ERROR: RapidAPI key or endpoint is not set correctly');
    return;
  }
  
  console.log('✅ Environment variables are correctly set');
  
  // Test 2: Make a direct API call to RapidAPI
  console.log('\n--- Test 2: Making direct API call to RapidAPI ---');
  try {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endDate = futureDate.toISOString().split('T')[0];
    
    // Construct query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('query', 'party in Miami');
    queryParams.append('date', `${today}..${endDate}`);
    queryParams.append('limit', '10');
    
    const url = `${rapidApiEndpoint}?${queryParams.toString()}`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': new URL(rapidApiEndpoint).host,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ERROR: RapidAPI request failed: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`✅ Successfully received response from RapidAPI`);
    console.log(`Response status: ${response.status}`);
    console.log(`Events received: ${data.data?.length || 0}`);
    
    // Print summary of first 2 events
    if (data.data && data.data.length > 0) {
      console.log("\n=== EVENT SUMMARY (first 2) ===");
      data.data.slice(0, 2).forEach((event, index) => {
        console.log(`\n--- Event ${index + 1}: ${event.name || 'No Name'} ---`);
        console.log(`ID: ${event.event_id || 'No ID'}`);
        console.log(`Tags: ${event.tags?.join(', ') || 'No Tags'}`);
        console.log(`Start Time: ${event.start_time || 'No Start Time'}`);
        console.log(`Venue: ${event.venue?.name || 'No Venue'}`);
        console.log(`Location: ${event.venue?.full_address || 'No Location'}`);
        console.log(`Coordinates: ${event.venue?.latitude}, ${event.venue?.longitude}`);
        console.log(`URL: ${event.link || event.ticket_links?.[0]?.link || 'No URL'}`);
      });
    } else {
      console.log("No events found in the response");
    }
    
  } catch (error) {
    console.error('❌ ERROR: Exception during RapidAPI request:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testRapidAPIConnection();
