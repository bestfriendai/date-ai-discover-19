// Test script to analyze party events from the simple-events function
import fetch from 'node-fetch';

async function testSimpleEventsAnalyze() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'simple-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters - broader search
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      keyword: "party",
      radius: 100,
      limit: 20,
      page: 1,
      startDate: today // Add the required startDate
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
    
    // Count events by category
    const categoryCounts = {};
    data.events.forEach(event => {
      categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    });

    console.log('\nEvents by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`${category}: ${count}`);
    });

    // Analyze party-related keywords in titles
    const keywordCounts = {
      'party': 0,
      'club': 0,
      'nightlife': 0,
      'dance': 0,
      'dj': 0,
      'festival': 0
    };

    data.events.forEach(event => {
      const title = event.title.toLowerCase();
      Object.keys(keywordCounts).forEach(keyword => {
        if (title.includes(keyword)) {
          keywordCounts[keyword]++;
        }
      });
    });

    console.log('\nKeyword counts in titles:');
    Object.entries(keywordCounts).forEach(([keyword, count]) => {
      console.log(`${keyword}: ${count}`);
    });

    // Analyze locations
    const locationCounts = {};
    data.events.forEach(event => {
      const location = event.location || 'Unknown';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    console.log('\nTop locations:');
    Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([location, count]) => {
        console.log(`${location}: ${count}`);
      });

    // Print all events
    if (data.events && data.events.length > 0) {
      console.log("\nAll events:");
      data.events.forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Category: ${event.category || 'N/A'}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location || 'N/A'}`);
        console.log(`Source: ${event.source || 'N/A'}`);
        
        // Check which party-related keywords are in the title
        const title = event.title.toLowerCase();
        const matchedKeywords = Object.keys(keywordCounts).filter(keyword => 
          title.includes(keyword)
        );
        
        console.log(`Matched keywords: ${matchedKeywords.join(', ') || 'None'}`);
      });
    } else {
      console.log("No events found.");
    }

  } catch (error) {
    console.error("Error testing function:", error);
  }
}

testSimpleEventsAnalyze();
