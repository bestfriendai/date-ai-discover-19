/**
 * Test script for the search-events function with location filtering
 * This script tests that the function only returns events near the specified location
 */

const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const FUNCTION_NAME = 'search-events';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

// Test locations
const LOCATIONS = [
  {
    name: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 30 // miles
  },
  {
    name: 'Los Angeles',
    latitude: 34.0522,
    longitude: -118.2437,
    radius: 30 // miles
  }
];

// Test function
async function testLocationFiltering() {
  console.log('Testing search-events function with location filtering...');
  console.log('=======================================================');
  
  for (const location of LOCATIONS) {
    console.log(`\nTesting location: ${location.name}`);
    console.log(`Coordinates: ${location.latitude}, ${location.longitude}`);
    console.log(`Radius: ${location.radius} miles`);
    
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: location.radius,
          startDate: new Date().toISOString().split('T')[0], // Today
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          limit: 50
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText}`);
        continue;
      }
      
      const data = await response.json();
      
      // Log results
      console.log(`Total events returned: ${data.events.length}`);
      console.log(`Events with coordinates: ${data.events.filter(e => e.coordinates).length}`);
      
      // Check source stats
      console.log('\nSource stats:');
      console.log(`Ticketmaster: ${data.sourceStats.ticketmaster.count} events`);
      console.log(`PredictHQ: ${data.sourceStats.predicthq.count} events`);
      
      // Verify all events have coordinates and are within radius
      const eventsWithCoords = data.events.filter(e => e.coordinates);
      const eventsWithinRadius = eventsWithCoords.filter(event => {
        const distance = calculateDistance(
          location.latitude, 
          location.longitude, 
          event.coordinates[1], 
          event.coordinates[0]
        );
        return distance <= location.radius * 1.60934; // Convert miles to km
      });
      
      console.log(`\nEvents within ${location.radius} miles radius: ${eventsWithinRadius.length}/${eventsWithCoords.length}`);
      
      // Check if any events are outside the radius
      const eventsOutsideRadius = eventsWithCoords.filter(event => {
        const distance = calculateDistance(
          location.latitude, 
          location.longitude, 
          event.coordinates[1], 
          event.coordinates[0]
        );
        return distance > location.radius * 1.60934; // Convert miles to km
      });
      
      if (eventsOutsideRadius.length > 0) {
        console.error(`\n⚠️ Found ${eventsOutsideRadius.length} events outside the specified radius!`);
        
        // Log the first 3 events outside radius with their distances
        console.error('\nSample events outside radius:');
        eventsOutsideRadius.slice(0, 3).forEach(event => {
          const distance = calculateDistance(
            location.latitude, 
            location.longitude, 
            event.coordinates[1], 
            event.coordinates[0]
          );
          console.error(`- ${event.title} (${event.id}): ${Math.round(distance / 1.60934)} miles away`);
        });
      } else {
        console.log('\n✅ All events are within the specified radius!');
      }
      
      // Sample of events
      console.log('\nSample events:');
      data.events.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. ${event.title} (${event.source})`);
        console.log(`   Date: ${event.date} ${event.time || ''}`);
        console.log(`   Location: ${event.location}`);
        if (event.coordinates) {
          const distance = calculateDistance(
            location.latitude, 
            location.longitude, 
            event.coordinates[1], 
            event.coordinates[0]
          );
          console.log(`   Distance: ${Math.round(distance / 1.60934)} miles`);
        } else {
          console.log('   No coordinates available');
        }
        console.log('');
      });
      
    } catch (error) {
      console.error(`Error testing ${location.name}:`, error);
    }
  }
}

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Run the test
testLocationFiltering().catch(console.error);