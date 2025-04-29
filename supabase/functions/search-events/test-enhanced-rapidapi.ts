/**
 * Test script for the enhanced RapidAPI integration
 * This file can be used to test the improved location-based search functionality
 */

import { searchRapidAPIEvents } from './rapidapi-enhanced.ts';
import { SearchParams } from './types.ts';
import { logError, ErrorSeverity } from './errorHandling.ts';

// Get RapidAPI key from environment
const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') || 
                  Deno.env.get('X_RAPIDAPI_KEY') || 
                  Deno.env.get('REAL_TIME_EVENTS_API_KEY');

if (!rapidApiKey) {
  console.error('RapidAPI key not available. Set RAPIDAPI_KEY environment variable.');
  Deno.exit(1);
}

/**
 * Run a test search with the enhanced RapidAPI integration
 */
async function runTest() {
  console.log('Testing enhanced RapidAPI integration...');
  
  // Test parameters for location-based search
  const testParams: SearchParams = {
    // New York City coordinates
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 30,
    limit: 100,
    categories: ['party', 'music']
  };
  
  console.log(`Searching for events near coordinates: ${testParams.latitude}, ${testParams.longitude}`);
  console.log(`Radius: ${testParams.radius} miles`);
  console.log(`Categories: ${testParams.categories?.join(', ')}`);
  
  try {
    // Call the enhanced RapidAPI integration
    const startTime = Date.now();
    const result = await searchRapidAPIEvents(testParams, rapidApiKey);
    const endTime = Date.now();
    
    console.log(`Search completed in ${endTime - startTime}ms`);
    console.log(`Query used: "${result.searchQueryUsed}"`);
    console.log(`Found ${result.events.length} events`);
    
    if (result.error) {
      console.error(`Error: ${result.error}`);
    } else {
      // Log the first 5 events for inspection
      console.log('\nSample events:');
      result.events.slice(0, 5).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${event.date} at ${event.time}`);
        console.log(`Location: ${event.location}`);
        console.log(`Venue: ${event.venue}`);
        console.log(`Category: ${event.category}${event.isPartyEvent ? ' (Party Event)' : ''}`);
        console.log(`Coordinates: ${event.latitude}, ${event.longitude}`);
        console.log(`URL: ${event.url}`);
      });
      
      // Count events with coordinates
      const eventsWithCoords = result.events.filter(event => 
        event.latitude !== undefined && event.longitude !== undefined &&
        event.latitude !== null && event.longitude !== null
      );
      
      console.log(`\nEvents with coordinates: ${eventsWithCoords.length}/${result.events.length}`);
      
      // Count party events
      const partyEvents = result.events.filter(event => 
        event.isPartyEvent || event.category === 'party'
      );
      
      console.log(`Party events: ${partyEvents.length}/${result.events.length}`);
    }
  } catch (error) {
    logError(error, ErrorSeverity.CRITICAL, 'TEST_SCRIPT');
  }
}

// Run the test
runTest();