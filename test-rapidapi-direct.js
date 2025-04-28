// Direct test script for RapidAPI Events Search API
import fetch from 'node-fetch';

// RapidAPI key
const RAPIDAPI_KEY = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';

async function testRapidAPIDirectly() {
  try {
    console.log('Testing RapidAPI Events Search API directly...');

    // Build the query URL
    const queryParams = new URLSearchParams();
    queryParams.append('query', 'events in New York');
    queryParams.append('date', 'week'); // Valid values: all, today, tomorrow, week, weekend, next_week, month, next_month
    queryParams.append('is_virtual', 'false');
    queryParams.append('start', '0');

    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;

    console.log(`Request URL: ${url}`);
    console.log('Using RapidAPI key:', `${RAPIDAPI_KEY.substring(0, 4)}...${RAPIDAPI_KEY.substring(RAPIDAPI_KEY.length - 4)}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }

    const data = await response.json();

    if (!data.events || !Array.isArray(data.events)) {
      console.error('Invalid response format from RapidAPI');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(`Success! Received ${data.events.length} events from RapidAPI`);
    console.log(`Total events: ${data.total_events}`);
    console.log(`Total pages: ${data.total_pages}`);

    // Print first 3 events as samples
    if (data.events.length > 0) {
      console.log("\nSample events:");
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Description: ${event.description ? event.description.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`Category: ${event.category || 'N/A'}`);
        console.log(`Start Date: ${event.start_date || 'N/A'}`);
        console.log(`Start Time: ${event.start_time || 'N/A'}`);
        console.log(`Venue: ${event.venue?.name || 'N/A'}`);
        console.log(`Location: ${[event.venue?.city, event.venue?.state, event.venue?.country].filter(Boolean).join(', ') || 'N/A'}`);
        console.log(`Image: ${event.image ? 'YES' : 'NO'}`);
        console.log(`URL: ${event.url || 'N/A'}`);

        // Check price info
        if (event.price) {
          console.log(`Price: ${event.price.min !== undefined ? event.price.min : 'N/A'} - ${event.price.max !== undefined ? event.price.max : 'N/A'} ${event.price.currency || 'USD'}`);
        } else {
          console.log(`Price: Not available`);
        }

        // Check coordinates
        if (event.venue?.location) {
          console.log(`Coordinates: [${event.venue.location.lng || 'N/A'}, ${event.venue.location.lat || 'N/A'}]`);
        } else {
          console.log(`Coordinates: Not available`);
        }
      });
    }

  } catch (error) {
    console.error("Error testing RapidAPI directly:", error);
  }
}

testRapidAPIDirectly();
