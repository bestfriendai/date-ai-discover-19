// Test script for party events search with 30-mile radius
import fetch from 'node-fetch';

async function testPartyEventsSearch() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters - specifically for party events with 30-mile radius
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      location: "New York",
      radius: 30, // 30-mile radius
      categories: ['party'],
      keyword: 'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR concert OR music',
      limit: 100, // Request 100 events
      page: 1,
      startDate: today
    };

    console.log(`Testing party events search at: ${url}`);
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
    console.log(`Success! Received ${data.events?.length || 0} total events`);
    console.log(`Source stats: ${JSON.stringify(data.sourceStats, null, 2)}`);

    // Filter for RapidAPI events
    const rapidApiEvents = data.events?.filter(event => event.source === 'rapidapi') || [];
    console.log(`\nFound ${rapidApiEvents.length} RapidAPI events`);

    // Analyze events with coordinates
    const eventsWithCoordinates = data.events?.filter(event => 
      event.coordinates && 
      Array.isArray(event.coordinates) && 
      event.coordinates.length === 2
    ) || [];
    
    console.log(`\nEvents with coordinates: ${eventsWithCoordinates.length} (${Math.round(eventsWithCoordinates.length/data.events.length*100)}%)`);

    // Analyze party events
    const partyEvents = data.events?.filter(event => 
      event.category === 'party' || 
      (event.title && event.title.toLowerCase().includes('party')) ||
      (event.description && event.description.toLowerCase().includes('party'))
    ) || [];
    
    console.log(`\nParty-related events: ${partyEvents.length} (${Math.round(partyEvents.length/data.events.length*100)}%)`);

    // Print first 5 events as samples
    console.log("\nSample events:");
    data.events.slice(0, 5).forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`);
      console.log(`Title: ${event.title}`);
      console.log(`Source: ${event.source}`);
      console.log(`Category: ${event.category}`);
      console.log(`Date: ${event.date}`);
      console.log(`Location: ${event.location}`);
      console.log(`Coordinates: ${event.coordinates ? `[${event.coordinates[0]}, ${event.coordinates[1]}]` : 'N/A'}`);
      console.log(`Image: ${event.image ? 'YES' : 'NO'}`);
      console.log(`URL: ${event.url || 'N/A'}`);
    });
    
  } catch (error) {
    console.error("Error testing party events search:", error);
  }
}

testPartyEventsSearch();
