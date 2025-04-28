// Test script for the simplified search-events function
import fetch from 'node-fetch';

async function testSearchEventsSimple() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events-simple';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters
    const params = {
      location: "New York",
      radius: 25,
      categories: ['party'],
      limit: 10
    };

    console.log(`Testing simplified search-events function at: ${url}`);
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
        console.log(JSON.stringify(event, null, 2));
      });
    } else {
      console.log("\nNo events found.");
    }
  } catch (error) {
    console.error("Error testing simplified search-events function:", error);
  }
}

testSearchEventsSimple();