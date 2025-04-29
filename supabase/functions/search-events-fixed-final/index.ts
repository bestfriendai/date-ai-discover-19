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
  console.log('[SEARCH-EVENTS-FIXED] Handling OPTIONS request');
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status: 204,
  });
}

// Interface for search parameters
interface SearchParams {
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

// Interface for event data
interface Event {
  id: string;
  source: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  venue?: string;
  category?: string;
  partySubcategory?: string;
  image?: string;
  imageAlt?: string;
  coordinates?: [number, number] | undefined; // [longitude, latitude]
  longitude?: number;
  latitude?: number;
  url?: string;
  price?: string;
  isPartyEvent?: boolean;
}

// Simple function to search for events using RapidAPI
async function searchRapidAPIEvents(params: SearchParams): Promise<{ events: Event[], error: string | null }> {
  try {
    console.log('[SEARCH-EVENTS-FIXED] Starting RapidAPI search with params:', JSON.stringify(params));

    // Get RapidAPI key
    // @ts-ignore: Deno is available at runtime
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') ||
                        // @ts-ignore: Deno is available at runtime
                        Deno.env.get('X_RAPIDAPI_KEY') ||
                        // @ts-ignore: Deno is available at runtime
                        Deno.env.get('REAL_TIME_EVENTS_API_KEY');

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
    let queryString = '';

    // We'll determine if this is a party search later when filtering events

    if (params.location) {
      queryString = `events in ${params.location}`;
      console.log(`[SEARCH-EVENTS-FIXED] Using location: ${params.location}`);
    } else if (params.latitude && params.longitude) {
      // If we have coordinates but no location, use "events nearby"
      queryString = 'events nearby';
      console.log(`[SEARCH-EVENTS-FIXED] Using coordinates: ${params.latitude},${params.longitude}`);
    } else {
      queryString = 'popular events';
      console.log('[SEARCH-EVENTS-FIXED] No location or coordinates, using "popular events"');
    }

    // We no longer need to enhance the query with party keywords
    // We'll filter for party events after getting the results

    // Set the query parameter
    queryParams.append('query', queryString);

    // Add date parameter (use 'month' to get more events)
    queryParams.append('date', 'month');

    // Add is_virtual parameter
    queryParams.append('is_virtual', 'false');

    // Add start parameter for pagination
    queryParams.append('start', '0');

    // Add limit parameter to get more results
    queryParams.append('limit', '200');

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

    // Transform events to our format
    const events = (data.data || []).map((event: any) => {
      // Extract venue information
      const venue = event.venue?.name || '';
      let location = '';

      if (event.venue) {
        // Use full_address if available
        if (event.venue.full_address) {
          location = event.venue.full_address;
        } else {
          // Otherwise construct from parts
          const venueParts = [
            event.venue.city,
            event.venue.state,
            event.venue.country
          ].filter(Boolean);

          location = venueParts.join(', ');
        }
      }

      // Get coordinates if available
      let coordinates: [number, number] | undefined = undefined;
      let eventLongitude = event.venue?.longitude;
      let eventLatitude = event.venue?.latitude;

      // Only set coordinates if we have both latitude and longitude
      if (eventLatitude !== undefined && eventLongitude !== undefined &&
          eventLatitude !== null && eventLongitude !== null &&
          !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude))) {
        coordinates = [Number(eventLongitude), Number(eventLatitude)] as [number, number];
      }

      // Check if this is a party event - Enhanced party detection with expanded keywords
      const partyKeywords = [
        'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
        'festival', 'celebration', 'gala', 'social', 'mixer', 'nightclub',
        'disco', 'bash', 'soiree', 'fiesta', 'shindig', 'get-together',
        'brunch', 'day party', 'pool party', 'rooftop', 'concert', 'live music',
        'edm', 'hip hop', 'techno', 'house music', 'afterparty', 'after party',
        'vip', 'bottle service', 'bar crawl', 'music festival'
      ];

      // Venue-specific keywords that strongly indicate a party venue
      const partyVenueKeywords = [
        'club', 'lounge', 'bar', 'nightclub', 'disco', 'hall', 'arena',
        'venue', 'rooftop', 'terrace', 'garden', 'pool'
      ];

      const nameLower = event.name?.toLowerCase() || '';
      const descriptionLower = event.description?.toLowerCase() || '';
      const venueLower = venue?.toLowerCase() || '';

      // Check if title or description contains party keywords
      const hasPartyKeyword =
        partyKeywords.some(keyword => nameLower.includes(keyword)) ||
        partyKeywords.some(keyword => descriptionLower.includes(keyword));

      // Check if venue name contains party venue keywords
      const hasPartyVenue = partyVenueKeywords.some(keyword => venueLower.includes(keyword));

      // Event is a party if it has party keywords or a party venue
      const isPartyEvent = hasPartyKeyword || hasPartyVenue;

      // Determine party subcategory
      let partySubcategory: string | undefined = undefined;

      if (isPartyEvent) {
        partySubcategory = 'general';

        // Determine more specific party subcategory with enhanced detection
        if (nameLower.includes('festival') || descriptionLower.includes('festival') ||
            nameLower.includes('music festival') || descriptionLower.includes('music festival')) {
          partySubcategory = 'festival';
        } else if (nameLower.includes('brunch') || descriptionLower.includes('brunch')) {
          partySubcategory = 'brunch';
        } else if ((nameLower.includes('day') && nameLower.includes('party')) ||
                  (descriptionLower.includes('day') && descriptionLower.includes('party')) ||
                  nameLower.includes('pool party') || descriptionLower.includes('pool party') ||
                  nameLower.includes('rooftop') || descriptionLower.includes('rooftop') ||
                  nameLower.includes('afternoon') || descriptionLower.includes('afternoon')) {
          partySubcategory = 'day-party';
        } else if (nameLower.includes('club') || descriptionLower.includes('club') ||
                  nameLower.includes('nightlife') || descriptionLower.includes('nightlife') ||
                  nameLower.includes('dj') || descriptionLower.includes('dj') ||
                  nameLower.includes('dance') || descriptionLower.includes('dance')) {
          partySubcategory = 'club';
        } else if (nameLower.includes('social') || descriptionLower.includes('social') ||
                  nameLower.includes('mixer') || descriptionLower.includes('mixer') ||
                  nameLower.includes('networking') || descriptionLower.includes('networking')) {
          partySubcategory = 'social';
        } else if (nameLower.includes('celebration') || descriptionLower.includes('celebration') ||
                  nameLower.includes('gala') || descriptionLower.includes('gala')) {
          partySubcategory = 'celebration';
        }
      }

      // Return transformed event
      return {
        id: `rapidapi_${event.event_id}`,
        source: 'rapidapi',
        title: event.name,
        description: event.description || '',
        date: event.date_human_readable,
        time: '',
        location,
        venue,
        category: isPartyEvent ? 'party' : 'other',
        partySubcategory: isPartyEvent ? partySubcategory : undefined,
        image: event.thumbnail || '',
        coordinates,
        longitude: eventLongitude,
        latitude: eventLatitude,
        url: event.link,
        isPartyEvent
      };
    });

    // Filter events by category if specified
    let filteredEvents = events;
    if (params.categories && params.categories.length > 0) {
      console.log(`[SEARCH-EVENTS-FIXED] Filtering by categories: ${params.categories.join(', ')}`);

      // If 'party' is in the categories, filter for party events
      if (params.categories.includes('party')) {
        filteredEvents = events.filter((event: Event) => event.isPartyEvent);
        console.log(`[SEARCH-EVENTS-FIXED] Filtered to ${filteredEvents.length} party events`);
      }
    }

    // Filter by coordinates if available
    if (params.latitude && params.longitude && params.radius) {
      console.log(`[SEARCH-EVENTS-FIXED] Filtering by coordinates: ${params.latitude},${params.longitude} with radius ${params.radius} miles`);

      // First, add fallback coordinates for events without them
      // This ensures more events appear on the map near the search location
      const eventsWithCoordinates = filteredEvents.map((event: Event) => {
        // If event already has valid coordinates, use them
        if ((event.coordinates && event.coordinates.length === 2) ||
            (event.latitude !== undefined && event.longitude !== undefined)) {
          return event;
        }

        // Otherwise, assign coordinates near the search location with a random offset
        // This ensures events without coordinates still appear on the map
        const randomOffset = 0.05; // ~3-5 miles
        const fallbackCoords: [number, number] = [
          Number(params.longitude) + (Math.random() - 0.5) * randomOffset * 2,
          Number(params.latitude) + (Math.random() - 0.5) * randomOffset * 2
        ];

        console.log(`[SEARCH-EVENTS-FIXED] Adding fallback coordinates for event: ${event.id}`);

        return {
          ...event,
          coordinates: fallbackCoords,
          latitude: fallbackCoords[1],
          longitude: fallbackCoords[0]
        };
      });

      // Now filter events by distance
      filteredEvents = eventsWithCoordinates.filter((event: Event) => {
        // Get event coordinates
        const eventLat = event.latitude || (event.coordinates ? event.coordinates[1] : null);
        const eventLng = event.longitude || (event.coordinates ? event.coordinates[0] : null);

        // Skip events with invalid coordinates (should be none after adding fallbacks)
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

      console.log(`[SEARCH-EVENTS-FIXED] ${filteredEvents.length} events within radius`);
    }

    // Limit the number of events
    if (params.limit && filteredEvents.length > params.limit) {
      filteredEvents = filteredEvents.slice(0, params.limit);
      console.log(`[SEARCH-EVENTS-FIXED] Limited to ${filteredEvents.length} events`);
    }

    return {
      events: filteredEvents,
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
  console.log('[SEARCH-EVENTS-FIXED] Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    console.log('[SEARCH-EVENTS-FIXED] Processing request');

    // Parse request body
    let params: SearchParams = {};
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

    // Return the response
    console.log('[SEARCH-EVENTS-FIXED] Returning response with', result.events.length, 'events');
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
          timestamp: new Date().toISOString(),
          totalEvents: result.events.length,
          pageSize: params.limit || 100,
          page: params.page || 1,
          hasMore: result.events.length >= (params.limit || 100)
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
          timestamp: new Date().toISOString(),
          totalEvents: 0,
          pageSize: 100,
          page: 1,
          hasMore: false
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