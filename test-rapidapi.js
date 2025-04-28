// Test script for RapidAPI integration in search-events function
import fetch from 'node-fetch';

async function testRapidAPIIntegration() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters - specifically for party events
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      location: "New York",
      radius: 25,
      categories: ['party', 'music'],
      limit: 20,
      page: 1,
      startDate: today
    };

    console.log(`Testing RapidAPI integration at: ${url}`);
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

    // Analyze RapidAPI events
    if (rapidApiEvents.length > 0) {
      console.log("\nRapidAPI Events Analysis:");
      
      // Count events with images
      const eventsWithImages = rapidApiEvents.filter(event => 
        event.image && event.image !== 'https://placehold.co/600x400?text=No+Image'
      ).length;
      
      // Count events with URLs/buy links
      const eventsWithUrls = rapidApiEvents.filter(event => event.url).length;
      
      console.log(`Events with images: ${eventsWithImages} (${Math.round(eventsWithImages/rapidApiEvents.length*100)}%)`);
      console.log(`Events with URLs: ${eventsWithUrls} (${Math.round(eventsWithUrls/rapidApiEvents.length*100)}%)`);
      
      // Print first 3 RapidAPI events as samples
      console.log("\nSample RapidAPI events:");
      rapidApiEvents.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Description: ${event.description ? event.description.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`Category: ${event.category}`);
        console.log(`Date: ${event.date}`);
        console.log(`Time: ${event.time}`);
        console.log(`Location: ${event.location}`);
        console.log(`Venue: ${event.venue}`);
        console.log(`Image: ${event.image ? 'YES' : 'NO'}`);
        console.log(`URL: ${event.url || 'N/A'}`);
        console.log(`Price: ${event.price || 'N/A'}`);
        
        // Check ticket info
        if (event.ticketInfo) {
          console.log(`Ticket Info: Available`);
          console.log(`  - Price: ${event.ticketInfo.price || 'N/A'}`);
          console.log(`  - Purchase URL: ${event.ticketInfo.purchaseUrl || 'N/A'}`);
          console.log(`  - Provider: ${event.ticketInfo.provider || 'N/A'}`);
        } else {
          console.log(`Ticket Info: Not available`);
        }
        
        // Check coordinates
        if (event.coordinates) {
          console.log(`Coordinates: [${event.coordinates[0]}, ${event.coordinates[1]}]`);
        } else if (event.latitude && event.longitude) {
          console.log(`Coordinates: [${event.longitude}, ${event.latitude}]`);
        } else {
          console.log(`Coordinates: Not available`);
        }
      });
    } else {
      console.log("\nNo RapidAPI events found. Check if:");
      console.log("1. The RapidAPI key is correctly configured in the Supabase function");
      console.log("2. The RapidAPI service is enabled in the search-events function");
      console.log("3. There are any errors in the source stats related to RapidAPI");
    }
    
    // Check for any RapidAPI errors in the source stats
    if (data.sourceStats && data.sourceStats.rapidapi && data.sourceStats.rapidapi.error) {
      console.log(`\nRapidAPI Error: ${data.sourceStats.rapidapi.error}`);
    }
    
  } catch (error) {
    console.error("Error testing RapidAPI integration:", error);
  }
}

testRapidAPIIntegration();
