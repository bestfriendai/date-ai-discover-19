// Test script for the "Find my location" functionality
import fetch from 'node-fetch';

// Local RapidAPI server endpoint
const LOCAL_ENDPOINT = 'http://localhost:3001/functions/v1/search-events-simple';

// Helper function to make requests to the local function
async function makeRequest(params, testName) {
  console.log(`\n--- Testing ${testName} ---`);
  console.log(`Parameters: ${JSON.stringify(params, null, 2)}`);
  
  try {
    const response = await fetch(LOCAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log(`Success! Received ${data.events?.length || 0} events`);
    console.log(`Source stats: ${JSON.stringify(data.sourceStats, null, 2)}`);
    
    // Print first 3 events as samples
    if (data.events && data.events.length > 0) {
      console.log("\nSample events:");
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Category: ${event.category}`);
        if (event.category === 'party') {
          console.log(`Party Subcategory: ${event.partySubcategory || 'N/A'}`);
        }
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Coordinates: ${event.coordinates ? `[${event.coordinates[0]}, ${event.coordinates[1]}]` : 'N/A'}`);
        console.log(`Source: ${event.source || 'N/A'}`);
      });
    } else {
      console.log("\nNo events found.");
    }

    return { success: true, data };
  } catch (error) {
    console.error(`Error testing ${testName}:`, error);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('Testing "Find my location" functionality with various coordinates...');
  const results = {};

  // Test Case 1: San Francisco coordinates
  results.sanFrancisco = await makeRequest({
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 25,
    categories: ['party'],
    limit: 10
  }, "Find my location in San Francisco");

  // Test Case 2: Chicago coordinates
  results.chicago = await makeRequest({
    latitude: 41.8781,
    longitude: -87.6298,
    radius: 25,
    categories: ['party'],
    limit: 10
  }, "Find my location in Chicago");

  // Test Case 3: Random coordinates (somewhere in Texas)
  results.randomLocation = await makeRequest({
    latitude: 31.9686,
    longitude: -99.9018,
    radius: 25,
    categories: ['party'],
    limit: 10
  }, "Find my location in random location (Texas)");

  // Print summary
  console.log("\n--- Test Summary ---");
  Object.entries(results).forEach(([testName, result]) => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const count = result.data?.events?.length || 0;
    console.log(`${status} - ${testName}: ${count} events`);
  });

  // Check if all tests passed
  const allPassed = Object.values(results).every(result => result.success);
  console.log(`\nOverall result: ${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
}

runTests();