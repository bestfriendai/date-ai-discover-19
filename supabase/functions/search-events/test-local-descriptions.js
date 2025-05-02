// Local test script for party event descriptions in the search-events function
// Run with: node --loader ts-node/esm test-local-descriptions.js

import { searchRapidAPIEvents } from './rapidapi-enhanced.ts';

async function testLocalPartyDescriptions() {
  try {
    console.log(`===== TESTING LOCAL PARTY EVENT DESCRIPTIONS =====`);
    
    // Test parameters with specific party category
    const params = {
      latitude: 40.7128, // New York City coordinates
      longitude: -74.0060,
      radius: 25, // 25 miles radius
      categories: ['party'], // Explicitly request party events
      limit: 10, // Limit to 10 events for clearer output
      page: 1
    };
    
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);
    
    // Use the RapidAPI key found in the project
    const RAPIDAPI_KEY = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';
    
    // Call the function directly
    const result = await searchRapidAPIEvents(params, RAPIDAPI_KEY);
    
    if (result.error) {
      console.error(`Error: ${result.error}`);
      return;
    }
    
    const events = result.events || [];
    console.log(`\nSuccess! Received ${events.length} events`);
    
    // Display events with descriptions
    if (events.length > 0) {
      console.log("\n===== PARTY EVENT DESCRIPTIONS =====");
      events.forEach((event, index) => {
        console.log(`\n----- Party Event ${index + 1} -----`);
        console.log(`Title: ${event.title}`);
        console.log(`Subcategory: ${event.partySubcategory || 'N/A'}`);
        console.log(`Venue: ${event.venue || 'N/A'}`);
        console.log(`Location: ${event.location || 'N/A'}`);
        console.log(`Date/Time: ${event.date} ${event.time}`);
        
        // Display the description with clear formatting
        console.log(`\nDESCRIPTION:\n${event.description || 'No description available'}`);
        
        // Add a separator for better readability
        console.log("\n" + "=".repeat(50));
      });
    } else {
      console.log("No events found.");
    }
    
  } catch (error) {
    console.error("Error testing function:", error);
  }
}

// Helper function to run the test
async function run() {
  await testLocalPartyDescriptions();
}

run();