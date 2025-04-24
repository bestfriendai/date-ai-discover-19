// Test script for the search-events function with specific location parameters
import fetch from 'node-fetch';

async function testSearchEventsLocation() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters with specific location coordinates
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      latitude: 40.7128, // New York City coordinates
      longitude: -74.0060,
      radius: 25, // 25 miles radius
      categories: ['party'],
      limit: 20,
      page: 1,
      startDate: today
    };

    console.log(`Testing deployed function at: ${url}`);
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);

    // Get the service role key from Supabase project settings
    // Use the public anonymous key for invoking deployed functions
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}` // Use Anon Key
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
    
    // Count events by category
    const categoryCounts = {};
    data.events.forEach(event => {
      categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    });

    console.log('\nEvents by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`${category}: ${count}`);
    });

    // Count events by source
    const sourceCounts = {};
    data.events.forEach(event => {
      sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
    });

    console.log('\nEvents by source:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`${source}: ${count}`);
    });

    // Check for events with coordinates (for markers)
    const eventsWithCoordinates = data.events.filter(event => event.coordinates);
    console.log(`\nEvents with coordinates: ${eventsWithCoordinates.length} out of ${data.events.length}`);

    // Calculate distance from user location to each event
    if (data.events && data.events.length > 0) {
      console.log("\nEvents with distance from user location:");
      data.events.forEach((event, index) => {
        if (event.coordinates) {
          const distance = calculateDistance(
            params.latitude, 
            params.longitude, 
            event.coordinates[1], // Latitude
            event.coordinates[0]  // Longitude
          );
          console.log(`\nEvent ${index + 1}:`);
          console.log(`Title: ${event.title}`);
          console.log(`Location: ${event.location || 'N/A'}`);
          console.log(`Distance: ${distance.toFixed(2)} miles`);
          console.log(`Coordinates: [${event.coordinates[0]}, ${event.coordinates[1]}]`);
        }
      });
    } else {
      console.log("No events found.");
    }

  } catch (error) {
    console.error("Error testing function:", error);
  }
}

// Function to calculate distance between two points using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

testSearchEventsLocation();
