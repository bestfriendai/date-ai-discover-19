// Test script for the local RapidAPI server
import fetch from 'node-fetch';

async function testLocalRapidAPIServer() {
  try {
    const url = 'http://localhost:3001/functions/v1/search-events-simple';
    
    // Test parameters
    const params = {
      location: "New York",
      radius: 25,
      categories: ['party'],
      limit: 10
    };
    
    console.log(`Testing local RapidAPI server at: ${url}`);
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
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
    
    console.log(`Testing with coordinates: ${JSON.stringify(coordParams, null, 2)}`);
    
    const coordResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(coordParams)
    });
    
    if (!coordResponse.ok) {
      const errorText = await coordResponse.text();
      console.error(`Error: ${coordResponse.status} ${coordResponse.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }
    
    const coordData = await coordResponse.json();
    console.log(`Success! Received ${coordData.events?.length || 0} events for coordinates`);
    
    // Print first 3 events as samples
    if (coordData.events && coordData.events.length > 0) {
      console.log("\nSample events with coordinates:");
      coordData.events.slice(0, 3).forEach((event, index) => {
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
    
  } catch (error) {
    console.error("Error testing local RapidAPI server:", error);
  }
}

testLocalRapidAPIServer();