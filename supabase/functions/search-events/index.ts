// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { fetchPredictHQEvents, PredictHQResponse } from "./predicthq-fixed-new.ts"
import { fetchTicketmasterEvents } from "./ticketmaster.ts"
import { Event, SearchParams } from "./types.ts"

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

// Environment variables with fallbacks for development
// @ts-ignore: Deno is available at runtime
let TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY') || '';
// @ts-ignore: Deno is available at runtime
let SERPAPI_KEY = Deno.env.get('SERPAPI_KEY') || '';
// @ts-ignore: Deno is available at runtime
let PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY') || '';

// TEMPORARY FIX: Hardcoded API keys for testing
// IMPORTANT: Remove these before production deployment
// These are placeholder values and need to be replaced with actual API keys
if (!TICKETMASTER_KEY) {
  TICKETMASTER_KEY = 'DpUgXkAg7KMNGmB9GsUjt5hIeUCJ7X5f'; // Public demo key for testing
  console.log('[ENV] Using hardcoded TICKETMASTER_KEY for testing');
}

// Log environment variable status
console.log('[ENV] Environment variables status:', {
  TICKETMASTER_KEY_SET: !!TICKETMASTER_KEY,
  TICKETMASTER_KEY_LENGTH: TICKETMASTER_KEY ? TICKETMASTER_KEY.length : 0,
  PREDICTHQ_API_KEY_SET: !!PREDICTHQ_API_KEY,
  PREDICTHQ_API_KEY_LENGTH: PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.length : 0,
  SERPAPI_KEY_SET: !!SERPAPI_KEY
});

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  // Log request details for debugging
  console.log('[SEARCH-EVENTS] Request method:', req.method);
  console.log('[SEARCH-EVENTS] Request headers:', Object.fromEntries(req.headers.entries()));
  console.log('[SEARCH-EVENTS] Request URL:', req.url);

  // Add CORS headers to all responses
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  const startTime: number = Date.now(); // Define startTime before the try block

  // Create a safe response function to ensure consistent error handling
  const safeResponse = (data: any, status: number = 200) => {
    return new Response(JSON.stringify(data), {
      headers: responseHeaders,
      status: status
    });
  };

  try {
    console.log('[SEARCH-EVENTS] Received request');

    // Check for required API keys
    if (!TICKETMASTER_KEY) {
      console.error('[SEARCH-EVENTS] TICKETMASTER_KEY is not set');
      return safeResponse({
        error: 'TICKETMASTER_KEY is not set',
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: 'API key missing' },
          eventbrite: { count: 0, error: null },
          serpapi: { count: 0, error: null },
          predicthq: { count: 0, error: null }
        },
        meta: {
          executionTime: Date.now() - startTime,
          totalEvents: 0,
          eventsWithCoordinates: 0,
          timestamp: new Date().toISOString()
        }
      }, 500);
    }

    // Parse request parameters with error handling
    let params: SearchParams;

    // Check if the request has a body by examining content-length header
    const contentLength = req.headers.get('content-length');
    console.log('[SEARCH-EVENTS] Content-Length:', contentLength);

    if (!contentLength || parseInt(contentLength) === 0) {
      console.warn('[SEARCH-EVENTS] Empty request body detected, using default parameters');
      // Use default parameters if no body is provided
      params = {
        location: 'New York',
        radius: 50, // Increased default radius to 50 miles
        startDate: new Date().toISOString().split('T')[0], // Today
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        categories: ['music', 'sports', 'arts', 'family', 'food', 'party'] // Added party category by default
      };
    } else {
      try {
        // Parse the request body as JSON
        const requestBody = await req.json();
        console.log('[SEARCH-EVENTS] Request body:', requestBody);

        // Validate and extract parameters
        params = {
          keyword: requestBody.keyword || '',
          location: requestBody.location || '',
          latitude: requestBody.lat || requestBody.latitude || requestBody.userLat,
          longitude: requestBody.lng || requestBody.longitude || requestBody.userLng,
          radius: requestBody.radius || 50, // Increased default radius to 50 miles
          startDate: requestBody.startDate || new Date().toISOString().split('T')[0],
          endDate: requestBody.endDate,
          categories: requestBody.categories || [],
          limit: requestBody.limit || 100,
          page: requestBody.page || 1,
          excludeIds: requestBody.excludeIds || [],
          // Handle the special predicthqLocation parameter from frontend
          predicthqLocation: requestBody.predicthqLocation || ''
        };

        console.log('[SEARCH-EVENTS] Parsed parameters:', params);

        // Add detailed logging for location parameters
        console.log('[SEARCH-EVENTS] Location parameters:', {
          latitude: params.latitude,
          longitude: params.longitude,
          radius: params.radius,
          location: params.location,
          hasValidCoordinates: !!(params.latitude && params.longitude),
          radiusInKm: params.radius ? Math.round(Number(params.radius) * 1.60934) : 'N/A'
        });
      } catch (error) {
        console.error('[SEARCH-EVENTS] Error parsing request body:', error);
        return safeResponse({
          error: 'Invalid request body',
          events: [],
          sourceStats: {
            ticketmaster: { count: 0, error: 'Invalid request' },
            eventbrite: { count: 0, error: 'Invalid request' },
            serpapi: { count: 0, error: 'Invalid request' },
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
    let eventbriteCount = 0;
    let eventbriteError: string | null = null;
    let serpapiCount = 0;
    let serpapiError: string | null = null;
    let predicthqCount = 0;
    let predicthqError: string | null = null;

    // Extract parameters for PredictHQ
    let phqLatitude = params.latitude;
    let phqLongitude = params.longitude;
    let phqLocation = params.location;
    let phqWithinParam = params.predicthqLocation || ''; // Use the predicthqLocation parameter if provided
    let categories = params.categories || [];
    // Ensure radius is a number
    const radiusNumber = typeof params.radius === 'string' ? parseInt(params.radius, 10) : params.radius || 30;

    console.log('[SEARCH-EVENTS] PredictHQ params:', {
      phqLatitude,
      phqLongitude,
      phqLocation,
      phqWithinParam,
      radiusNumber,
      categories
    });

    // Fetch events from Ticketmaster
    try {
      console.log('[SEARCH-EVENTS] Fetching Ticketmaster events...');
      const ticketmasterResponse = await fetchTicketmasterEvents({
        apiKey: TICKETMASTER_KEY,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: radiusNumber, // Use the converted number value for Ticketmaster too
        startDate: params.startDate,
        endDate: params.endDate,
        keyword: params.keyword,
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

    // Fetch events from PredictHQ if API key is available
    if (PREDICTHQ_API_KEY && PREDICTHQ_API_KEY !== 'YOUR_PREDICTHQ_API_KEY') {
      try {
        console.log('[SEARCH-EVENTS] Fetching PredictHQ events...');

        // Prepare PredictHQ parameters
        const predicthqParams = {
          apiKey: PREDICTHQ_API_KEY,
          latitude: phqLatitude,
          longitude: phqLongitude,
          radius: radiusNumber, // Use the converted number value
          startDate: params.startDate,
          endDate: params.endDate,
          categories: categories,
          location: phqLocation,
          withinParam: phqWithinParam, // Use the dedicated withinParam from predicthqLocation
          keyword: params.keyword,
          limit: params.limit
        };

        console.log('[SEARCH-EVENTS] PredictHQ params:', {
          ...predicthqParams,
          apiKey: predicthqParams.apiKey ? `${predicthqParams.apiKey.substring(0, 4)}...` : 'NOT SET'
        });

        const predicthqResponse = await fetchPredictHQEvents(predicthqParams);

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
    } else {
      predicthqError = 'API key not configured';
      console.warn('[SEARCH-EVENTS] Skipping PredictHQ API call - no valid API key available');
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

    // If we have very few events with coordinates, add some default coordinates to events without them
    // This ensures events show up on the map even if their exact location is unknown
    if (eventsWithCoords.length < 5 && eventsWithoutCoords.length > 0 && params.latitude && params.longitude) {
      console.log(`[SEARCH-EVENTS] Adding default coordinates to events without coordinates`);

      // Add slightly randomized coordinates near the user's location
      eventsWithoutCoords.forEach(event => {
        // Add a small random offset (up to ~5 miles) to prevent all events from stacking
        const latOffset = (Math.random() - 0.5) * 0.1;  // ~5 miles in latitude
        const lngOffset = (Math.random() - 0.5) * 0.1;  // ~5 miles in longitude

        event.coordinates = [
          Number(params.longitude) + lngOffset,
          Number(params.latitude) + latOffset
        ];

        console.log(`[SEARCH-EVENTS] Added default coordinates to event: ${event.id} - ${event.title}`);
      });
    }

    // Count events with coordinates for debugging
    const eventsWithCoords = filteredEvents.filter(event => {
      return !!event.coordinates || (!!event.latitude && !!event.longitude);
    });

    // Helper function to parse event date and time
    function parseEventDate(dateStr: string, timeStr?: string): Date {
      try {
        // Handle ISO date strings
        if (dateStr.includes('T') && dateStr.includes('Z')) {
          return new Date(dateStr);
        }

        // Otherwise, combine date and time
        const dateOnly = dateStr.split('T')[0]; // Handle case where date might have a T
        const timeOnly = timeStr || '00:00';
        const dateTimeStr = `${dateOnly}T${timeOnly}`;

        return new Date(dateTimeStr);
      } catch (e) {
        console.warn('Error parsing date:', dateStr, timeStr, e);
        return new Date(); // Return current date as fallback
      }
    }

    // Sort events by date (soonest first)
    filteredEvents.sort((a, b) => {
      // Parse dates
      const dateA = parseEventDate(a.date, a.time);
      const dateB = parseEventDate(b.date, b.time);

      // Sort by date (ascending)
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;
    const totalEvents = allEvents.length;

    console.log(`[SEARCH-EVENTS] Returning ${filteredEvents.length} events (${eventsWithCoords.length} with coordinates)`);
    console.log(`[SEARCH-EVENTS] Execution time: ${executionTime}ms`);

    // Return the response using our safe response function
    return safeResponse({
      events: filteredEvents,
      sourceStats: {
        ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
        eventbrite: { count: eventbriteCount, error: eventbriteError },
        serpapi: { count: serpapiCount, error: serpapiError },
        predicthq: {
          count: predicthqCount,
          error: predicthqError,
          details: {
            apiKeyAvailable: !!PREDICTHQ_API_KEY,
            apiKeyLength: PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.length : 0,
            categories: categories || [],
            hasCoordinates: !!(phqLatitude !== undefined && phqLongitude !== undefined),
            hasLocation: !!phqLocation,
            hasWithin: !!phqWithinParam,
            withinParam: phqWithinParam || 'none'
          }
        }
      },
      meta: {
        executionTime,
        totalEvents,
        eventsWithCoordinates: eventsWithCoords.length,
        timestamp: new Date().toISOString()
      }
    }, 200);
  } catch (error) {
    // Improved error reporting: include stack trace if available
    console.error('[SEARCH-EVENTS] CRITICAL ERROR:', error);

    // Extract error details
    let errorMessage = 'Unknown error occurred';
    let errorStack = '';
    let errorType = 'UnknownError';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack || '';
      errorType = error.name;
      console.error(`[SEARCH-EVENTS] Error: ${errorType} - ${errorMessage}`);
      console.error(`[SEARCH-EVENTS] Stack: ${errorStack}`);
    } else if (typeof error === 'string') {
      errorMessage = error;
      console.error(`[SEARCH-EVENTS] String Error: ${errorMessage}`);
    } else {
      errorMessage = String(error); // Fallback for other types
      console.error(`[SEARCH-EVENTS] Other Error: ${errorMessage}`);
    }

    // Calculate execution time safely, as startTime is now defined outside the try block
    const executionTime = Date.now() - startTime;

    // Return a valid JSON response even in case of error using our safe response function
    return safeResponse({
      events: [],
      error: errorMessage,
      errorType,
      stack: errorStack, // Include stack trace in response for easier debugging
      timestamp: new Date().toISOString(),
      sourceStats: { // Provide default stats indicating failure
        ticketmaster: { count: 0, error: 'Function execution failed' },
        eventbrite: { count: 0, error: 'Function execution failed' },
        serpapi: { count: 0, error: 'Function execution failed' },
        predicthq: { count: 0, error: 'Function execution failed' }
      },
      meta: {
        executionTime, // Include execution time up to the error
        totalEvents: 0,
        eventsWithCoordinates: 0,
        timestamp: new Date().toISOString()
      }
    }, 500);
  }
});
