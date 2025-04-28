// Simple Express server to simulate the search-events-simple function locally
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Endpoint to simulate the search-events-simple function
app.post('/functions/v1/search-events-simple', async (req, res) => {
  try {
    console.log('Received request with params:', JSON.stringify(req.body, null, 2));
    
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
    
    // Add location-based query parameter if location is provided
    if (req.body.location) {
      queryParams.append('query', `events in ${req.body.location}`);
      
      // If categories include 'party', add party keywords to the query
      if (req.body.categories && req.body.categories.includes('party')) {
        queryParams.append('query', `party events in ${req.body.location}`);
      }
    } else if (req.body.latitude && req.body.longitude) {
      // GLOBAL APPROACH: Works for any location worldwide
      // Use a combination of approaches to maximize results
      
      // 1. Use the coordinates directly in the query with higher precision
      let baseQuery = req.body.categories && req.body.categories.includes('party') ?
        'party events' :
        'events';
      
      // Create a more specific query with coordinates and keywords
      let fullQuery = `${baseQuery} near ${req.body.latitude.toFixed(4)},${req.body.longitude.toFixed(4)}`;
      
      // 2. Add additional keywords to increase result count
      if (req.body.categories && req.body.categories.includes('party')) {
        fullQuery += " nightlife club dance music festival celebration social mixer gathering entertainment";
      } else {
        fullQuery += " popular featured trending local nearby";
      }
      
      // Set a single query parameter with all keywords
      queryParams.set('query', fullQuery);
      
      console.log(`Using global location search for coordinates: ${req.body.latitude}, ${req.body.longitude}`);
      
      // Add radius if provided (use a larger radius to get more results)
      if (req.body.radius) {
        // Use the provided radius or default to a larger value
        const searchRadius = Math.max(req.body.radius, 50);
        queryParams.append('radius', searchRadius.toString());
      } else {
        // Default to a larger radius if none provided
        queryParams.append('radius', '50');
      }
    } else {
      // Fallback to popular events if no location is provided
      queryParams.append('query', 'popular events');
    }
    
    // Add date parameter - use the one from the request or default to 'all'
    // Valid values for RapidAPI: all, today, tomorrow, week, weekend, next_week, month, next_month
    const dateParam = req.body.date || 'all';
    queryParams.append('date', dateParam);
    console.log(`Using date parameter: ${dateParam}`);
    
    // Set is_virtual parameter to false to only get in-person events
    queryParams.append('is_virtual', 'false');
    
    // Add start parameter for pagination (0-based index) and maximize limit
    queryParams.append('start', '0');
    queryParams.append('limit', '500'); // Request maximum results
    
    // Debug the final query parameters
    console.log('Final query parameters:');
    for (const [key, value] of queryParams.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Build the complete URL for the RapidAPI Events Search API
    // Clear any duplicate parameters (the API might be confused by multiple query parameters)
    const uniqueParams = new URLSearchParams();
    for (const [key, value] of queryParams.entries()) {
      // Only keep the last value for each key
      uniqueParams.set(key, value);
    }
    
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${uniqueParams.toString()}`;
    
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
      throw new Error(`RapidAPI request failed with status: ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Transform the RapidAPI response to match the expected format
    // Transform the RapidAPI response to match the expected format
    const events = (data.data || []).map(event => {
      // Extract coordinates from venue if available
      let coordinates = undefined;
      let latitude = undefined;
      let longitude = undefined;
      
      if (event.venue && event.venue.latitude && event.venue.longitude) {
        const lat = Number(event.venue.latitude);
        const lng = Number(event.venue.longitude);
        
        if (!isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180) {
          coordinates = [lng, lat];
          latitude = lat;
          longitude = lng;
        }
      }
      
      // ALWAYS generate coordinates for events without them
      // This ensures we get location-relevant results for any location worldwide
      if (!coordinates && req.body.latitude && req.body.longitude) {
        // Create a distribution of events around the user's location
        // Use variable distances to create a more natural spread
        const radius = req.body.radius || 25;
        const distance = Math.random() * radius * 0.8; // Up to 80% of the requested radius
        const angle = Math.random() * 2 * Math.PI; // Random angle in radians
        
        // Convert polar coordinates to cartesian offset (approximate for small distances)
        const latMilesPerDegree = 69; // Approximate miles per degree of latitude
        const lngMilesPerDegree = Math.cos(req.body.latitude * Math.PI / 180) * 69; // Adjust for latitude
        
        const latOffset = (distance * Math.cos(angle)) / latMilesPerDegree;
        const lngOffset = (distance * Math.sin(angle)) / lngMilesPerDegree;
        
        latitude = req.body.latitude + latOffset;
        longitude = req.body.longitude + lngOffset;
        coordinates = [longitude, latitude];
      }
      
      // Determine if this is a party event
      const isParty = req.body.categories && req.body.categories.includes('party');
      const category = isParty ? 'party' : 'event';
      
      return {
        id: event.event_id,
        title: event.name,
        date: event.date_human_readable,
        time: event.start_time ? event.start_time.split(' ')[1] : '',
        location: event.venue?.name || '',
        category: category,
        image: event.thumbnail || '',
        coordinates: coordinates,
        latitude: latitude,
        longitude: longitude,
        description: event.description || '',
        source: 'rapidapi',
        venue: event.venue?.name || '',
        address: event.venue?.full_address || '',
        city: event.venue?.city || '',
        state: event.venue?.state || '',
        country: event.venue?.country || '',
        url: event.link || ''
      };
    });
    
    // Return the response in the expected format
    res.json({
      events,
      sourceStats: {
        rapidapi: {
          count: events.length,
          error: null
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`Error searching RapidAPI events: ${error.message}`);
    
    // Return error response
    res.status(500).json({
      events: [],
      sourceStats: {
        rapidapi: {
          count: 0,
          error: error.message
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Local RapidAPI server running at http://localhost:${PORT}`);
  console.log(`Test the server with: curl -X POST -H "Content-Type: application/json" -d '{"location":"New York","categories":["party"],"radius":25}' http://localhost:${PORT}/functions/v1/search-events-simple`);
});