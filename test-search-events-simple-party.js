// Test script for the deployed search-events-simple function specifically for party events
import fetch from 'node-fetch';

async function testSearchEventsSimpleParty() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events-simple';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters specifically for party events
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      location: "New York",
      radius: 100,
      categories: ['party'],
      limit: 20,
      page: 1,
      startDate: today,
      keyword: "party club nightlife dance dj festival"
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

    // Check for party-related events
    const partyKeywords = ['party', 'club', 'nightlife', 'dance', 'dj', 'festival'];
    const partyEvents = data.events.filter(event => {
      const title = event.title.toLowerCase();
      const description = (event.description || '').toLowerCase();
      return partyKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
    });

    console.log(`\nFound ${partyEvents.length} party-related events out of ${data.events.length} total events`);

    // Print party-related events
    if (partyEvents.length > 0) {
      console.log("\nParty-related events:");
      partyEvents.forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Category: ${event.category || 'N/A'}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location || 'N/A'}`);
        console.log(`Source: ${event.source || 'N/A'}`);
      });
    } else {
      console.log("No party-related events found.");
    }

  } catch (error) {
    console.error("Error testing function:", error);
  }
}

testSearchEventsSimpleParty();
