// Test script to debug Ticketmaster date format issues
import fetch from 'node-fetch';

async function testTicketmasterFormat() {
  try {
    // Get the Ticketmaster API key from environment variable
    const apiKey = process.env.TICKETMASTER_KEY || process.env.SUPABASE_TICKETMASTER_KEY;
    if (!apiKey) {
      console.error("TICKETMASTER_KEY environment variable is not set");
      return;
    }

    console.log("Testing Ticketmaster API date format");
    
    // Test different date formats
    const dateFormats = [
      // Format 1: ISO string with milliseconds
      new Date().toISOString(),
      
      // Format 2: ISO string without milliseconds
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      
      // Format 3: Manual format YYYY-MM-DDTHH:mm:ssZ
      (() => {
        const d = new Date();
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        const seconds = String(d.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
      })(),
      
      // Format 4: Just the date part YYYY-MM-DD
      new Date().toISOString().split('T')[0]
    ];
    
    console.log("Testing the following date formats:");
    dateFormats.forEach((format, index) => {
      console.log(`Format ${index + 1}: ${format}`);
    });
    
    // Test each format
    for (let i = 0; i < dateFormats.length; i++) {
      const startDateTime = dateFormats[i];
      
      // Build the Ticketmaster API URL
      const queryParams = new URLSearchParams();
      queryParams.append('apikey', apiKey);
      queryParams.append('startDateTime', startDateTime);
      queryParams.append('size', '1'); // Just get one result
      
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?${queryParams.toString()}`;
      
      console.log(`\nTesting Format ${i + 1}: ${startDateTime}`);
      console.log(`URL: ${url}`);
      
      try {
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
          continue;
        }
        
        const data = await response.json();
        console.log("Success! Format works.");
        console.log({
          page: data.page,
          totalElements: data.page?.totalElements || 0,
          totalPages: data.page?.totalPages || 0,
          size: data.page?.size || 0,
          number: data.page?.number || 0,
          hasEvents: !!data._embedded?.events
        });
        
        // If we found a working format, break out of the loop
        console.log(`Format ${i + 1} works with Ticketmaster API!`);
        console.log(`Use this format: ${startDateTime}`);
        break;
      } catch (error) {
        console.error(`Error testing format ${i + 1}:`, error);
      }
    }
  } catch (error) {
    console.error("Error testing Ticketmaster API:", error);
  }
}

testTicketmasterFormat();