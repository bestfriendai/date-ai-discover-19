// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight requests
function handleOptionsRequest() {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status: 204,
  });
}

// Simple function to search for events using RapidAPI
async function searchRapidAPIEvents(params: any) {
  try {
    console.log('[SEARCH-EVENTS-FIXED] Starting RapidAPI search with params:', JSON.stringify(params));
    
    // Get RapidAPI key
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      console.error('[SEARCH-EVENTS-FIXED] RapidAPI key not available');
      throw new Error('RapidAPI key not available');
    }
    
    // Log the masked API key (first 4 chars only)
    const maskedKey = rapidApiKey.substring(0, 4) + '...' + rapidApiKey.substring(rapidApiKey.length - 4);
    console.log(`[SEARCH-EVENTS-FIXED] Using RapidAPI key: ${maskedKey}`);
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add location if available
    if (params.location) {
      queryParams.append('query', `events in ${params.location}`);
      console.log(`[SEARCH-EVENTS-FIXED] Using location: ${params.location}`);
    } else if (params.latitude && params.longitude) {
      // If we have coordinates but no location, use "events nearby"
      queryParams.append('query', 'events nearby');
      console.log(`[SEARCH-EVENTS-FIXED] Using coordinates: ${params.latitude},${params.longitude}`);
    } else {
      queryParams.append('query', 'popular events');
      console.log('[SEARCH-EVENTS-FIXED] No location or coordinates, using "popular events"');
    }
    
    // Add date parameter (default to 'week')
    queryParams.append('date', 'week');
    
    // Add is_virtual parameter
    queryParams.append('is_virtual', 'false');
    
    // Add start parameter for pagination
    queryParams.append('start', '0');
    
    // Build the URL
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    
    console.log(`[SEARCH-EVENTS-FIXED] Sending request to: ${url}`);
    
    // Make the API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      console.error(`[SEARCH-EVENTS-FIXED] RapidAPI request failed with status: ${response.status}`);
      throw new Error(`RapidAPI request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[SEARCH-EVENTS-FIXED] Received ${data.data?.length || 0} events from RapidAPI`);
    
    // Return the events
    return {
      events: data.data || [],
      error: null
    };
  } catch (error) {
    console.error(`[SEARCH-EVENTS-FIXED] Error searching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`);
    return {
      events: [],
      error: `Error searching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Process and filter events
function processEvents(events: any[], params: any) {
  try {
    console.log(`[SEARCH-EVENTS-FIXED] Processing ${events.length} events`);
    
    // Filter for party events if requested
    if (params.categories && params.categories.includes('party')) {
      console.log('[SEARCH-EVENTS-FIXED] Filtering for party events');
      
      // Define party-related keywords
      const partyKeywords = ['party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave'];
      
      // Filter events that match party criteria
      events = events.filter(event => {
        const name = (event.name || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const venue = event.venue?.name?.toLowerCase() || '';
        const subtypes = event.venue?.subtypes || [];
        
        // Check if any party keywords are in the name, description, or venue
        const hasPartyKeyword = partyKeywords.some(keyword => 
          name.includes(keyword) || 
          description.includes(keyword) || 
          venue.includes(keyword)
        );
        
        // Check if venue subtypes include party-related venues
        const hasPartyVenue = subtypes.some((subtype: string) => 
          subtype.toLowerCase().includes('club') || 
          subtype.toLowerCase().includes('lounge') || 
          subtype.toLowerCase().includes('bar')
        );
        
        return hasPartyKeyword || hasPartyVenue;
      });
      
      console.log(`[SEARCH-EVENTS-FIXED] Found ${events.length} party events`);
    }
    
    // Filter by coordinates if available
    if (params.latitude && params.longitude && params.radius) {
      console.log(`[SEARCH-EVENTS-FIXED] Filtering by coordinates: ${params.latitude},${params.longitude} with radius ${params.radius} miles`);
      
      // Convert events to standard format with coordinates
      events = events.map(event => {
        // Extract coordinates from venue
        const latitude = event.venue?.latitude;
        const longitude = event.venue?.longitude;
        
        // Add coordinates array if latitude and longitude are available
        if (latitude !== undefined && longitude !== undefined) {
          return {
            ...event,
            coordinates: [longitude, latitude]
          };
        }
        
        return event;
      });
      
      // Filter events by distance
      events = events.filter(event => {
        // Skip events without coordinates
        if (!event.coordinates && (!event.venue?.latitude || !event.venue?.longitude)) {
          return false;
        }
        
        // Get event coordinates
        const eventLat = event.venue?.latitude || (event.coordinates ? event.coordinates[1] : null);
        const eventLng = event.venue?.longitude || (event.coordinates ? event.coordinates[0] : null);
        
        // Skip events with invalid coordinates
        if (eventLat === null || eventLng === null || 
            isNaN(Number(eventLat)) || isNaN(Number(eventLng))) {
          return false;
        }
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          Number(params.latitude),
          Number(params.longitude),
          Number(eventLat),
          Number(eventLng)
        );
        
        // Return true if the event is within the radius
        return distance <= Number(params.radius);
      });
      
      console.log(`[SEARCH-EVENTS-FIXED] ${events.length} events within radius`);
    }
    
    // Limit the number of events
    if (params.limit && events.length > params.limit) {
      events = events.slice(0, params.limit);
      console.log(`[SEARCH-EVENTS-FIXED] Limited to ${events.length} events`);
    }
    
    return events;
  } catch (error) {
    console.error(`[SEARCH-EVENTS-FIXED] Error processing events: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

serve(async (req: Request) => {
  console.log('[SEARCH-EVENTS-FIXED] Function started');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[SEARCH-EVENTS-FIXED] Handling OPTIONS request');
    return handleOptionsRequest();
  }

  try {
    console.log('[SEARCH-EVENTS-FIXED] Processing request');
    
    // Parse request body
    let params = {};
    if (req.method === 'POST') {
      params = await req.json();
      console.log('[SEARCH-EVENTS-FIXED] Request parameters:', JSON.stringify(params));
    } else {
      console.error('[SEARCH-EVENTS-FIXED] Invalid request method:', req.method);
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          events: []
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 405,
        }
      );
    }
    
    // Search for events
    console.log('[SEARCH-EVENTS-FIXED] Searching for events');
    const result = await searchRapidAPIEvents(params);
    
    // Process events
    const processedEvents = processEvents(result.events, params);
    
    // Return the response
    console.log('[SEARCH-EVENTS-FIXED] Returning response with', processedEvents.length, 'events');
    return new Response(
      JSON.stringify({
        events: processedEvents,
        sourceStats: {
          rapidapi: {
            count: processedEvents.length,
            error: result.error
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[SEARCH-EVENTS-FIXED] Error:', error instanceof Error ? error.message : String(error));
    
    // Return error response
    return new Response(
      JSON.stringify({
        events: [],
        error: error instanceof Error ? error.message : String(error),
        sourceStats: {
          rapidapi: {
            count: 0,
            error: error instanceof Error ? error.message : String(error)
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});