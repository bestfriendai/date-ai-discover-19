// Test script for the fixed search-events function
import fetch from 'node-fetch';

async function testSearchEventsFixed() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events-fixed';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters for party events
    const params = {
      location: "New York",
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 25,
      categories: ['party'],
      limit: 10
    };

    console.log(`Testing fixed search-events function at: ${url}`);
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);

    // Get the anon key from Supabase project settings
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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

    // Print first 3 events as samples
    if (data.events && data.events.length > 0) {
      console.log("\nSample events:");
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.name}`);
        console.log(`Description: ${event.description ? event.description.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`Date: ${event.date_human_readable || 'N/A'}`);
        console.log(`Venue: ${event.venue?.name || 'N/A'}`);
        console.log(`Location: ${event.venue?.full_address || 'N/A'}`);
        console.log(`Coordinates: [${event.venue?.longitude || 'N/A'}, ${event.venue?.latitude || 'N/A'}]`);
        console.log(`URL: ${event.link || 'N/A'}`);
      });
    } else {
      console.log("\nNo events found.");
    }
  } catch (error) {
    console.error("Error testing fixed search-events function:", error);
  }
}

testSearchEventsFixed();
