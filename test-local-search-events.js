// Test script for locally running search-events function
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

    // Count events by category
    if (data.events && data.events.length > 0) {
      const categoryCounts = {};
      data.events.forEach(event => {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
      });

      console.log('\nEvents by category:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`${category}: ${count}`);
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error(`Error testing ${testName}:`, error);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('Starting tests for local search-events function...');
  const results = {};

  // Test Case 1: General Events by Location (New York)
  results.generalEventsByLocation = await makeRequest({
    location: "New York",
    radius: 25,
    limit: 10
  }, "General Events by Location (New York)");

  // Test Case 2: General Events by Coordinates (New York)
  results.generalEventsByCoordinates = await makeRequest({
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 25,
    limit: 10
  }, "General Events by Coordinates (New York)");

  // Test Case 3: Party Events by Location (Miami)
  results.partyEventsByLocation = await makeRequest({
    location: "Miami",
    radius: 25,
    categories: ['party'],
    limit: 10
  }, "Party Events by Location (Miami)");

  // Test Case 4: Party Events by Coordinates (Miami)
  results.partyEventsByCoordinates = await makeRequest({
    latitude: 25.7617,
    longitude: -80.1918,
    radius: 25,
    categories: ['party'],
    limit: 10
  }, "Party Events by Coordinates (Miami)");

  // Test Case 5: Keyword Search (concert, Los Angeles)
  results.keywordSearch = await makeRequest({
    location: "Los Angeles",
    keyword: "concert",
    radius: 25,
    limit: 10
  }, "Keyword Search (concert, Los Angeles)");

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

runAllTests();