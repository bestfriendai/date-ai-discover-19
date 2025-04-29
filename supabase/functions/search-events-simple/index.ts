// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Import the enhanced RapidAPI integration
import { searchRapidAPIEvents as enhancedSearchRapidAPIEvents } from "../search-events/rapidapi-enhanced.ts";
import { SearchParams } from "../search-events/types.ts";

// Add Deno namespace declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Define Event interface for type safety
interface Event {
  id: string;
  source: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  category: string;
  image: string;
  imageAlt?: string;
  coordinates?: [number, number];
  longitude?: number;
  latitude?: number;
  url?: string;
  isPartyEvent?: boolean;
}

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

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Convert latitude and longitude from degrees to radians
  const radLat1 = (Math.PI * lat1) / 180;
  const radLon1 = (Math.PI * lon1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;
  const radLon2 = (Math.PI * lon2) / 180;

  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Earth's radius in miles
  const radius = 3958.8;

  // Calculate the distance
  return radius * c;
}

/**
 * Detect if an event is a party event based on keywords
 * @param title - Event title
 * @param description - Event description
 * @returns Boolean indicating if it's a party event
 */
function detectPartyEvent(title: string = '', description: string = '', venue: string = ''): boolean {
  // Party-related keywords - expanded list
  const partyKeywords = [
    'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
    'nightclub', 'mixer', 'social', 'festival', 'celebration',
    'cocktail', 'happy hour', 'gala', 'disco', 'bar crawl',
    'music festival', 'concert', 'live music', 'edm', 'hip hop',
    'techno', 'house music', 'brunch party', 'day party', 'pool party',
    'rooftop', 'afterparty', 'after party', 'vip', 'bottle service'
  ];

  // Venue-specific keywords that strongly indicate a party venue
  const partyVenueKeywords = [
    'club', 'lounge', 'bar', 'nightclub', 'disco', 'hall', 'arena',
    'venue', 'rooftop', 'terrace', 'garden', 'pool'
  ];

  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const venueLower = (venue || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Check if any party keywords are found in the title or description
  const hasPartyKeyword = partyKeywords.some(keyword => combinedText.includes(keyword));

  // Check if venue name contains party venue keywords
  const hasPartyVenue = partyVenueKeywords.some(keyword => venueLower.includes(keyword));

  return hasPartyKeyword || hasPartyVenue;
}

/**
 * Transform a RapidAPI event to our standardized Event format
 * @param event - Raw event from RapidAPI
 * @returns Standardized event object
 */
function transformRapidAPIEvent(event: any): Event {
  // Extract venue information
  const venue = event.venue?.name || '';
  const location = event.venue?.full_address ||
                  `${event.venue?.city || ''}, ${event.venue?.state || ''}`.trim() ||
                  'Location not specified';

  // Extract date and time
  const date = event.start_time
    ? new Date(event.start_time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Date not specified';

  const time = event.start_time
    ? new Date(event.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : '';

  // Extract coordinates
  let coordinates: [number, number] | undefined = undefined;
  let eventLongitude = event.venue?.longitude;
  let eventLatitude = event.venue?.latitude;

  // Only set coordinates if we have both latitude and longitude
  if (eventLatitude !== undefined && eventLongitude !== undefined &&
      eventLatitude !== null && eventLongitude !== null &&
      !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude))) {
    coordinates = [Number(eventLongitude), Number(eventLatitude)];
  }

  // Determine category and check if it's a party event
  let category = 'event';

  // Check if this is a party event
  const isPartyEvent = detectPartyEvent(event.name, event.description, venue);
  if (isPartyEvent) {
    category = 'party';
  }

  // Get event URL
  const eventUrl = event.link || '';

  // Get event image
  const eventImage = event.thumbnail || 'https://placehold.co/600x400?text=No+Image';

  // Create standardized event object
  return {
    id: `rapidapi_${event.event_id}`,
    source: 'rapidapi',
    title: event.name,
    description: event.description || '',
    date,
    time,
    location,
    venue,
    category,
    image: eventImage,
    imageAlt: `${event.name} event image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: eventUrl,
    isPartyEvent
  };
}

/**
 * Enhanced function to search for events using the improved RapidAPI integration
 * This is a wrapper around the enhanced implementation to maintain backward compatibility
 *
 * @param params - Search parameters object containing location, categories, etc.
 * @returns Object containing events array and any error information
 */
async function searchRapidAPIEvents(params: any) {
  try {
    // Get RapidAPI key from environment variable
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') ||
                        Deno.env.get('X_RAPIDAPI_KEY') ||
                        Deno.env.get('REAL_TIME_EVENTS_API_KEY');

    if (!rapidApiKey) {
      throw new Error('RapidAPI key not available');
    }

    // Log the masked API key for debugging
    const maskedKey = rapidApiKey.substring(0, 4) + '...' + rapidApiKey.substring(rapidApiKey.length - 4);
    console.log(`Using RapidAPI key: ${maskedKey}`);
    
    // Convert params to SearchParams format expected by the enhanced implementation
    const searchParams: SearchParams = {
      keyword: params.keyword,
      location: params.location,
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 30, // Default to 30 miles
      startDate: params.startDate,
      endDate: params.endDate,
      categories: params.categories,
      limit: params.limit || 100,
      page: params.page || 1
    };
    
    console.log(`Using enhanced RapidAPI integration with params:`, JSON.stringify(searchParams));
    
    // Call the enhanced implementation
    const result = await enhancedSearchRapidAPIEvents(searchParams, rapidApiKey);
    
    console.log(`Enhanced search completed. Found ${result.events.length} events.`);
    if (result.searchQueryUsed) {
      console.log(`Query used: "${result.searchQueryUsed}"`);
    }
    
    // Return in the format expected by the simple API
    return {
      events: result.events,
      error: result.error
    };
  } catch (error) {
    console.error(`Error searching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`);
    return {
      events: [],
      error: `Error searching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    // Parse request body
    let params = {};
    if (req.method === 'POST') {
      params = await req.json();
    }

    // Log the search parameters for debugging
    console.log('Search parameters:', JSON.stringify(params));

    // Call the searchRapidAPIEvents function to fetch events
    // This is the main function that handles the RapidAPI integration
    const result = await searchRapidAPIEvents(params);

    // Return the response
    return new Response(
      JSON.stringify({
        events: result.events,
        sourceStats: {
          rapidapi: {
            count: result.events.length,
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
