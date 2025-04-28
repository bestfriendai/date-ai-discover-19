// Test script for frontend integration with the updated search-events function
import fetch from 'node-fetch';

// Simplified version of the searchEvents function from eventService.ts
async function searchEvents(params) {
  console.log('[TEST] searchEvents called with params:', params);

  try {
    // Ensure all required parameters are present (similar to eventService.ts)
    const searchParams = {
      startDate: params.startDate || new Date().toISOString().split('T')[0],
      endDate: params.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: params.location || 'New York',
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 30,
      categories: params.categories || [],
      keyword: params.keyword || '',
      limit: params.limit || 100
    };

    console.log('[TEST] Processed search params:', searchParams);
    console.log('[TEST] Calling search-events function with params:', JSON.stringify(searchParams));

    // Get the anon key for authorization
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

    // Call the deployed search-events function
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(searchParams)
    });

    if (!response.ok) {
      console.error(`[TEST] HTTP error! status: ${response.status}`);
      const errorText = await response.text();
      console.error(`[TEST] Error details: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[TEST] Error searching events:', error);
    return {
      events: [],
      sourceStats: {
        rapidapi: { count: 0, error: String(error) }
      },
      meta: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}

async function testFrontendIntegration() {
  try {
    console.log('Testing frontend integration with updated search-events function...');
    
    // Test location-based search
    console.log('\n--- Testing location-based search ---');
    const locationParams = {
      location: "New York",
      radius: 25,
      categories: ['party'],
      limit: 10
    };
    
    console.log(`Searching for events with location params: ${JSON.stringify(locationParams, null, 2)}`);
    
    const locationResult = await searchEvents(locationParams);
    
    console.log(`Success! Received ${locationResult.events?.length || 0} events`);
    console.log(`Source stats: ${JSON.stringify(locationResult.sourceStats, null, 2)}`);
    
    // Print first 2 events as samples
    if (locationResult.events && locationResult.events.length > 0) {
      console.log("\nSample events (location-based):");
      locationResult.events.slice(0, 2).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Category: ${event.category}`);
        console.log(`Coordinates: ${event.coordinates}`);
      });
    } else {
      console.log("\nNo events found for location-based search.");
    }
    
    // Test coordinate-based search
    console.log('\n--- Testing coordinate-based search ---');
    const coordParams = {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 25,
      categories: ['party'],
      limit: 10
    };
    
    console.log(`Searching for events with coordinate params: ${JSON.stringify(coordParams, null, 2)}`);
    
    const coordResult = await searchEvents(coordParams);
    
    console.log(`Success! Received ${coordResult.events?.length || 0} events`);
    console.log(`Source stats: ${JSON.stringify(coordResult.sourceStats, null, 2)}`);
    
    // Print first 2 events as samples
    if (coordResult.events && coordResult.events.length > 0) {
      console.log("\nSample events (coordinate-based):");
      coordResult.events.slice(0, 2).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Category: ${event.category}`);
        console.log(`Coordinates: ${event.coordinates}`);
      });
    } else {
      console.log("\nNo events found for coordinate-based search.");
    }
    
    console.log("\n--- Frontend Integration Test Summary ---");
    console.log(`✅ Location-based search: ${locationResult.events?.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Coordinate-based search: ${coordResult.events?.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ All events have coordinates: ${
      coordResult.events?.every(event => event.coordinates) ? 'SUCCESS' : 'FAILED'
    }`);
    
  } catch (error) {
    console.error("Error testing frontend integration:", error);
  }
}

testFrontendIntegration();