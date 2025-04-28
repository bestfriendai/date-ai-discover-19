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
      // If coordinates are provided, use them
      queryParams.append('query', 'events');
      queryParams.append('lat', req.body.latitude.toString());
      queryParams.append('lng', req.body.longitude.toString());
      
      // If categories include 'party', add party keywords to the query
      if (req.body.categories && req.body.categories.includes('party')) {
        queryParams.append('query', 'party events');
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
    const events = (data.data || []).map(event => ({
      id: event.event_id,
      title: event.name,
      date: event.date_human_readable,
      time: event.start_time ? event.start_time.split(' ')[1] : '',
      location: event.venue?.name || '',
      category: 'party',
      image: event.thumbnail || '',
      coordinates: event.venue ? [event.venue.longitude, event.venue.latitude] : undefined,
      description: event.description || '',
      source: 'rapidapi',
      venue: event.venue?.name || '',
      address: event.venue?.full_address || '',
      city: event.venue?.city || '',
      state: event.venue?.state || '',
      country: event.venue?.country || '',
      url: event.link || ''
    }));
    
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