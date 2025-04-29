// Test script for verifying RapidAPI integration fixes in search-events function
import fetch from 'node-fetch';

// Add type: module to package.json or use .mjs extension

async function testSearchEvents(params, testName) {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    console.log(`\n=== TEST SCENARIO: ${testName} ===`);
    console.log(`Testing function at: ${url}`);
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);

    // Get the anon key from Supabase project settings
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(params)
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return {
        success: false,
        error: `${response.status} ${response.statusText}: ${errorText}`,
        responseTime
      };
    }

    const data = await response.json();
    console.log(`Success! Received ${data.events?.length || 0} events in ${responseTime}ms`);

    // Check if RapidAPI was used
    const rapidApiUsed = data.sourceStats?.rapidapi?.count > 0;
    console.log(`RapidAPI used: ${rapidApiUsed ? 'YES' : 'NO'}`);
    console.log(`RapidAPI events: ${data.sourceStats?.rapidapi?.count || 0}`);
    console.log(`RapidAPI error: ${data.sourceStats?.rapidapi?.error || 'None'}`);

    // Check for party events
    const partyEvents = data.events?.filter(event =>
      event.category === 'party' ||
      event.isPartyEvent === true
    );

    // Check for party subcategories
    const partySubcategories = {};
    partyEvents?.forEach(event => {
      const subcategory = event.partySubcategory || 'unknown';
      partySubcategories[subcategory] = (partySubcategories[subcategory] || 0) + 1;
    });
    console.log('Party subcategories:', partySubcategories);
    console.log(`Party events found: ${partyEvents?.length || 0} out of ${data.events?.length || 0}`);

    // Check for events with coordinates
    const eventsWithCoordinates = data.events?.filter(event =>
      event.coordinates &&
      Array.isArray(event.coordinates) &&
      event.coordinates.length === 2
    );
    console.log(`Events with coordinates: ${eventsWithCoordinates?.length || 0} out of ${data.events?.length || 0}`);

    // Print summary of first 3 events
    if (data.events && data.events.length > 0) {
      console.log("\n=== EVENT SUMMARY (first 3) ===");
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\n--- Event ${index + 1}: ${event.title} ---`);
        console.log(`Category: ${event.category}`);
        console.log(`Is Party Event: ${event.isPartyEvent ? 'Yes' : 'No'}`);
        console.log(`Party Subcategory: ${event.partySubcategory || 'N/A'}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Source: ${event.source}`);
        console.log(`Coordinates: ${JSON.stringify(event.coordinates)}`);
        console.log(`URL: ${event.url || 'N/A'}`);
      });
    }

    return {
      success: true,
      eventCount: data.events?.length || 0,
      partyEventCount: partyEvents?.length || 0,
      eventsWithCoordinatesCount: eventsWithCoordinates?.length || 0,
      responseTime,
      sourceStats: data.sourceStats
    };
  } catch (error) {
    console.error("Error testing function:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  // Common parameters
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const endDate = futureDate.toISOString().split('T')[0];

  // Test 1: Party event search with location name only
  const test1Result = await testSearchEvents({
    location: "Miami",
    categories: ['party'],
    limit: 100,
    startDate: today,
    endDate: endDate
  }, "Party events with location name only");

  // Test 2: Party event search with coordinates only
  const test2Result = await testSearchEvents({
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 25,
    categories: ['party'],
    limit: 100,
    startDate: today,
    endDate: endDate
  }, "Party events with coordinates only");

  // Test 3: Party event search with both location name and coordinates
  const test3Result = await testSearchEvents({
    location: "Las Vegas",
    latitude: 36.1699,
    longitude: -115.1398,
    radius: 25,
    categories: ['party'],
    limit: 100,
    startDate: today,
    endDate: endDate
  }, "Party events with both location name and coordinates");

  // Test 4: Party event search with specific keyword
  const test4Result = await testSearchEvents({
    location: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    radius: 25,
    categories: ['party'],
    keyword: "nightclub",
    limit: 100,
    startDate: today,
    endDate: endDate
  }, "Party events with specific keyword");

  // Print summary of all tests
  console.log("\n=== TEST RESULTS SUMMARY ===");
  console.log(`Test 1 (Location only): ${test1Result.success ? 'SUCCESS' : 'FAILED'} - ${test1Result.eventCount || 0} events found (${test1Result.partyEventCount || 0} party events)`);
  console.log(`Test 2 (Coordinates only): ${test2Result.success ? 'SUCCESS' : 'FAILED'} - ${test2Result.eventCount || 0} events found (${test2Result.partyEventCount || 0} party events)`);
  console.log(`Test 3 (Location + Coordinates): ${test3Result.success ? 'SUCCESS' : 'FAILED'} - ${test3Result.eventCount || 0} events found (${test3Result.partyEventCount || 0} party events)`);
  console.log(`Test 4 (Specific keyword): ${test4Result.success ? 'SUCCESS' : 'FAILED'} - ${test4Result.eventCount || 0} events found (${test4Result.partyEventCount || 0} party events)`);
}

runAllTests();