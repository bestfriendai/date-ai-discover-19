// Test script for search-events function with detailed output
import fetch from 'node-fetch';

async function testSearchEventsDetails() {
  try {
    const projectRef = 'akwvmljopucsnorvdwuu';
    const functionName = 'search-events';
    const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

    // Test parameters - specifically for party events
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const params = {
      location: "Los Angeles",
      radius: 25,
      categories: ['party'],
      limit: 5,
      page: 1,
      startDate: today
    };

    console.log(`Testing function at: ${url}`);
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

    // Print detailed information for each event
    if (data.events && data.events.length > 0) {
      console.log("\n=== DETAILED EVENT INFORMATION ===");
      data.events.forEach((event, index) => {
        console.log(`\n--- Event ${index + 1}: ${event.title} ---`);
        console.log(`Category: ${event.category}`);
        console.log(`Party Subcategory: ${event.partySubcategory || 'N/A'}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Source: ${event.source}`);
        
        // Image information
        console.log(`Image URL: ${event.image || 'None'}`);
        console.log(`Image Alt: ${event.imageAlt || 'None'}`);
        console.log(`Additional Images: ${event.additionalImages ? event.additionalImages.length : 0}`);
        
        // Buy links and ticket information
        console.log(`Buy URL: ${event.url || 'None'}`);
        
        if (event.ticketInfo) {
          console.log('Ticket Info:');
          console.log(`  Price: ${event.ticketInfo.price || 'Not specified'}`);
          console.log(`  Min Price: ${event.ticketInfo.minPrice || 'Not specified'}`);
          console.log(`  Max Price: ${event.ticketInfo.maxPrice || 'Not specified'}`);
          console.log(`  Currency: ${event.ticketInfo.currency || 'Not specified'}`);
          console.log(`  Availability: ${event.ticketInfo.availability || 'Not specified'}`);
          console.log(`  Purchase URL: ${event.ticketInfo.purchaseUrl || 'Not specified'}`);
          console.log(`  Provider: ${event.ticketInfo.provider || 'Not specified'}`);
        } else {
          console.log('Ticket Info: None');
        }
        
        if (event.websites) {
          console.log('Websites:');
          console.log(`  Official: ${event.websites.official || 'None'}`);
          console.log(`  Tickets: ${event.websites.tickets || 'None'}`);
          console.log(`  Venue: ${event.websites.venue || 'None'}`);
        } else {
          console.log('Websites: None');
        }
        
        console.log('-----------------------------------');
      });
    }
  } catch (error) {
    console.error("Error testing function:", error);
  }
}

testSearchEventsDetails();