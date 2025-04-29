// Test script for the enhanced direct RapidAPI integration

import { searchEvents } from './direct-rapidapi-integration.js';

async function testRapidAPIIntegration() {
  try {
    console.log('Testing enhanced direct RapidAPI integration...');
    
    // Test with coordinates (New York City)
    const result = await searchEvents({
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 30,
      categories: ['party'],
      limit: 200
    });
    
    console.log(`Found ${result.events.length} events`);
    
    // Log party events count
    const partyEvents = result.events.filter(event => event.isPartyEvent);
    console.log(`Party events: ${partyEvents.length}`);
    
    // Log party subcategories
    const subcategories = {};
    partyEvents.forEach(event => {
      const subcat = event.partySubcategory || 'unknown';
      subcategories[subcat] = (subcategories[subcat] || 0) + 1;
    });
    console.log('Party subcategories:', subcategories);
    
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
    
    // Test with location (Miami)
    console.log('\nTesting with location (Miami)...');
    const locationResult = await searchEvents({
      location: 'Miami',
      radius: 30,
      categories: ['party'],
      limit: 200
    });
    
    console.log(`Found ${locationResult.events.length} events`);
    
    // Log party events count
    const locationPartyEvents = locationResult.events.filter(event => event.isPartyEvent);
    console.log(`Party events: ${locationPartyEvents.length}`);
    
    // Log party subcategories
    const locationSubcategories = {};
    locationPartyEvents.forEach(event => {
      const subcat = event.partySubcategory || 'unknown';
      locationSubcategories[subcat] = (locationSubcategories[subcat] || 0) + 1;
    });
    console.log('Party subcategories:', locationSubcategories);
    
  } catch (error) {
    console.error('Error testing RapidAPI integration:', error);
  }
}

// Run the test
testRapidAPIIntegration();
