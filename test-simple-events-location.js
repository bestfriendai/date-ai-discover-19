// Test script for the simple-events function with specific location parameters
import fetch from 'node-fetch';

async function testSimpleEventsLocation() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'simple-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters with specific location coordinates
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      latitude: 40.7128, // New York City coordinates
      longitude: -74.0060,
      radius: 25, // 25 miles radius
      keyword: "party",
      limit: 10,
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
    
    // Calculate distance from user location to each event
    if (data.events && data.events.length > 0) {
      console.log("\nEvents with distance from user location:");
      data.events.forEach((event, index) => {
        // Extract coordinates from the event
        let eventLat, eventLng;
        if (event.coordinates) {
          eventLat = event.coordinates[1]; // Latitude
          eventLng = event.coordinates[0]; // Longitude
        } else if (event.venue_coordinates) {
          eventLat = event.venue_coordinates[1]; // Latitude
          eventLng = event.venue_coordinates[0]; // Longitude
        }

        let distance = "Unknown";
        if (eventLat && eventLng) {
          distance = calculateDistance(
            params.latitude, 
            params.longitude, 
            eventLat,
            eventLng
          ).toFixed(2) + " miles";
        }

        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Category: ${event.category || 'N/A'}`);
        console.log(`Location: ${event.location || 'N/A'}`);
        console.log(`Distance: ${distance}`);
        if (eventLat && eventLng) {
          console.log(`Coordinates: [${eventLng}, ${eventLat}]`);
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

testSimpleEventsLocation();
