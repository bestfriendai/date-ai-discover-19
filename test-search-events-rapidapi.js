// Test script for verifying RapidAPI-only search-events function
import fetch from 'node-fetch';

// --- Configuration ---
const SUPABASE_PROJECT_REF = 'akwvmljopucsnorvdwuu'; // Replace if different
const SUPABASE_FUNCTION_NAME = 'search-events';
// IMPORTANT: Replace with your actual Supabase Anon Key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';
const FUNCTION_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/${SUPABASE_FUNCTION_NAME}`;
// --- End Configuration ---

async function testSearchEvents(params, testName) {
  console.log(`\n=== TEST SCENARIO: ${testName} ===`);
  console.log(`Testing function at: ${FUNCTION_URL}`);
  console.log(`Parameters: ${JSON.stringify(params, null, 2)}`);

  const startTime = Date.now();
  let response;
  let data = null;
  let errorInfo = null;
  let success = false;
  let eventCount = 0;
  let sampleTitles = [];

  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(params)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      errorInfo = `${response.status} ${response.statusText}: ${errorText}`;
    } else {
      data = await response.json();
      success = true;
      eventCount = data.events?.length || 0;
      sampleTitles = data.events?.slice(0, 2).map(e => e.title) || [];
      console.log(`Success! Received ${eventCount} events in ${responseTime}ms`);
      console.log(`Sample Titles: ${sampleTitles.length > 0 ? sampleTitles.join(', ') : 'None'}`);
      // Optional: Log source stats if needed
      // console.log(`Source Stats: ${JSON.stringify(data.sourceStats, null, 2)}`);
    }
  } catch (error) {
    console.error("Error during fetch:", error);
    errorInfo = error.message;
  } finally {
     const responseTime = Date.now() - startTime;
     console.log(`Request finished in ${responseTime}ms`);
     return {
       testName,
       success,
       statusCode: response?.status || null,
       eventCount,
       sampleTitles,
       error: errorInfo,
       responseTime
     };
  }
}

async function runAllTests() {
  const results = [];
  const commonParams = {
    limit: 10, // Limit results for testing speed
    // Optional: Add date range if needed, e.g.,
    // startDate: new Date().toISOString().split('T')[0],
    // endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };

  // Case 1: General Events by Location
  results.push(await testSearchEvents({
    ...commonParams,
    location: "New York",
    radius: 30
  }, "General Events by Location (New York)"));

  // Case 2: General Events by Coordinates
  results.push(await testSearchEvents({
    ...commonParams,
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 30
  }, "General Events by Coordinates (New York)"));

  // Case 3: Party Events by Location
  results.push(await testSearchEvents({
    ...commonParams,
    location: "Miami",
    categories: ["party"],
    radius: 30
  }, "Party Events by Location (Miami)"));

  // Case 4: Party Events by Coordinates
  results.push(await testSearchEvents({
    ...commonParams,
    latitude: 25.7617,
    longitude: -80.1918,
    categories: ["party"],
    radius: 30
  }, "Party Events by Coordinates (Miami)"));

  // Case 5: Keyword Search
  results.push(await testSearchEvents({
    ...commonParams,
    keyword: "concert",
    location: "Los Angeles",
    radius: 30
  }, "Keyword Search (concert, Los Angeles)"));

  // Print summary of all tests
  console.log("\n\n=== FINAL TEST RESULTS SUMMARY ===");
  results.forEach(result => {
    console.log(`\nTest: ${result.testName}`);
    console.log(`  Outcome: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Status Code: ${result.statusCode || 'N/A'}`);
    console.log(`  Events Received: ${result.eventCount}`);
    if (result.sampleTitles.length > 0) {
       console.log(`  Sample Titles: ${result.sampleTitles.join('; ')}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
     console.log(`  Response Time: ${result.responseTime}ms`);
  });
  console.log("\n=== END OF TESTS ===");
}

runAllTests();