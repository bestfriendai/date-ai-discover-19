// Test script for search-events function
import fetch from 'node-fetch';

async function testSearchEvents() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters
    const params = {
      location: "Chicago",
      radius: 50,
      limit: 10,
      page: 1
      // No specific filters to get more results
    };

    console.log(`Testing function at: ${url}`);
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    // Print first event as sample
    if (data.events && data.events.length > 0) {
      console.log("\nSample event:");
      console.log(JSON.stringify(data.events[0], null, 2));
    }
  } catch (error) {
    console.error("Error testing function:", error);
  }
}

testSearchEvents();
