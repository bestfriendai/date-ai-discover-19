// Test script for the fixed search-events function specifically for party events
import fetch from 'node-fetch';

async function testSearchEventsFixed() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}?debug=true`;

    // Test parameters specifically for party events
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    const params = {
      latitude: 40.7128,  // New York City coordinates
      longitude: -74.0060,
      radius: 50,
      categories: ['music', 'arts'],  // Using valid categories that often contain party events
      limit: 100,  // Increased limit since we'll filter for parties
      startDate: today.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0]
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

    const responseText = await response.text();
    console.log('Full response:', responseText);
    
    const data = JSON.parse(responseText);
    console.log(`\nSuccess! Received ${data.events?.length || 0} events`);
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

    // Print sample events
    if (data.events && data.events.length > 0) {
      console.log("\nSample events:");
      data.events.slice(0, 5).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Category: ${event.category || 'N/A'}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location || 'N/A'}`);
        console.log(`Source: ${event.source || 'N/A'}`);
        console.log(`Has coordinates: ${!!event.coordinates}`);
        if (event.coordinates) {
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

testSearchEventsFixed();
