// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
function detectPartyEvent(title: string = '', description: string = ''): boolean {
  // Party-related keywords
  const partyKeywords = [
    'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
    'nightclub', 'mixer', 'social', 'festival', 'celebration',
    'cocktail', 'happy hour', 'gala'
  ];

  // Normalize inputs
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Check if any party keywords are found in the title or description
  return partyKeywords.some(keyword => combinedText.includes(keyword));
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
  const isPartyEvent = detectPartyEvent(event.name, event.description);
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
 * Enhanced function to search for events using RapidAPI Events Search API
 * with improved handling for party events and coordinates
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

    // Build query parameters for the RapidAPI Events Search API
    const queryParams = new URLSearchParams();

    // Check if we're searching for party events
    const isPartySearch = params.categories &&
                         Array.isArray(params.categories) &&
                         params.categories.includes('party');

    // Build the query string based on parameters
    let queryString = '';

    // Add location to query if provided
    if (params.location) {
      if (isPartySearch) {
        // For party searches, add party keywords to the location search
        queryString = `parties in ${params.location}`;
      } else {
        queryString = `events in ${params.location}`;
      }
    } else if (params.latitude !== undefined && params.longitude !== undefined) {
      // For coordinate-based searches
      if (isPartySearch) {
        queryString = 'parties nearby';
      } else {
        queryString = 'events nearby';
      }
    } else {
      // Default fallback
      queryString = isPartySearch ? 'popular parties' : 'popular events';
    }

    // Add keyword to query if provided
    if (params.keyword) {
      queryString += ` ${params.keyword}`;
    } else if (isPartySearch) {
      // Add party-specific keywords for party searches
      queryString += ' party club nightlife dance dj festival celebration';
    }

    // Set the query parameter
    queryParams.append('query', queryString);
    console.log(`Using query string: "${queryString}"`);

    // Add date parameter - valid values for RapidAPI:
    // all, today, tomorrow, week, weekend, next_week, month, next_month
    queryParams.append('date', params.startDate ? 'week' : 'week');

    // Set is_virtual parameter to false to only get in-person events
    queryParams.append('is_virtual', 'false');

    // Add start parameter for pagination (0-based index)
    queryParams.append('start', '0');

    // Add limit parameter to get more results
    queryParams.append('limit', '100');

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

    // Get raw events from the response
    const rawEvents = data.data || [];
    console.log(`Received ${rawEvents.length} raw events from RapidAPI`);

    // Transform events to our standardized format
    let transformedEvents = rawEvents.map(transformRapidAPIEvent);

    // Filter events based on parameters
    if (params.categories && Array.isArray(params.categories)) {
      // If searching for party events, filter to only include party events
      if (params.categories.includes('party')) {
        console.log('Filtering for party events only');
        transformedEvents = transformedEvents.filter((event: Event) =>
          event.isPartyEvent || event.category === 'party'
        );
        console.log(`Found ${transformedEvents.length} party events`);
      }
    }

    // Filter events by distance if coordinates are provided
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius) {
      console.log(`Filtering events by distance: ${params.radius} miles from ${params.latitude},${params.longitude}`);

      const userLat = params.latitude;
      const userLng = params.longitude;
      const radius = params.radius || 30; // Default to 30 miles

      // Filter events that have coordinates and are within the radius
      transformedEvents = transformedEvents.filter((event: Event) => {
        // Skip events without coordinates
        if (!event.coordinates && (!event.latitude || !event.longitude)) {
          return false;
        }

        // Get event coordinates
        let eventLat: number | undefined;
        let eventLng: number | undefined;

        if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length >= 2) {
          // Coordinates array format is [longitude, latitude]
          eventLng = event.coordinates[0];
          eventLat = event.coordinates[1];
        } else {
          // Direct latitude/longitude properties
          eventLat = event.latitude;
          eventLng = event.longitude;
        }

        // Skip events with invalid coordinates
        if (eventLat === null || eventLng === null ||
            eventLat === undefined || eventLng === undefined ||
            isNaN(Number(eventLat)) || isNaN(Number(eventLng))) {
          return false;
        }

        // Calculate distance between user and event
        const distance = calculateDistance(
          Number(userLat),
          Number(userLng),
          Number(eventLat),
          Number(eventLng)
        );

        // Return true if event is within the radius
        return distance <= radius;
      });

      console.log(`Found ${transformedEvents.length} events within ${radius} miles`);
    }

    // Return the filtered events
    return {
      events: transformedEvents,
      error: null
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
