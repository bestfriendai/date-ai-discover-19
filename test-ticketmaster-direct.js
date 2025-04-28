// Test script for directly calling the Ticketmaster API
import fetch from 'node-fetch';

async function testTicketmasterDirect() {
  try {
    // Get the Ticketmaster API key from environment variable
    const apiKey = process.env.TICKETMASTER_KEY;
    if (!apiKey) {
      console.error("TICKETMASTER_KEY environment variable is not set");
      return;
    }

    // Los Angeles coordinates
    const latitude = 34.0522;
    const longitude = -118.2437;
    const radius = 25;

    // Get today's date
    const today = new Date();
    
    // Format dates manually to ensure exact format YYYY-MM-DDTHH:mm:ssZ
    // Start date (today at 00:00:00)
    today.setHours(0, 0, 0, 0);
    const startYear = today.getUTCFullYear();
    const startMonth = String(today.getUTCMonth() + 1).padStart(2, '0');
    const startDay = String(today.getUTCDate()).padStart(2, '0');
    const startHours = String(today.getUTCHours()).padStart(2, '0');
    const startMinutes = String(today.getUTCMinutes()).padStart(2, '0');
    const startSeconds = String(today.getUTCSeconds()).padStart(2, '0');
    
    const startDateTime = `${startYear}-${startMonth}-${startDay}T${startHours}:${startMinutes}:${startSeconds}Z`;
    
    // End date (30 days from now at 23:59:59)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);
    const endYear = endDate.getUTCFullYear();
    const endMonth = String(endDate.getUTCMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getUTCDate()).padStart(2, '0');
    const endHours = String(endDate.getUTCHours()).padStart(2, '0');
    const endMinutes = String(endDate.getUTCMinutes()).padStart(2, '0');
    const endSeconds = String(endDate.getUTCSeconds()).padStart(2, '0');
    
    const endDateTime = `${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}:${endSeconds}Z`;

    // Build the Ticketmaster API URL
    const queryParams = new URLSearchParams();
    
    // Add API key (required)
    queryParams.append('apikey', apiKey);
    
    // Add location parameters
    queryParams.append('latlong', `${latitude},${longitude}`);
    queryParams.append('radius', radius.toString());
    queryParams.append('unit', 'miles');
    
    // Add date range parameters
    queryParams.append('startDateTime', startDateTime);
    queryParams.append('endDateTime', endDateTime);
    
    // Add keyword for party events
    queryParams.append('keyword', 'party OR nightclub OR club OR dance');
    
    // Add segment parameter for music events
    queryParams.append('segmentName', 'Music');
    
    // Add size parameter (max 10 for testing)
    queryParams.append('size', '10');
    
    // Add sort parameter - sort by date
    queryParams.append('sort', 'date,asc');
    
    // Add includeTBA and includeTBD parameters
    queryParams.append('includeTBA', 'yes');
    queryParams.append('includeTBD', 'yes');
    
    // Build the full URL
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${queryParams.toString()}`;
    
    console.log("Making direct request to Ticketmaster API");
    console.log(`URL: ${url}`);
    console.log(`Start DateTime: ${startDateTime}`);
    console.log(`End DateTime: ${endDateTime}`);
    
    // Make the API request
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
    
    console.log("API Response:");
    console.log({
      page: data.page,
      totalElements: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
      size: data.page?.size || 0,
      number: data.page?.number || 0,
      hasEvents: !!data._embedded?.events
    });
    
    // Print event information
    if (data._embedded?.events) {
      console.log(`\nFound ${data._embedded.events.length} events:`);
      data._embedded.events.forEach((event, index) => {
        console.log(`\n--- Event ${index + 1}: ${event.name} ---`);
        console.log(`Date: ${event.dates?.start?.localDate || 'N/A'}`);
        console.log(`Time: ${event.dates?.start?.localTime || 'N/A'}`);
        console.log(`Venue: ${event._embedded?.venues?.[0]?.name || 'N/A'}`);
        console.log(`City: ${event._embedded?.venues?.[0]?.city?.name || 'N/A'}`);
        console.log(`URL: ${event.url || 'N/A'}`);
      });
    } else {
      console.log("No events found");
    }
    
  } catch (error) {
    console.error("Error testing Ticketmaster API:", error);
  }
}

testTicketmasterDirect();