// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { fetchPredictHQEvents, PredictHQResponse } from "./predicthq-fixed-new.ts"
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

// Environment variables
const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY');
const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
const PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

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
    try {
      params = await req.json();
      console.log('[SEARCH-EVENTS] Received request with parameters:', JSON.stringify(params, null, 2));
    } catch (jsonError) {
      console.error('[SEARCH-EVENTS] Error parsing request JSON:', jsonError);
      return safeResponse({
        error: 'Invalid JSON in request body',
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: 'Invalid request format' },
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
      }, 400);
    }

    // If startDate is missing, use today's date
    if (!params.startDate) {
      console.warn('[SEARCH-EVENTS] Missing startDate parameter, using today\'s date');
      params.startDate = new Date().toISOString().split('T')[0];
    }

    // Extract parameters
    const {
      startDate,
      endDate,
      location,
      userLat,
      userLng,
      radius = '10',
      keyword,
      categories,
      predicthqLocation // Specific location parameter for PredictHQ
      // Note: segmentName and classificationName are used later in the code via params.segmentName and params.classificationName
    } = params;

    // Initialize variables for tracking events from different sources
    let allEvents: Event[] = [];
    let ticketmasterCount = 0;
    let ticketmasterError: string | null = null;
    let eventbriteCount = 0;
    let eventbriteError: string | null = null;
    let serpapiCount = 0;
    let serpapiError: string | null = null;
    let predicthqCount = 0;
    let predicthqError: string | null = null;

    // Variables for PredictHQ API
    let phqLatitude: number | undefined;
    let phqLongitude: number | undefined;
    let phqLocation: string | undefined;
    let phqWithinParam: string = '';

    // PredictHQ API integration with improved error handling
    // Docs: https://docs.predicthq.com/
    // Always attempt to use PredictHQ, even if API key is missing - the function will handle the error
    try {
      // Wrap the entire PredictHQ section in a try-catch to prevent it from crashing the function
      try {
        console.log('[PREDICTHQ_DEBUG] Using PredictHQ API to fetch events');
        console.log('[PREDICTHQ_DEBUG] PredictHQ API Key available:', !!PREDICTHQ_API_KEY);
        console.log('[PREDICTHQ_DEBUG] PredictHQ API Key prefix:', PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.substring(0, 4) + '...' : 'N/A');
        console.log('[PREDICTHQ_DEBUG] PredictHQ API Key length:', PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.length : 0);
        console.log('[PREDICTHQ_DEBUG] PredictHQ API Key suffix:', PREDICTHQ_API_KEY ? '...' + PREDICTHQ_API_KEY.substring(PREDICTHQ_API_KEY.length - 4) : 'N/A');

        // Log the environment variables for debugging
        console.log('[PREDICTHQ_DEBUG] Environment variables:', {
          PREDICTHQ_API_KEY_SET: !!PREDICTHQ_API_KEY,
          PREDICTHQ_API_KEY_LENGTH: PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.length : 0
        });

        // Validate API key
        if (!PREDICTHQ_API_KEY) {
          console.warn('[PREDICTHQ_ERROR] PredictHQ API key is missing or invalid');
          predicthqError = 'PredictHQ API key is missing or invalid';
        } else {
          console.log('[PREDICTHQ_DEBUG] PredictHQ API key is valid and will be used');
        }

        // Process PredictHQ location parameters first
        phqLatitude = userLat ? Number(userLat) : undefined;
        phqLongitude = userLng ? Number(userLng) : undefined;
        phqLocation = location || 'New York'; // Default to New York if no location provided
        phqWithinParam = ''; // Reset to empty string before processing

        console.log('[DEBUG] Processing PredictHQ location parameters');
        console.log('[DEBUG] predicthqLocation:', predicthqLocation);
        console.log('[DEBUG] location:', location);
        console.log('[DEBUG] userLat:', userLat);
        console.log('[DEBUG] userLng:', userLng);

        if (predicthqLocation) {
          // Check if it's already in the within format: {radius}km@{lat},{lng}
          const withinMatch = predicthqLocation.match(/^(\d+)km@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
          if (withinMatch) {
            // It's already in the correct format for the 'within' parameter
            phqWithinParam = predicthqLocation;
            console.log('[DEBUG] Using predicthqLocation as within parameter:', phqWithinParam);
            // Clear other location parameters to avoid conflicts
            phqLatitude = undefined;
            phqLongitude = undefined;
            phqLocation = ''; // Use empty string instead of undefined
          } else {
            // Check if it's a lat,lng format
            const latLngMatch = predicthqLocation.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
            if (latLngMatch) {
              const lat = parseFloat(latLngMatch[1]);
              const lng = parseFloat(latLngMatch[2]);
              if (!isNaN(lat) && !isNaN(lng) &&
                  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                phqLatitude = lat;
                phqLongitude = lng;
                // Clear other location parameters to avoid conflicts
                phqLocation = ''; // Use empty string instead of undefined
                console.log(`[DEBUG] Parsed coordinates from predicthqLocation: ${lat},${lng}`);
              } else {
                console.log(`[DEBUG] Invalid coordinates in predicthqLocation: ${predicthqLocation}`);
              }
            } else {
              // Use it as a place name
              phqLocation = predicthqLocation;
              // Clear other location parameters to avoid conflicts
              phqLatitude = undefined;
              phqLongitude = undefined;
              console.log(`[DEBUG] Using predicthqLocation as place name: ${phqLocation}`);
            }
          }
        } else if (!phqLatitude || !phqLongitude) {
          // If no predicthqLocation and no coordinates, ensure we have a location
          console.log(`[DEBUG] No predicthqLocation and no coordinates, using location: ${phqLocation}`);
        }

        // Log request parameters for debugging
        console.log('[DEBUG] PredictHQ request parameters:', {
          hasLatLng: !!(phqLatitude && phqLongitude),
          lat: phqLatitude,
          lng: phqLongitude,
          radius,
          hasDateRange: !!(startDate && endDate),
          startDate,
          endDate,
          location: phqLocation,
          withinParam: phqWithinParam,
          keyword,
          categories,
          apiKeyAvailable: !!PREDICTHQ_API_KEY,
          apiKeyPrefix: PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.substring(0, 4) + '...' : 'N/A'
        });

        // Make the API call with the processed parameters
        console.log('[DEBUG] Making PredictHQ API call with processed parameters');
        try {
          // Ensure we have a valid location parameter
          // If phqLocation is undefined, set it to a default value
          if (phqLocation === undefined && !phqLatitude && !phqLongitude && !phqWithinParam) {
            phqLocation = 'New York';
            console.log('[DEBUG] Setting default location for PredictHQ:', phqLocation);
          }

          console.log('[DEBUG] Final PredictHQ parameters:', {
            hasLatLng: !!(phqLatitude && phqLongitude),
            lat: phqLatitude,
            lng: phqLongitude,
            location: phqLocation,
            withinParam: phqWithinParam
          });

          // Enhance parameters for party events
          let enhancedKeyword = keyword;
          let enhancedLimit = 300; // Default increased limit

          // If searching for parties, enhance the parameters
          if (categories && categories.includes('party')) {
            console.log('[PARTY_DEBUG] Enhancing PredictHQ parameters for party search');

            // Add party-related keywords if not already present
            if (!enhancedKeyword || enhancedKeyword.toLowerCase().indexOf('party') === -1) {
              enhancedKeyword = enhancedKeyword ?
                `${enhancedKeyword} OR party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR social OR gathering OR mixer OR celebration` :
                'party OR club OR social OR celebration OR dance OR dj OR nightlife OR festival OR concert OR music OR lounge OR bar OR venue OR mixer OR gathering OR gala OR reception OR meetup OR "happy hour" OR cocktail OR rave OR "live music" OR "themed party" OR "costume party" OR "masquerade" OR "holiday party" OR "new years party" OR "halloween party" OR "summer party" OR "winter party" OR "spring party" OR "fall party" OR "seasonal party" OR "annual party" OR "live dj" OR "live band" OR "live performance" OR "music venue" OR "dance venue" OR "nightclub venue" OR "lounge venue" OR "bar venue" OR "club night" OR "dance night" OR "party night" OR "night life" OR "social mixer" OR "networking event" OR "singles event" OR "mingling" OR "daytime event" OR "pool event" OR "rooftop event" OR "outdoor event" OR social OR gathering OR mixer OR networking OR meetup OR singles OR dating OR "speed dating" OR mingling OR celebration OR gala OR reception OR "cocktail party" OR "happy hour"';
            }

            // Use a higher limit for party searches (Reduced from 500)
            enhancedLimit = 150;

            console.log('[PARTY_DEBUG] Enhanced PredictHQ parameters:', {
              enhancedKeyword,
              enhancedLimit
            });
          }

          console.log('[PREDICTHQ_DEBUG] Calling PredictHQ API with params:', {
            latitude: phqLatitude,
            longitude: phqLongitude,
            radius: Number(radius),
            startDate,
            endDate,
            categories,
            location: phqLocation,
            withinParam: phqWithinParam,
            keyword: enhancedKeyword ? enhancedKeyword.substring(0, 50) + '...' : 'none',
            limit: enhancedLimit,
            apiKeyProvided: !!PREDICTHQ_API_KEY,
            apiKeyLength: PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.length : 0
          });

          try {
            // Add a timeout to the PredictHQ API call to prevent hanging
            const timeoutPromise = new Promise<{events: [], error: string}>((_, reject) => {
              setTimeout(() => reject(new Error('PredictHQ API call timed out after 8 seconds')), 8000);
            });

            // Create the actual API call promise
            const apiCallPromise = fetchPredictHQEvents({
              apiKey: PREDICTHQ_API_KEY,
              latitude: phqLatitude,
              longitude: phqLongitude,
              radius: Number(radius),
              startDate,
              endDate,
              categories,
              location: phqLocation,
              withinParam: phqWithinParam, // Pass the pre-formatted within parameter if available
              keyword: enhancedKeyword,
              limit: enhancedLimit // Use enhanced limit for party events
            });

            // Race the API call against the timeout
            const predicthqResult = await Promise.race([apiCallPromise, timeoutPromise]) as PredictHQResponse;

            const predicthqEvents = predicthqResult.events || [];
            predicthqCount = predicthqEvents.length;
            predicthqError = predicthqResult.error;

            console.log('[PREDICTHQ_DEBUG] PredictHQ API response:', {
              eventCount: predicthqCount,
              hasError: !!predicthqError,
              error: predicthqError,
              warnings: predicthqResult.warnings || [],
              status: predicthqResult.status || 0
            });

            if (predicthqError) {
              console.error('[PREDICTHQ_ERROR] PredictHQ API error:', predicthqError);
            } else {
              console.log(`[PREDICTHQ_DEBUG] PredictHQ API returned ${predicthqCount} events`);

              if (predicthqCount > 0) {
                console.log('[PREDICTHQ_DEBUG] First PredictHQ event:', predicthqEvents[0]);
              } else {
                console.log('[PREDICTHQ_DEBUG] No events returned from PredictHQ API');
              }

              allEvents = [...allEvents, ...predicthqEvents];
            }
          } catch (error) {
            predicthqError = error instanceof Error ? error.message : String(error);
            console.error('[PREDICTHQ_ERROR] Exception calling PredictHQ API:', error);

            // Log detailed error information
            if (error instanceof Error) {
              console.error('[PREDICTHQ_ERROR] Error name:', error.name);
              console.error('[PREDICTHQ_ERROR] Error message:', error.message);
              console.error('[PREDICTHQ_ERROR] Error stack:', error.stack);
            } else {
              console.error('[PREDICTHQ_ERROR] Non-Error object thrown:', error);
            }

            // Continue execution without failing the entire function
            console.log('[PREDICTHQ_ERROR] Continuing execution despite PredictHQ API error');
          }
        } catch (err) {
          predicthqError = err instanceof Error ? err.message : String(err);
          console.error('[DEBUG] PredictHQ API call threw exception:', predicthqError);
        }
      } catch (err) {
        predicthqError = err instanceof Error ? err.message : String(err);
        console.error('[DEBUG] Unexpected error in PredictHQ setup:', predicthqError);
      }
    } catch (error) {
      console.error('[PREDICTHQ_ERROR] Critical error in PredictHQ integration:', error);
      predicthqError = error instanceof Error ? error.message : String(error);
    }

    // Process and filter events
    console.log(`[SEARCH-EVENTS] Processing ${allEvents.length} events`);

    // Filter events by date range
    const startDateObj = new Date(startDate);
    const endDateObj = endDate ? new Date(endDate) : new Date(startDateObj.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days after start date

    // Filter events by date range
    let filteredEvents = allEvents.filter(event => {
      // Parse event date
      const eventDate = new Date(event.date);
      return eventDate >= startDateObj && eventDate <= endDateObj;
    });

    // Filter events by keyword if provided
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      filteredEvents = filteredEvents.filter(event => {
        const titleMatch = event.title && event.title.toLowerCase().includes(keywordLower);
        const descriptionMatch = event.description && event.description.toLowerCase().includes(keywordLower);
        return titleMatch || descriptionMatch;
      });
    }

    // Filter events by category if provided
    if (categories && categories.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        if (!event.category) return false;
        return categories.some(category =>
          event.category.toLowerCase().includes(category.toLowerCase())
        );
      });
    }

    // Count events with coordinates
    const eventsWithCoords = filteredEvents.filter(event =>
      event.latitude !== undefined && event.longitude !== undefined
    );

    // Helper function to parse event date and time
    function parseEventDate(dateStr: string, timeStr?: string): Date {
      try {
        // If date is already in ISO format with time, parse directly
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
