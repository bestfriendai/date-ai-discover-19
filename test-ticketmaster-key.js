// Test script to debug Ticketmaster API key issues
import fetch from 'node-fetch';

async function testTicketmasterKey() {
  try {
    // Get the Ticketmaster API key from environment variable
    const apiKey = process.env.TICKETMASTER_KEY || process.env.SUPABASE_TICKETMASTER_KEY;
    if (!apiKey) {
      console.error("TICKETMASTER_KEY environment variable is not set");
      return;
    }

    console.log("Testing Ticketmaster API key");
    console.log(`API Key: ${apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'}`);
    console.log(`API Key Length: ${apiKey.length}`);
    
    // Make a simple API request to test the key
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&size=1`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log("Success! API key is valid.");
    console.log({
      page: data.page,
      totalElements: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
      size: data.page?.size || 0,
      number: data.page?.number || 0,
      hasEvents: !!data._embedded?.events
    });
    
    // If we have events, print the first one
    if (data._embedded?.events && data._embedded.events.length > 0) {
      const event = data._embedded.events[0];
      console.log("\nSample event:");
      console.log(`Name: ${event.name}`);
      console.log(`Date: ${event.dates?.start?.localDate || 'N/A'}`);
      console.log(`Time: ${event.dates?.start?.localTime || 'N/A'}`);
      console.log(`Venue: ${event._embedded?.venues?.[0]?.name || 'N/A'}`);
      console.log(`City: ${event._embedded?.venues?.[0]?.city?.name || 'N/A'}`);
      console.log(`URL: ${event.url || 'N/A'}`);
    }
  } catch (error) {
    console.error("Error testing Ticketmaster API key:", error);
  }
}

testTicketmasterKey();