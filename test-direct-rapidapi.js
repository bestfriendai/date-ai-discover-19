// Simple test script for the direct RapidAPI integration

import { searchEvents } from './direct-rapidapi-integration.js';

async function testRapidAPIIntegration() {
  try {
    console.log('Testing direct RapidAPI integration...');
    
    // Test with coordinates (New York City)
    const result = await searchEvents({
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 30,
      categories: ['party'],
      limit: 10
    });
    
    console.log(`Found ${result.events.length} events`);
    
    // Log the first event
    if (result.events.length > 0) {
      const event = result.events[0];
      console.log('First event:');
      console.log(`- Title: ${event.title}`);
      console.log(`- Date: ${event.date}`);
      console.log(`- Location: ${event.location}`);
      console.log(`- Category: ${event.category}`);
      console.log(`- Party Subcategory: ${event.partySubcategory}`);
      console.log(`- Is Party Event: ${event.isPartyEvent}`);
      console.log(`- Coordinates: ${event.coordinates}`);
      console.log(`- URL: ${event.url}`);
    }
    
    // Log source stats
    console.log('Source stats:', result.sourceStats);
    
  } catch (error) {
    console.error('Error testing RapidAPI integration:', error);
  }
}

// Run the test
testRapidAPIIntegration();
