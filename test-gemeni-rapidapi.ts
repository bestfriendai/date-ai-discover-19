// Test script for verifying RapidAPI connection in GEMENI/services/eventService.ts
import { searchEvents, getEventById } from './GEMENI/services/eventService';
import { getApiKey } from './GEMENI/config/env';

// Helper function to mask API keys for logging
function maskKey(key: string | undefined): string {
  if (!key) return 'NOT SET';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function testRapidAPIConnection() {
  console.log('=== TESTING RAPIDAPI CONNECTION IN GEMENI ===');
  
  // Test 1: Check if environment variables are correctly set
  console.log('\n--- Test 1: Checking environment variables ---');
  try {
    const rapidApiKey = getApiKey('rapidapi-key');
    const rapidApiEndpoint = getApiKey('rapidapi-events-endpoint');
    
    console.log(`RapidAPI Key: ${rapidApiKey ? `SET: ${maskKey(rapidApiKey)}` : 'NOT SET'}`);
    console.log(`RapidAPI Endpoint: ${rapidApiEndpoint || 'NOT SET'}`);
    
    if (!rapidApiKey || !rapidApiEndpoint) {
      console.error('❌ ERROR: RapidAPI key or endpoint is not set correctly');
      return;
    }
    
    console.log('✅ Environment variables are correctly set');
  } catch (error) {
    console.error('❌ ERROR: Exception while checking environment variables:', error);
    return;
  }
  
  // Test 2: Test searchEvents function with simple parameters
  console.log('\n--- Test 2: Testing searchEvents function ---');
  try {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endDate = futureDate.toISOString().split('T')[0];
    
    const searchParams = {
      location: "Miami",
      categories: ['party'],
      limit: 10,
      startDate: today,
      endDate: endDate
    };
    
    console.log(`Searching for events with params: ${JSON.stringify(searchParams, null, 2)}`);
    
    const searchResult = await searchEvents(searchParams);
    
    if (searchResult.error) {
      console.error(`❌ ERROR: ${searchResult.error}`);
    } else {
      console.log(`✅ Successfully retrieved ${searchResult.events.length} events`);
      console.log('Source Stats:', JSON.stringify(searchResult.sourceStats, null, 2));
      
      // Check if RapidAPI was used
      const rapidApiUsed = searchResult.sourceStats?.rapidapi?.count && searchResult.sourceStats.rapidapi.count > 0;
      console.log(`RapidAPI used: ${rapidApiUsed ? 'YES' : 'NO'}`);
      console.log(`RapidAPI events: ${searchResult.sourceStats?.rapidapi?.count || 0}`);
      console.log(`RapidAPI error: ${searchResult.sourceStats?.rapidapi?.error || 'None'}`);
      
      // Print summary of first 2 events
      if (searchResult.events && searchResult.events.length > 0) {
        console.log("\n=== EVENT SUMMARY (first 2) ===");
        searchResult.events.slice(0, 2).forEach((event, index) => {
          console.log(`\n--- Event ${index + 1}: ${event.title} ---`);
          console.log(`ID: ${event.id}`);
          console.log(`Category: ${event.category}`);
          console.log(`Date: ${event.date}`);
          console.log(`Location: ${event.location}`);
          console.log(`Source: ${event.source}`);
          console.log(`Coordinates: ${JSON.stringify(event.coordinates)}`);
          console.log(`URL: ${event.url || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ ERROR: Exception during searchEvents:', error);
  }
  
  // Test 3: Test getEventById function if we have an event ID
  console.log('\n--- Test 3: Testing getEventById function ---');
  try {
    // Use a hardcoded event ID for testing
    // This should be replaced with an actual event ID from your system
    const eventId = "test-event-id"; // Replace with a real event ID if available
    
    console.log(`Getting event details for ID: ${eventId}`);
    
    const eventResult = await getEventById(eventId);
    
    if (!eventResult) {
      console.error(`❌ ERROR: Could not retrieve event with ID ${eventId}`);
    } else {
      console.log(`✅ Successfully retrieved event: ${eventResult.title}`);
      console.log('Event Details:', JSON.stringify(eventResult, null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR: Exception during getEventById:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testRapidAPIConnection();