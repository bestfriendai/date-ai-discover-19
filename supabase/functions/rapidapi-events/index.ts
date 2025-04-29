// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Add Deno namespace declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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
 */
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

/**
 * Detect if an event is a party event based on keywords
 */
function isPartyEvent(title: string = '', description: string = '', venue: any = null): boolean {
  const partyKeywords = [
    'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
    'nightclub', 'mixer', 'social', 'festival', 'celebration',
    'cocktail', 'happy hour', 'gala', 'bar crawl', 'rooftop',
    'disco', 'bash', 'soiree', 'fiesta', 'shindig', 'get-together',
    'gathering', 'meetup', 'mingle', 'networking', 'social event',
    'after party', 'afterparty', 'after-party', 'vip', 'exclusive',
    'bottle service', 'open bar', 'drinks', 'booze', 'alcohol',
    'beer', 'wine', 'spirits', 'cocktails', 'shots', 'tequila',
    'vodka', 'whiskey', 'rum', 'gin', 'liquor', 'bartender',
    'mixologist', 'bartending', 'mixology', 'bar', 'pub', 'tavern',
    'speakeasy', 'brewery', 'winery', 'distillery', 'tasting',
    'sampling', 'flight', 'pairing', 'tasting room', 'taproom',
    'beer garden', 'biergarten', 'beer hall', 'beer fest',
    'wine tasting', 'wine festival', 'wine tour', 'wine pairing',
    'wine dinner', 'wine and cheese', 'wine and chocolate',
    'wine and food', 'wine and music', 'wine and art',
    'beer tasting', 'beer festival', 'beer tour', 'beer pairing',
    'beer dinner', 'beer and food', 'beer and music', 'beer and art'
  ];

  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Check venue subtype if available
  if (venue && venue.subtype) {
    const subtypeLower = typeof venue.subtype === 'string' ? venue.subtype.toLowerCase() : '';
    if (subtypeLower.includes('club') ||
        subtypeLower.includes('bar') ||
        subtypeLower.includes('lounge') ||
        subtypeLower.includes('nightlife') ||
        subtypeLower.includes('night_club') ||
        subtypeLower.includes('discos_and_night_clubs') ||
        subtypeLower.includes('dancing') ||
        subtypeLower.includes('entertainment') ||
        subtypeLower.includes('live_music_venue')) {
      return true;
    }
  }

  // Check venue subtypes array if available
  if (venue && venue.subtypes && Array.isArray(venue.subtypes)) {
    for (const subtype of venue.subtypes) {
      const subtypeLower = typeof subtype === 'string' ? subtype.toLowerCase() : '';
      if (subtypeLower.includes('club') ||
          subtypeLower.includes('bar') ||
          subtypeLower.includes('lounge') ||
          subtypeLower.includes('nightlife') ||
          subtypeLower.includes('night_club') ||
          subtypeLower.includes('discos_and_night_clubs') ||
          subtypeLower.includes('dancing') ||
          subtypeLower.includes('entertainment') ||
          subtypeLower.includes('live_music_venue')) {
        return true;
      }
    }
  }

  // Check if any party keywords are found in the title or description
  return partyKeywords.some(keyword => combinedText.includes(keyword));
}

/**
 * Transform a RapidAPI event to our standardized format
 */
function transformEvent(event: any) {
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
  let coordinates = undefined;
  let eventLongitude = event.venue?.longitude;
  let eventLatitude = event.venue?.latitude;

  // Only set coordinates if we have both latitude and longitude
  if (eventLatitude !== undefined && eventLongitude !== undefined &&
      eventLatitude !== null && eventLongitude !== null &&
      !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude))) {
    coordinates = [Number(eventLongitude), Number(eventLatitude)];
  }

  // Check if this is a party event
  const partyEvent = isPartyEvent(event.name, event.description, event.venue);
  const category = partyEvent ? 'party' : 'event';

  // Get event URL
  const eventUrl = event.link || '';

  // Get ticket URL if available
  const ticketUrl = event.ticket_links && event.ticket_links.length > 0
    ? event.ticket_links[0].link
    : eventUrl;

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
    isPartyEvent: partyEvent,
    ticketUrl
  };
}

/**
 * Search for events using RapidAPI
 */
async function searchRapidAPIEvents(params: any) {
  try {
    // Get RapidAPI key from environment variable
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') ||
                        Deno.env.get('X_RAPIDAPI_KEY') ||
                        '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'; // Fallback to the provided key

    if (!rapidApiKey) {
      throw new Error('RapidAPI key not available');
    }

    console.log(`Using RapidAPI key: ${rapidApiKey.substring(0, 4)}...`);

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Check if we're searching for party events
    const isPartySearch = params.categories &&
                         Array.isArray(params.categories) &&
                         params.categories.includes('party');

    // Build the query string based on parameters
    let queryString = '';

    // Add location to query if provided
    if (params.latitude !== undefined && params.longitude !== undefined) {
      // For coordinate-based searches, use the exact coordinates in the query
      // This is more precise than just saying "nearby"
      const lat = Number(params.latitude).toFixed(4);
      const lng = Number(params.longitude).toFixed(4);

      console.log(`Using coordinates in query: ${lat},${lng}`);

      if (isPartySearch) {
        // For party searches, explicitly include party keywords with coordinates
        queryString = `events party club nightlife dance dj festival near ${lat},${lng}`;
      } else {
        // For regular searches, just use coordinates
        queryString = `events near ${lat},${lng}`;
      }
    } else if (params.location) {
      // If no coordinates but location string is provided
      if (isPartySearch) {
        queryString = `parties in ${params.location}`;
      } else {
        queryString = `events in ${params.location}`;
      }
    } else {
      // Default fallback
      queryString = isPartySearch ? 'popular parties' : 'popular events';
    }

    // Add keyword to query if provided
    if (params.keyword) {
      queryString += ` ${params.keyword}`;
    } else if (isPartySearch && !queryString.includes('party')) {
      // Add party-specific keywords for party searches if not already included
      queryString += ' party club nightlife dance dj festival celebration nightclub bar lounge rave mixer social cocktail "happy hour" gala';
    }

    // Set the query parameter
    queryParams.append('query', queryString);
    console.log(`Using query string: "${queryString}"`);

    // Add date parameter - valid values for RapidAPI:
    // all, today, tomorrow, week, weekend, next_week, month, next_month

    // Use the startDate parameter if provided, otherwise default to 'month'
    let dateParam = 'month';

    // If we have a startDate that's today or in the future, use 'month'
    // This ensures we get events from today forward
    if (params.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day

      const startDate = new Date(params.startDate);
      if (!isNaN(startDate.getTime()) && startDate >= today) {
        console.log(`Using startDate: ${params.startDate}`);
        dateParam = 'month'; // Still use month but we'll filter by date later
      }
    }

    console.log(`Using date parameter: ${dateParam}`);
    queryParams.append('date', dateParam);

    // Set is_virtual parameter to false to only get in-person events
    queryParams.append('is_virtual', 'false');

    // Add start parameter for pagination (0-based index)
    const page = params.page ? Number(params.page) - 1 : 0;
    const start = page * (params.limit || 20);
    queryParams.append('start', start.toString());

    // Add limit parameter (default to 100 for more results)
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
      // Try to get more details from the error response
      let errorMessage = `RapidAPI request failed with status: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error(`RapidAPI error response: ${errorText.substring(0, 200)}`);
        errorMessage += ` - ${errorText.substring(0, 100)}`;
      } catch (e) {
        console.error(`Failed to read error response: ${e}`);
      }

      throw new Error(errorMessage);
    }

    // Parse the JSON response
    const data = await response.json();

    // Get raw events from the response
    const rawEvents = data.data || [];
    console.log(`Received ${rawEvents.length} raw events from RapidAPI`);

    // Transform events to our standardized format
    let transformedEvents = rawEvents.map(transformEvent);

    // Filter events based on parameters
    if (params.categories && Array.isArray(params.categories)) {
      // If searching for party events, filter to only include party events
      if (params.categories.includes('party')) {
        console.log('Filtering for party events only');
        transformedEvents = transformedEvents.filter(event =>
          event.isPartyEvent || event.category === 'party'
        );
        console.log(`Found ${transformedEvents.length} party events`);
      }
    }

    // Filter events by date if startDate is provided
    if (params.startDate) {
      console.log(`Filtering events by start date: ${params.startDate}`);
      const startDate = new Date(params.startDate);

      if (!isNaN(startDate.getTime())) {
        startDate.setHours(0, 0, 0, 0); // Set to beginning of day

        transformedEvents = transformedEvents.filter(event => {
          if (!event.date) return true; // Keep events without dates

          try {
            // Parse the event date (format: "Weekday, Month Day, Year")
            const eventDate = new Date(event.date);
            return !isNaN(eventDate.getTime()) && eventDate >= startDate;
          } catch (e) {
            console.warn(`Failed to parse event date: ${event.date}`);
            return true; // Keep events with unparseable dates
          }
        });

        console.log(`Found ${transformedEvents.length} events on or after ${params.startDate}`);
      }
    }

    // Filter events by distance if coordinates are provided
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius) {
      console.log(`Filtering events by distance: ${params.radius} miles from ${params.latitude},${params.longitude}`);

      const userLat = Number(params.latitude);
      const userLng = Number(params.longitude);
      const radius = Number(params.radius) || 30; // Default to 30 miles

      // Filter events that have coordinates and are within the radius
      transformedEvents = transformedEvents.filter(event => {
        // Skip events without coordinates
        if (!event.coordinates && (!event.latitude || !event.longitude)) {
          return false;
        }

        // Get event coordinates
        let eventLat, eventLng;

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
          userLat,
          userLng,
          Number(eventLat),
          Number(eventLng)
        );

        // Return true if event is within the radius
        return distance <= radius;
      });

      console.log(`Found ${transformedEvents.length} events within ${radius} miles`);
    }

    // If we have no events but we're using coordinates, try a fallback approach
    // by generating some events near the coordinates
    if (transformedEvents.length === 0 &&
        params.latitude !== undefined &&
        params.longitude !== undefined) {

      console.log(`No events found, generating fallback events near coordinates`);

      // Create a few fallback events for testing/development
      const fallbackEvents = [];
      const userLat = Number(params.latitude);
      const userLng = Number(params.longitude);

      // Only add fallback events in development mode
      // In production, this should be removed or disabled
      const isDevelopment = true; // Set to false in production

      if (isDevelopment) {
        // Generate 5 random events around the user's location
        for (let i = 0; i < 5; i++) {
          // Random offset within ~5 miles
          const latOffset = (Math.random() - 0.5) * 0.1;
          const lngOffset = (Math.random() - 0.5) * 0.1;

          fallbackEvents.push({
            id: `fallback_${i}`,
            source: 'rapidapi',
            title: isPartySearch ?
              `Test Party Event ${i+1}` :
              `Test Event ${i+1}`,
            description: 'This is a fallback event for testing purposes.',
            date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }),
            time: '8:00 PM',
            location: 'Near your location',
            venue: 'Test Venue',
            category: isPartySearch ? 'party' : 'event',
            image: 'https://placehold.co/600x400?text=Test+Event',
            imageAlt: 'Test event image',
            coordinates: [userLng + lngOffset, userLat + latOffset],
            longitude: userLng + lngOffset,
            latitude: userLat + latOffset,
            url: 'https://example.com',
            isPartyEvent: isPartySearch,
            ticketUrl: 'https://example.com/tickets'
          });
        }

        console.log(`Generated ${fallbackEvents.length} fallback events`);
        transformedEvents = fallbackEvents;
      }
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
