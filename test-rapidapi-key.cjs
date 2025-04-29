// Script to test the RapidAPI key and make a direct API call
const fetch = require('node-fetch');

// Configuration
const config = {
  rapidApiKey: '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9',
  coordinates: {
    latitude: 38.7907584,
    longitude: -77.021184
  }
};

async function testRapidAPI() {
  try {
    console.log('Testing RapidAPI key...');
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Use coordinates in the query
    const lat = config.coordinates.latitude.toFixed(4);
    const lng = config.coordinates.longitude.toFixed(4);
    
    queryParams.append('query', `events near ${lat},${lng}`);
    queryParams.append('date', 'month');
    queryParams.append('is_virtual', 'false');
    queryParams.append('start', '0');
    queryParams.append('limit', '100');
    
    // Build the complete URL
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    
    console.log(`Sending request to: ${url}`);
    
    // Make the API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': config.rapidApiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request failed: ${response.status}`, errorText);
      return;
    }
    
    const data = await response.json();
    const eventCount = data.data?.length || 0;
    
    console.log(`Received ${eventCount} events from RapidAPI`);
    
    if (eventCount > 0) {
      console.log('\nSample events:');
      data.data.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}: ${event.name}`);
        console.log(`Venue: ${event.venue?.name || 'N/A'}`);
        console.log(`Location: ${event.venue?.full_address || 'N/A'}`);
        console.log(`Coordinates: ${event.venue?.latitude}, ${event.venue?.longitude}`);
        console.log(`Date: ${event.start_time || 'N/A'}`);
      });
    } else {
      console.log('No events found. Try different coordinates or parameters.');
    }
  } catch (error) {
    console.error('Error testing RapidAPI:', error);
  }
}

// Test the Supabase function
async function testSupabaseFunction() {
  try {
    console.log('\nTesting Supabase rapidapi-events function...');
    
    // Supabase function URL
    const functionUrl = 'https://akwvmljopucsnorvdwuu.functions.supabase.co/rapidapi-events';
    
    // Request parameters
    const params = {
      latitude: config.coordinates.latitude,
      longitude: config.coordinates.longitude,
      radius: 15,
      startDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      categories: ['party'],
      limit: 100
    };
    
    console.log(`Sending request to Supabase function with params:`, params);
    
    // Make the API call
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk'
      },
      body: JSON.stringify(params)
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request failed: ${response.status}`, errorText);
      return;
    }
    
    const data = await response.json();
    const eventCount = data.events?.length || 0;
    
    console.log(`Received ${eventCount} events from Supabase function`);
    
    if (eventCount > 0) {
      console.log('\nSample events from Supabase function:');
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}: ${event.title}`);
        console.log(`Venue: ${event.venue || 'N/A'}`);
        console.log(`Location: ${event.location || 'N/A'}`);
        console.log(`Coordinates: ${event.latitude}, ${event.longitude}`);
        console.log(`Date: ${event.date || 'N/A'}`);
      });
    } else {
      console.log('No events found from Supabase function.');
    }
  } catch (error) {
    console.error('Error testing Supabase function:', error);
  }
}

// Run the tests
async function runTests() {
  await testRapidAPI();
  await testSupabaseFunction();
}

runTests();
