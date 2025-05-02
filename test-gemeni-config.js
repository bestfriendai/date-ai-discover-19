// Test script to verify GEMENI configuration for RapidAPI
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Helper function to mask API keys for logging
function maskKey(key) {
  if (!key) return 'NOT SET';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// Simplified version of getApiKey from GEMENI/config/env.ts
function getApiKey(service) {
  console.log(`[ENV] Getting API key for service: ${service}`);
  
  switch (service.toLowerCase()) {
    case 'rapidapi-key':
      const rapidApiKey = process.env.VITE_RAPIDAPI_KEY;
      console.log(`[ENV] RapidAPI key found: ${rapidApiKey ? 'Yes' : 'No'}`);
      return rapidApiKey;
    case 'rapidapi-events-endpoint':
      const rapidApiEndpoint = process.env.VITE_RAPIDAPI_EVENTS_ENDPOINT;
      console.log(`[ENV] RapidAPI endpoint found: ${rapidApiEndpoint ? 'Yes' : 'No'}`);
      return rapidApiEndpoint;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

// Simplified version of normalizeRapidApiEvent from GEMENI/services/eventService.ts
function normalizeRapidApiEvent(rapidApiEvent) {
  const startDate = rapidApiEvent.start_time ? new Date(rapidApiEvent.start_time) : null;
  const endDate = rapidApiEvent.end_time ? new Date(rapidApiEvent.end_time) : null;

  return {
    id: rapidApiEvent.event_id?.toString() || '',
    source: rapidApiEvent.publisher_domain || 'rapidapi',
    title: rapidApiEvent.name || 'No Title',
    description: rapidApiEvent.description || '',
    date: startDate ? startDate.toISOString().split('T')[0] : '',
    time: startDate ? startDate.toTimeString().slice(0, 5) : '',
    location: rapidApiEvent.venue?.full_address || rapidApiEvent.venue?.name || 'Unknown Location',
    venue: rapidApiEvent.venue?.name || '',
    category: rapidApiEvent.tags?.[0] || 'Unknown',
    image: rapidApiEvent.thumbnail || '',
    url: rapidApiEvent.link || rapidApiEvent.ticket_links?.[0]?.link || '',
    coordinates: (rapidApiEvent.venue?.latitude && rapidApiEvent.venue?.longitude)
      ? [rapidApiEvent.venue.longitude, rapidApiEvent.venue.latitude]
      : undefined,
    price: undefined,
  };
}

// Simplified version of searchEvents from GEMENI/services/eventService.ts
async function searchEvents(params) {
  console.log('[EVENT_SERVICE] Searching for events with params:', params);

  const apiKey = getApiKey('rapidapi-key');
  const endpoint = getApiKey('rapidapi-events-endpoint');

  console.log('[EVENT_SERVICE] RapidAPI key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined');
  console.log('[EVENT_SERVICE] RapidAPI endpoint:', endpoint);

  if (!apiKey || !endpoint) {
    const errorMsg = 'RapidAPI key or endpoint not configured.';
    console.error(`[EVENT_SERVICE] ${errorMsg}`);
    return { events: [], error: errorMsg };
  }

  try {
    // Construct the correct RapidAPI request based on params
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append('query', params.keyword);
    if (params.latitude && params.longitude) {
      if (params.location) {
        queryParams.append('query', `${params.keyword || ''} in ${params.location}`);
      } else {
        queryParams.append('query', params.keyword || '');
      }
    } else if (params.location) {
      queryParams.append('query', `${params.keyword || ''} in ${params.location}`);
    } else if (params.keyword) {
      queryParams.append('query', params.keyword);
    }

    // Use 'date' parameter with valid values: all, today, tomorrow, week, weekend, next_week, month, next_month
    queryParams.append('date', 'week'); // Default to 'week' as it's a common use case

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.page) queryParams.append('start', ((params.page - 1) * (params.limit || 10)).toString());

    const url = `${endpoint}?${queryParams.toString()}`;

    console.log(`[EVENT_SERVICE] Calling RapidAPI: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': new URL(endpoint).host,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EVENT_SERVICE] RapidAPI search request failed: ${response.status} ${response.statusText}`, errorText);
      return { events: [], error: `RapidAPI search request failed: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();

    // Process the RapidAPI response and normalize events
    const normalizedEvents = (data.data || []).map(normalizeRapidApiEvent);

    console.log(`[EVENT_SERVICE] Received ${normalizedEvents.length} events from RapidAPI`);

    // Extract source stats
    const sourceStats = {
      rapidapi: {
        count: normalizedEvents.length,
        error: null,
      },
      ticketmaster: { count: 0, error: null },
      eventbrite: { count: 0, error: null },
    };

    // Extract meta information
    const meta = {
      timestamp: new Date().toISOString(),
      totalEvents: data.total || normalizedEvents.length,
      hasMore: data.hasMore || false,
    };

    return {
      events: normalizedEvents,
      sourceStats,
      meta,
    };

  } catch (error) {
    console.error('[EVENT_SERVICE] Exception calling RapidAPI search:', error);
    return {
      events: [],
      error: `Exception calling RapidAPI search: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testGEMENIConfig() {
  console.log('=== TESTING GEMENI CONFIGURATION FOR RAPIDAPI ===');
  
  try {
    // Test searchEvents function with simple parameters
    console.log('\n--- Testing searchEvents function ---');
    
    const searchParams = {
      location: "Miami",
      categories: ['party'],
      keyword: "party",
      limit: 10
    };
    
    console.log(`Searching for events with params: ${JSON.stringify(searchParams, null, 2)}`);
    
    const searchResult = await searchEvents(searchParams);
    
    if (searchResult.error) {
      console.error(`❌ ERROR: ${searchResult.error}`);
    } else {
      console.log(`✅ Successfully retrieved ${searchResult.events.length} events`);
      console.log('Source Stats:', JSON.stringify(searchResult.sourceStats, null, 2));
      
      // Check if RapidAPI was used
      const rapidApiUsed = searchResult.sourceStats?.rapidapi?.count > 0;
      console.log(`RapidAPI used: ${rapidApiUsed ? 'YES' : 'NO'}`);
      console.log(`RapidAPI events: ${searchResult.sourceStats?.rapidapi?.count || 0}`);
      console.log(`RapidAPI error: ${searchResult.sourceStats?.rapidapi?.error || 'None'}`);
      
      // Print summary of first 2 events
      if (searchResult.events && searchResult.events.length > 0) {
        console.log("\n=== EVENT SUMMARY (first 2) ===");
        searchResult.events.slice(0, 2).forEach((event, index) => {
          console.log(`\n--- Event ${index + 1}: ${event.title} ---`);
          console.log(`ID: ${event.id}`);
          console.log(`Category: ${event.category}`);
          console.log(`Date: ${event.date}`);
          console.log(`Location: ${event.location}`);
          console.log(`Source: ${event.source}`);
          console.log(`Coordinates: ${JSON.stringify(event.coordinates)}`);
          console.log(`URL: ${event.url || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ ERROR: Exception during test:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testGEMENIConfig();