// Test script for the updated Supabase functions
import fetch from 'node-fetch';

async function testFunction(functionName, params) {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    console.log(`\n=== Testing ${functionName} function ===`);
    console.log(`URL: ${url}`);
    console.log(`Parameters: ${JSON.stringify(params, null, 2)}`);

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

    if (data.sourceStats) {
      console.log(`Source stats:`);
      Object.entries(data.sourceStats).forEach(([source, stats]) => {
        console.log(`  ${source}: ${stats.count} events${stats.error ? `, Error: ${stats.error}` : ''}`);
      });
    }

    // Count events by category
    if (data.events && data.events.length > 0) {
      const categoryCounts = {};
      data.events.forEach(event => {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
      });

      console.log('\nEvents by category:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });

      // Count events by source
      const sourceCounts = {};
      data.events.forEach(event => {
        sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
      });

      console.log('\nEvents by source:');
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });

      // Check for events with coordinates (for markers)
      const eventsWithCoordinates = data.events.filter(event => event.coordinates);
      console.log(`\nEvents with coordinates: ${eventsWithCoordinates.length} out of ${data.events.length}`);

      // Print sample events
      console.log("\nSample events:");
      data.events.slice(0, 2).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`  Title: ${event.title}`);
        console.log(`  Category: ${event.category || 'N/A'}`);
        if (event.category === 'party' && event.partySubcategory) {
          console.log(`  Party Subcategory: ${event.partySubcategory}`);
        }
        console.log(`  Date: ${event.date}`);
        console.log(`  Location: ${event.location || 'N/A'}`);
        console.log(`  Source: ${event.source || 'N/A'}`);
        console.log(`  Has coordinates: ${!!event.coordinates}`);
        if (event.coordinates) {
          console.log(`  Coordinates: [${event.coordinates[0]}, ${event.coordinates[1]}]`);
        }
      });
    } else {
      console.log("No events found.");
    }

    // Print execution time
    if (data.meta && data.meta.executionTime) {
      console.log(`\nExecution time: ${data.meta.executionTime}ms`);
    }

    return data;
  } catch (error) {
    console.error("Error testing function:", error);
  }
}

async function runTests() {
  // Test parameters
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // 30 days from now

  const params = {
    location: "New York",
    radius: 50,
    categories: ['party', 'music'],
    limit: 20,
    startDate: today,
    endDate: endDate.toISOString().split('T')[0]
  };

  // Test search-events function
  await testFunction('search-events', params);

  // Test simple-events function
  await testFunction('simple-events', params);
}

runTests();
