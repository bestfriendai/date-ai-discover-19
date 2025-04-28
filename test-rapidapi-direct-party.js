// Test script for directly testing the RapidAPI integration for party events
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testRapidAPIDirectParty() {
  try {
    // Get RapidAPI key from environment variable
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    
    if (!rapidApiKey) {
      throw new Error('RapidAPI key not available in .env.local file');
    }
    
    // Log the masked API key (first 4 chars only) for debugging
    const maskedKey = rapidApiKey.substring(0, 4) + '...' + rapidApiKey.substring(rapidApiKey.length - 4);
    console.log(`Using RapidAPI key: ${maskedKey}`);
    
    // Test different locations
    const locations = ["New York", "Los Angeles", "Miami"];
    
    for (const location of locations) {
      console.log(`\n--- Testing location: ${location} ---`);
      
      // Build query parameters for the RapidAPI Events Search API
      const queryParams = new URLSearchParams();
      
      // Add location-based query parameter
      queryParams.append('query', `party events in ${location}`);
      
      // Add date parameter - valid values for RapidAPI:
      // all, today, tomorrow, week, weekend, next_week, month, next_month
      queryParams.append('date', 'week');
      
      // Set is_virtual parameter to false to only get in-person events
      queryParams.append('is_virtual', 'false');
      
      // Add start parameter for pagination (0-based index)
      queryParams.append('start', '0');
      
      // Build the complete URL for the RapidAPI Events Search API
      const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
      
      console.log(`Sending request to: ${url}`);
      
      // Make the API call with the required RapidAPI headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
      });
      
      // Check if the response was successful
      if (!response.ok) {
        console.error(`RapidAPI request failed with status: ${response.status}`);
        console.error(`Response: ${await response.text()}`);
        continue;
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Log the results
      console.log(`Success! Received ${data.data?.length || 0} events for ${location}`);
      
      // Print first 3 events as samples
      if (data.data && data.data.length > 0) {
        console.log("\nSample events:");
        data.data.slice(0, 3).forEach((event, index) => {
          console.log(`\nEvent ${index + 1}:`);
          console.log(`Title: ${event.title}`);
          console.log(`Date: ${event.date}`);
          console.log(`Location: ${event.venue?.name || 'N/A'}`);
          console.log(`Address: ${event.venue?.address || 'N/A'}`);
          console.log(`City: ${event.venue?.city || 'N/A'}`);
          console.log(`Coordinates: ${event.venue?.latitude}, ${event.venue?.longitude}`);
        });
      } else {
        console.log("\nNo events found.");
      }
    }
    
    // Test with coordinates
    console.log("\n--- Testing with coordinates ---");
    const coordinates = [
      { lat: 40.7128, lng: -74.0060, name: "New York" },
      { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
      { lat: 25.7617, lng: -80.1918, name: "Miami" }
    ];
    
    for (const coord of coordinates) {
      console.log(`\n--- Testing coordinates: ${coord.name} (${coord.lat}, ${coord.lng}) ---`);
      
      // Build query parameters for the RapidAPI Events Search API
      const queryParams = new URLSearchParams();
      
      // Add location-based query parameter
      queryParams.append('query', `party events`);
      
      // Add coordinates
      queryParams.append('lat', coord.lat.toString());
      queryParams.append('lng', coord.lng.toString());
      
      // Add radius (in miles)
      queryParams.append('radius', '25');
      
      // Add date parameter
      queryParams.append('date', 'week');
      
      // Set is_virtual parameter to false to only get in-person events
      queryParams.append('is_virtual', 'false');
      
      // Add start parameter for pagination (0-based index)
      queryParams.append('start', '0');
      
      // Build the complete URL for the RapidAPI Events Search API
      const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
      
      console.log(`Sending request to: ${url}`);
      
      // Make the API call with the required RapidAPI headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
      });
      
      // Check if the response was successful
      if (!response.ok) {
        console.error(`RapidAPI request failed with status: ${response.status}`);
        console.error(`Response: ${await response.text()}`);
        continue;
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Log the results
      console.log(`Success! Received ${data.data?.length || 0} events for coordinates (${coord.lat}, ${coord.lng})`);
      
      // Print first 3 events as samples
      if (data.data && data.data.length > 0) {
        console.log("\nSample events:");
        data.data.slice(0, 3).forEach((event, index) => {
          console.log(`\nEvent ${index + 1}:`);
          console.log(`Title: ${event.title}`);
          console.log(`Date: ${event.date}`);
          console.log(`Location: ${event.venue?.name || 'N/A'}`);
          console.log(`Address: ${event.venue?.address || 'N/A'}`);
          console.log(`City: ${event.venue?.city || 'N/A'}`);
          console.log(`Coordinates: ${event.venue?.latitude}, ${event.venue?.longitude}`);
        });
      } else {
        console.log("\nNo events found.");
      }
    }
    
    // Test with different radius values
    console.log("\n--- Testing with different radius values ---");
    const radiusValues = [5, 10, 25, 50];
    
    for (const radius of radiusValues) {
      console.log(`\n--- Testing radius: ${radius} miles ---`);
      
      // Build query parameters for the RapidAPI Events Search API
      const queryParams = new URLSearchParams();
      
      // Add location-based query parameter
      queryParams.append('query', `party events in New York`);
      
      // Add radius (in miles)
      queryParams.append('radius', radius.toString());
      
      // Add date parameter
      queryParams.append('date', 'week');
      
      // Set is_virtual parameter to false to only get in-person events
      queryParams.append('is_virtual', 'false');
      
      // Add start parameter for pagination (0-based index)
      queryParams.append('start', '0');
      
      // Build the complete URL for the RapidAPI Events Search API
      const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
      
      console.log(`Sending request to: ${url}`);
      
      // Make the API call with the required RapidAPI headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
      });
      
      // Check if the response was successful
      if (!response.ok) {
        console.error(`RapidAPI request failed with status: ${response.status}`);
        console.error(`Response: ${await response.text()}`);
        continue;
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Log the results
      console.log(`Success! Received ${data.data?.length || 0} events with radius ${radius} miles`);
      
      // Print event count only for brevity
      console.log(`Number of events: ${data.data?.length || 0}`);
    }
    
  } catch (error) {
    console.error("Error testing RapidAPI integration:", error);
  }
}

testRapidAPIDirectParty();