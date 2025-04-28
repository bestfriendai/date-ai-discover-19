// Test script to examine the RapidAPI response format
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testRapidAPIResponseFormat() {
  try {
    // Get RapidAPI key from environment variable
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    
    if (!rapidApiKey) {
      throw new Error('RapidAPI key not available in .env.local file');
    }
    
    // Log the masked API key (first 4 chars only) for debugging
    const maskedKey = rapidApiKey.substring(0, 4) + '...' + rapidApiKey.substring(rapidApiKey.length - 4);
    console.log(`Using RapidAPI key: ${maskedKey}`);
    
    // Build query parameters for the RapidAPI Events Search API
    const queryParams = new URLSearchParams();
    
    // Add location-based query parameter
    queryParams.append('query', `party events in New York`);
    
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
      return;
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Log the full response structure
    console.log("Full API Response Structure:");
    console.log(JSON.stringify(data, null, 2));
    
    // Log the structure of the first event
    if (data.data && data.data.length > 0) {
      console.log("\nFirst Event Structure:");
      console.log(JSON.stringify(data.data[0], null, 2));
      
      // Log all available fields in the first event
      console.log("\nAvailable fields in the first event:");
      Object.keys(data.data[0]).forEach(key => {
        console.log(`${key}: ${typeof data.data[0][key]}`);
      });
    } else {
      console.log("\nNo events found.");
    }
    
  } catch (error) {
    console.error("Error testing RapidAPI response format:", error);
  }
}

testRapidAPIResponseFormat();