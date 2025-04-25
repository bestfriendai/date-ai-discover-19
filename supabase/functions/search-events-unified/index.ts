// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { fetchTicketmasterEvents } from "./ticketmaster.ts"
import { fetchPredictHQEvents } from "./predicthq.ts"
import { Event, SearchParams } from "./types.ts"

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Helper function for consistent response formatting
function safeResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  // Log request details for debugging
  console.log('[SEARCH-EVENTS] Request method:', req.method);
  console.log('[SEARCH-EVENTS] Request URL:', req.url);

  const startTime: number = Date.now();

  try {
    console.log('[SEARCH-EVENTS] Received request');

    // Get API keys from environment variables
    // @ts-ignore: Deno is available at runtime
    let TICKETMASTER_KEY;
    let PREDICTHQ_API_KEY;

    try {
      // @ts-ignore: Deno is available at runtime
      TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY');
      // @ts-ignore: Deno is available at runtime
      PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] Error accessing environment variables:', error);
    }

    // Use fallback keys if environment variables are not available
    TICKETMASTER_KEY = TICKETMASTER_KEY || 'DpUgXkAg7KMNGmB9GsUjt5hIeUCJ7X5f';
    PREDICTHQ_API_KEY = PREDICTHQ_API_KEY || 'Pbax0yFsCfXX8OfpC_-wnk3aqPP_JKb2rROBuE5s';

    console.log('[SEARCH-EVENTS] Using API keys:', {
      TICKETMASTER_KEY: TICKETMASTER_KEY ? `${TICKETMASTER_KEY.substring(0, 4)}...` : 'NOT SET',
      PREDICTHQ_API_KEY: PREDICTHQ_API_KEY ? `${PREDICTHQ_API_KEY.substring(0, 4)}...` : 'NOT SET'
    });

    // Parse request parameters with error handling
    let params: SearchParams;

    // Check if the request has a body
    const contentLength = req.headers.get('content-length');
    console.log('[SEARCH-EVENTS] Content-Length:', contentLength);

    if (!contentLength || parseInt(contentLength) === 0) {
      console.warn('[SEARCH-EVENTS] Empty request body detected, using default parameters');
      // Use default parameters if no body is provided
      params = {
        location: 'New York',
        radius: 50,
        startDate: new Date().toISOString().split('T')[0], // Today
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        categories: ['music', 'sports', 'arts', 'family', 'food']
      };
    } else {
      try {
        // Parse the request body as JSON
        const requestBody = await req.json();
        console.log('[SEARCH-EVENTS] Request body:', requestBody);

        // Extract location parameters
        const latitude = requestBody.lat || requestBody.latitude || requestBody.userLat;
        const longitude = requestBody.lng || requestBody.longitude || requestBody.userLng;
        const location = requestBody.location || '';

        // Validate location parameters
        if ((!latitude || !longitude) && !location) {
          return safeResponse({
            error: 'Missing location parameters',
            details: 'Either coordinates (latitude/longitude) or location string is required',
            events: [],
            sourceStats: {
              ticketmaster: { count: 0, error: 'Missing location parameters' },
              predicthq: { count: 0, error: 'Missing location parameters' }
            },
            meta: {
              executionTime: Date.now() - startTime,
              totalEvents: 0,
              eventsWithCoordinates: 0,
              timestamp: new Date().toISOString()
            }
          }, 400);
        }

        // Validate and normalize radius
        let radius = requestBody.radius || 50;
        radius = Math.min(Math.max(radius, 5), 100); // Enforce minimum 5km and maximum 100km radius

        // Validate and extract parameters
        params = {
          keyword: requestBody.keyword || '',
          location,
          latitude,
          longitude,
          radius,
          startDate: requestBody.startDate || new Date().toISOString().split('T')[0],
          endDate: requestBody.endDate,
          categories: requestBody.categories || [],
          limit: requestBody.limit || 100,
          page: requestBody.page || 1,
          excludeIds: requestBody.excludeIds || []
        };

        console.log('[SEARCH-EVENTS] Parsed parameters:', params);
      } catch (error) {
        console.error('[SEARCH-EVENTS] Error parsing request body:', error);
        return safeResponse({
          error: 'Invalid request body',
          details: error instanceof Error ? error.message : undefined,
          events: [],
          sourceStats: {
            ticketmaster: { count: 0, error: 'Invalid request' },
            predicthq: { count: 0, error: 'Invalid request' }
          },
          meta: {
            executionTime: Date.now() - startTime,
            totalEvents: 0,
            eventsWithCoordinates: 0,
            timestamp: new Date().toISOString()
          }
        }, 400);
      }
    }

    // Initialize variables for tracking events
    const allEvents: Event[] = [];
    let ticketmasterCount = 0;
    let ticketmasterError: string | null = null;
    let predicthqCount = 0;
    let predicthqError: string | null = null;

    // Ensure radius is a number
    const radiusNumber = typeof params.radius === 'string' ? parseInt(params.radius, 10) : params.radius || 30;

    // Fetch events from Ticketmaster
    try {
      console.log('[SEARCH-EVENTS] Fetching Ticketmaster events...');
      const ticketmasterResponse = await fetchTicketmasterEvents({
        apiKey: TICKETMASTER_KEY,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: radiusNumber,
        startDate: params.startDate,
        endDate: params.endDate,
        keyword: params.keyword,
        location: params.location, // Pass location parameter
        segmentName: params.categories?.includes('music') ? 'Music' :
          params.categories?.includes('sports') ? 'Sports' :
          params.categories?.includes('arts') ? 'Arts & Theatre' :
          params.categories?.includes('family') ? 'Family' :
          undefined,
        size: params.limit
      });

      if (ticketmasterResponse.error) {
        ticketmasterError = ticketmasterResponse.error;
        console.error('[SEARCH-EVENTS] Ticketmaster API error:', ticketmasterError);
      } else {
        ticketmasterCount = ticketmasterResponse.events.length;
        allEvents.push(...ticketmasterResponse.events);
        console.log(`[SEARCH-EVENTS] Added ${ticketmasterCount} Ticketmaster events`);
      }
    } catch (error) {
      ticketmasterError = `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[SEARCH-EVENTS] Error fetching Ticketmaster events:', error);
    }

    // Fetch events from PredictHQ
    try {
      console.log('[SEARCH-EVENTS] Fetching PredictHQ events...');
      const predicthqResponse = await fetchPredictHQEvents({
        apiKey: PREDICTHQ_API_KEY,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: radiusNumber,
        startDate: params.startDate,
        endDate: params.endDate,
        categories: params.categories,
        location: params.location,
        keyword: params.keyword,
        limit: params.limit
      });

      if (predicthqResponse.error) {
        predicthqError = predicthqResponse.error;
        console.error('[SEARCH-EVENTS] PredictHQ API error:', predicthqError);
      } else {
        predicthqCount = predicthqResponse.events.length;
        allEvents.push(...predicthqResponse.events);
        console.log(`[SEARCH-EVENTS] Added ${predicthqCount} PredictHQ events`);
      }
    } catch (error) {
      predicthqError = `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[SEARCH-EVENTS] Error fetching PredictHQ events:', error);
    }

    // Check if both APIs failed and we have no events
    if (allEvents.length === 0 && ticketmasterError && predicthqError) {
      console.error('[SEARCH-EVENTS] Both APIs failed, generating mock events as fallback');

      // Generate some mock events near the user's location as a fallback
      if (params.latitude && params.longitude) {
        const mockEvents: Event[] = [];

        // Create a few mock events with different categories
        const categories = ['music', 'sports', 'arts', 'family', 'food'];
        const titles = [
          'Local Music Festival',
          'Community Sports Event',
          'Art Exhibition',
          'Family Fun Day',
          'Food & Wine Tasting'
        ];

        // Generate events for the next 7 days
        for (let i = 0; i < 5; i++) {
          const eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + i + 1);

          // Add small random offset to coordinates
          const latOffset = (Math.random() - 0.5) * 0.05;
          const lngOffset = (Math.random() - 0.5) * 0.05;

          mockEvents.push({
            id: `mock-event-${i}`,
            source: 'mock',
            title: titles[i],
            description: `This is a mock event generated because both APIs failed. It's near your location.`,
            date: eventDate.toISOString().split('T')[0],
            time: '19:00',
            location: params.location || 'Near your location',
            category: categories[i],
            image: `https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop`,
            coordinates: [Number(params.longitude) + lngOffset, Number(params.latitude) + latOffset]
          });
        }

        allEvents.push(...mockEvents);
        console.log(`[SEARCH-EVENTS] Added ${mockEvents.length} mock events as fallback`);
      }
    }

    // Filter out events with missing required fields
    const validEvents = allEvents.filter(event => {
      const isValid = !!event.id && !!event.title && !!event.date;
      if (!isValid) {
        console.warn(`[SEARCH-EVENTS] Filtering out invalid event:`, {
          id: event.id,
          title: event.title,
          date: event.date
        });
      }
      return isValid;
    });

    // Filter out excluded IDs
    const filteredEvents = validEvents.filter(event => {
      return !params.excludeIds?.includes(event.id);
    });

    // Log events with and without coordinates
    const eventsWithCoords = filteredEvents.filter(event => {
      return !!event.coordinates || (!!event.latitude && !!event.longitude);
    });

    const eventsWithoutCoords = filteredEvents.filter(event => {
      return !event.coordinates && (!event.latitude || !event.longitude);
    });

    console.log(`[SEARCH-EVENTS] Events with coordinates: ${eventsWithCoords.length}, without coordinates: ${eventsWithoutCoords.length}`);

    // If we have very few events with coordinates, add some default coordinates
    if (eventsWithCoords.length < 5 && eventsWithoutCoords.length > 0 && params.latitude && params.longitude) {
      console.log(`[SEARCH-EVENTS] Adding default coordinates to events without coordinates`);

      eventsWithoutCoords.forEach(event => {
        const latOffset = (Math.random() - 0.5) * 0.1;
        const lngOffset = (Math.random() - 0.5) * 0.1;

        event.coordinates = [
          Number(params.longitude) + lngOffset,
          Number(params.latitude) + latOffset
        ];

        console.log(`[SEARCH-EVENTS] Added default coordinates to event: ${event.id} - ${event.title}`);
      });
    }

    // Helper function to parse event date and time
    function parseEventDate(dateStr: string, timeStr?: string): Date {
      try {
        if (dateStr.includes('T') && dateStr.includes('Z')) {
          return new Date(dateStr);
        }

        const dateOnly = dateStr.split('T')[0];
        const timeOnly = timeStr || '00:00';
        const dateTimeStr = `${dateOnly}T${timeOnly}`;

        return new Date(dateTimeStr);
      } catch (e) {
        console.warn('Error parsing date:', dateStr, timeStr, e);
        return new Date();
      }
    }

    // Sort events by date (soonest first)
    filteredEvents.sort((a, b) => {
      const dateA = parseEventDate(a.date, a.time);
      const dateB = parseEventDate(b.date, b.time);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;
    const totalEvents = allEvents.length;

    console.log(`[SEARCH-EVENTS] Returning ${filteredEvents.length} events (${eventsWithCoords.length} with coordinates)`);
    console.log(`[SEARCH-EVENTS] Execution time: ${executionTime}ms`);

    // Check if we have any events
    if (filteredEvents.length === 0) {
      console.log('[SEARCH-EVENTS] No events found, returning empty array with warning');

      // Determine the reason for no events
      let noEventsReason = 'No events found for the given parameters';

      if (ticketmasterError && predicthqError) {
        noEventsReason = 'Both Ticketmaster and PredictHQ APIs returned errors';
      } else if (allEvents.length > 0 && filteredEvents.length === 0) {
        noEventsReason = 'Events were found but filtered out due to missing required fields';
      }

      return safeResponse({
        events: [],
        warning: noEventsReason,
        sourceStats: {
          ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
          predicthq: { count: predicthqCount, error: predicthqError }
        },
        meta: {
          executionTime,
          totalEvents,
          eventsWithCoordinates: eventsWithCoords.length,
          timestamp: new Date().toISOString()
        }
      }, 200);
    }

    // Return the response with events
    return safeResponse({
      events: filteredEvents,
      sourceStats: {
        ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
        predicthq: { count: predicthqCount, error: predicthqError }
      },
      meta: {
        executionTime,
        totalEvents,
        eventsWithCoordinates: eventsWithCoords.length,
        timestamp: new Date().toISOString()
      }
    }, 200);
  } catch (error) {
    console.error('[SEARCH-EVENTS] CRITICAL ERROR:', error);

    // Extract error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    const executionTime = Date.now() - startTime;

    return safeResponse({
      events: [],
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      sourceStats: {
        ticketmaster: { count: 0, error: 'Function execution failed' },
        predicthq: { count: 0, error: 'Function execution failed' }
      },
      meta: {
        executionTime,
        totalEvents: 0,
        eventsWithCoordinates: 0,
        timestamp: new Date().toISOString()
      }
    }, 500);
  }
});
