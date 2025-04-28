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
      // If coordinates are provided, use them with a better approach
      // Try to create a more specific query based on coordinates
      
      // Define known city coordinates for better queries
      const knownCities = [
        { name: "New York", lat: 40.7128, lng: -74.0060, radius: 1 },
        { name: "Miami", lat: 25.7617, lng: -80.1918, radius: 1 },
        { name: "Los Angeles", lat: 34.0522, lng: -118.2437, radius: 1 },
        { name: "Chicago", lat: 41.8781, lng: -87.6298, radius: 1 },
        { name: "San Francisco", lat: 37.7749, lng: -122.4194, radius: 1 },
        { name: "Las Vegas", lat: 36.1699, lng: -115.1398, radius: 1 },
        { name: "Austin", lat: 30.2672, lng: -97.7431, radius: 1 },
        { name: "Seattle", lat: 47.6062, lng: -122.3321, radius: 1 },
        { name: "Boston", lat: 42.3601, lng: -71.0589, radius: 1 },
        { name: "Denver", lat: 39.7392, lng: -104.9903, radius: 1 }
      ];
      
      // Try to match with a known city
      const matchedCity = knownCities.find(city =>
        Math.abs(req.body.latitude - city.lat) < city.radius &&
        Math.abs(req.body.longitude - city.lng) < city.radius
      );
      
      if (matchedCity) {
        // If we recognize the coordinates as a known city, use that city name
        const baseQuery = req.body.categories && req.body.categories.includes('party') ?
          `party events in ${matchedCity.name}` :
          `events in ${matchedCity.name}`;
        queryParams.append('query', baseQuery);
        console.log(`Converted coordinates to city name: ${matchedCity.name}`);
      } else {
        // For unknown locations, use a more generic approach with coordinates
        const baseQuery = req.body.categories && req.body.categories.includes('party') ?
          'party events' :
          'events';
        queryParams.append('query', `${baseQuery} near ${req.body.latitude.toFixed(2)},${req.body.longitude.toFixed(2)}`);
        console.log(`Using generic location search for coordinates: ${req.body.latitude}, ${req.body.longitude}`);
      }
      
      // Add radius if provided
      if (req.body.radius) {
        queryParams.append('radius', req.body.radius.toString());
      }
    } else {
      // Fallback to popular events if no location is provided
      queryParams.append('query', 'popular events');
    }
    
    // Add date parameter - valid values for RapidAPI:
    // all, today, tomorrow, week, weekend, next_week, month, next_month
    // We default to 'week' for a reasonable date range
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
      
      // If no valid coordinates and we have user coordinates, generate approximate ones
      if (!coordinates && req.body.latitude && req.body.longitude) {
        // Add a small random offset to avoid all events appearing at the same spot
        const randomLat = (Math.random() - 0.5) * 0.1; // ±0.05 degrees (~3-5 miles)
        const randomLng = (Math.random() - 0.5) * 0.1;
        
        latitude = req.body.latitude + randomLat;
        longitude = req.body.longitude + randomLng;
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