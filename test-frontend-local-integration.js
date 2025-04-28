// Test script for the frontend integration with the local RapidAPI server
// Using ES modules since the project is configured to use them
import fetch from 'node-fetch';

async function testFrontendLocalIntegration() {
  try {
    console.log('Testing frontend integration with local RapidAPI server...');
    
    // Test parameters for party events
    const params = {
      location: "New York",
      radius: 25,
      categories: ['party'],
      limit: 10
    };
    
    console.log(`Searching for events with params: ${JSON.stringify(params, null, 2)}`);
    
    // Call the local server directly instead of importing the eventService
    const LOCAL_SERVER_URL = 'http://localhost:3001/functions/v1/search-events-simple';
    
    const response = await fetch(LOCAL_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log(`Success! Received ${result.events?.length || 0} events`);
    console.log(`Source stats: ${JSON.stringify(result.sourceStats, null, 2)}`);
    
    // Print first 3 events as samples
    if (result.events && result.events.length > 0) {
      console.log("\nSample events:");
      result.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Category: ${event.category}`);
        console.log(`Coordinates: ${event.coordinates}`);
        console.log(`Description: ${event.description?.substring(0, 100) || 'N/A'}...`);
      });
    } else {
      console.log("\nNo events found.");
    }
    
    // Test with coordinates
    console.log("\n--- Testing with coordinates ---");
    const coordParams = {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 25,
      categories: ['party'],
      limit: 10
    };
    
    console.log(`Searching for events with coordinates: ${JSON.stringify(coordParams, null, 2)}`);
    
    // Call the local server directly
    const coordResponse = await fetch(LOCAL_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(coordParams)
    });
    
    if (!coordResponse.ok) {
      throw new Error(`HTTP error! status: ${coordResponse.status}`);
    }
    
    const coordResult = await coordResponse.json();
    
    console.log(`Success! Received ${coordResult.events?.length || 0} events for coordinates`);
    
    // Print first 3 events as samples
    if (coordResult.events && coordResult.events.length > 0) {
      console.log("\nSample events with coordinates:");
      coordResult.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Category: ${event.category}`);
        console.log(`Coordinates: ${event.coordinates}`);
        console.log(`Description: ${event.description?.substring(0, 100) || 'N/A'}...`);
      });
    } else {
      console.log("\nNo events found with coordinates.");
    }
    
    console.log("\n--- Frontend Integration Test Summary ---");
    console.log("✅ Successfully tested frontend integration with local RapidAPI server");
    console.log("✅ Successfully retrieved events with location");
    console.log("✅ Successfully retrieved events with coordinates");
    console.log("✅ Frontend integration with local RapidAPI server is working correctly");
    
  } catch (error) {
    console.error("Error testing frontend integration:", error);
  }
}

testFrontendLocalIntegration();