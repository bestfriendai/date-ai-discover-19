// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { fetchTicketmasterEvents } from "./ticketmaster.ts"
import { fetchPredictHQEvents } from "./predicthq.ts"
import { Event, SearchParams } from "./types.ts"
import { apiKeyManager } from "./apiKeyManager.ts"
import { ApiKeyError, formatApiError } from "./errors.ts"
import { logApiKeyUsage } from "./logger.ts"

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

  const startTime: number = Date.now();

  // Create a safe response function to ensure consistent error handling
  const safeResponse = (data: any, status: number = 200) => {
    return new Response(JSON.stringify(data), {
      headers: responseHeaders,
      status: status
    });
  };

  try {
    console.log('[SEARCH-EVENTS] Received request');

    // Get and validate API keys using the API Key Manager
    let ticketmasterKey: string;
    let predicthqKey: string;
    let hasValidTicketmasterKey = false;
    let hasValidPredictHQKey = false;

    // Try to get Ticketmaster API key
    try {
      ticketmasterKey = apiKeyManager.getActiveKey('ticketmaster');
      console.log('[SEARCH-EVENTS] Successfully validated Ticketmaster API key:', apiKeyManager.maskKey(ticketmasterKey));
      hasValidTicketmasterKey = true;
    } catch (error) {
      console.warn('[SEARCH-EVENTS] Ticketmaster API key validation error:', error);
      // We'll continue even without a valid Ticketmaster key
    }

    // Try to get PredictHQ API key
    try {
      predicthqKey = apiKeyManager.getActiveKey('predicthq');
      console.log('[SEARCH-EVENTS] Successfully validated PredictHQ API key:', apiKeyManager.maskKey(predicthqKey));
      hasValidPredictHQKey = true;
    } catch (error) {
      console.warn('[SEARCH-EVENTS] PredictHQ API key validation error:', error);
      // We'll continue even without a valid PredictHQ key
    }

    // If neither key is valid, return an error
    if (!hasValidTicketmasterKey && !hasValidPredictHQKey) {
      console.error('[SEARCH-EVENTS] No valid API keys available');

      return safeResponse({
        error: 'No valid API keys available',
        errorType: 'ApiKeyError',
        details: 'Both Ticketmaster and PredictHQ API keys are invalid or missing',
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: 'Invalid or missing API key' },
          eventbrite: { count: 0, error: 'API not implemented' },
          serpapi: { count: 0, error: 'API not implemented' },
          predicthq: { count: 0, error: 'Invalid or missing API key' }
        },
        meta: {
          executionTime: Date.now() - startTime,
          totalEvents: 0,
          eventsWithCoordinates: 0,
          timestamp: new Date().toISOString(),
          keyUsage: {
            ticketmaster: apiKeyManager.getUsageStats('ticketmaster'),
            predicthq: apiKeyManager.getUsageStats('predicthq')
          }
        }
      }, 401);
    }

    // Parse request parameters with error handling
    let params: SearchParams;

    // Check if the request has a body by examining content-length header
    const contentLength = req.headers.get('content-length');
    console.log('[SEARCH-EVENTS] Content-Length:', contentLength);

    if (!contentLength || parseInt(contentLength) === 0) {
      console.warn('[SEARCH-EVENTS] Empty request body detected');
      return safeResponse({
        error: 'Missing request body',
        errorType: 'ValidationError',
        details: 'Location parameters are required',
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: 'Missing location parameters' }
        },
        meta: {
          executionTime: Date.now() - startTime,
          totalEvents: 0,
          eventsWithCoordinates: 0,
          timestamp: new Date().toISOString()
        }
      }, 400);
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
            errorType: 'ValidationError',
            details: 'Either coordinates (latitude/longitude) or location string is required',
            events: [],
            sourceStats: {
              ticketmaster: { count: 0, error: 'Missing location parameters' }
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
          errorType: 'ValidationError',
          details: error instanceof Error ? error.message : undefined,
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
            timestamp: new Date().toISOString(),
            keyUsage: {
              ticketmaster: apiKeyManager.getUsageStats('ticketmaster')
            }
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

    // Fetch events from Ticketmaster if we have a valid key
    if (hasValidTicketmasterKey) {
      try {
        console.log('[SEARCH-EVENTS] Fetching Ticketmaster events...');
        const ticketmasterResponse = await fetchTicketmasterEvents({
          apiKey: ticketmasterKey,
          latitude: params.latitude,
          longitude: params.longitude,
          radius: radiusNumber,
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

        // Log API usage
        logApiKeyUsage('ticketmaster', 'fetch_events',
          ticketmasterResponse.error ? 'error' : 'success',
          Date.now() - startTime,
          {
            eventCount: ticketmasterResponse.events?.length || 0,
            error: ticketmasterResponse.error
          }
        );

        if (ticketmasterResponse.error) {
          ticketmasterError = ticketmasterResponse.error;
          console.error('[SEARCH-EVENTS] Ticketmaster API error:', ticketmasterError);
        } else {
          ticketmasterCount = ticketmasterResponse.events.length;
          allEvents.push(...ticketmasterResponse.events);
          console.log(`[SEARCH-EVENTS] Added ${ticketmasterCount} Ticketmaster events`);
        }
      } catch (error) {
        const formattedError = formatApiError(error);
        ticketmasterError = formattedError.error;
        console.error('[SEARCH-EVENTS] Error fetching Ticketmaster events:', error);

        // Log API error
        logApiKeyUsage('ticketmaster', 'fetch_events', 'error',
          Date.now() - startTime,
          {
            error: formattedError.error,
            errorType: formattedError.errorType
          }
        );
      }
    } else {
      ticketmasterError = 'API key not available';
      console.warn('[SEARCH-EVENTS] Skipping Ticketmaster API call - no valid API key available');
    }

    // Fetch events from PredictHQ if we have a valid key
    if (hasValidPredictHQKey) {
      try {
        console.log('[SEARCH-EVENTS] Fetching PredictHQ events...');

        // Prepare PredictHQ parameters
        const predicthqParams = {
          apiKey: predicthqKey,
          latitude: params.latitude,
          longitude: params.longitude,
          radius: radiusNumber,
          startDate: params.startDate,
          endDate: params.endDate,
          categories: params.categories,
          location: params.location,
          withinParam: params.predicthqLocation,
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
        const formattedError = formatApiError(error);
        predicthqError = formattedError.error;
        console.error('[SEARCH-EVENTS] Error fetching PredictHQ events:', error);

        // Log API error
        logApiKeyUsage('predicthq', 'fetch_events', 'error',
          Date.now() - startTime,
          {
            error: formattedError.error,
            errorType: formattedError.errorType
          }
        );
      }
    } else {
      predicthqError = 'API key not available';
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

    // Return the response with key usage statistics
    return safeResponse({
      events: filteredEvents,
      sourceStats: {
        ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
        eventbrite: { count: 0, error: 'API not implemented' },
        serpapi: { count: 0, error: 'API not implemented' },
        predicthq: { count: predicthqCount, error: predicthqError }
      },
      meta: {
        executionTime,
        totalEvents,
        eventsWithCoordinates: eventsWithCoords.length,
        timestamp: new Date().toISOString(),
        keyUsage: {
          ticketmaster: apiKeyManager.getUsageStats('ticketmaster'),
          predicthq: hasValidPredictHQKey ? apiKeyManager.getUsageStats('predicthq') : null
        }
      }
    }, 200);
  } catch (error) {
    console.error('[SEARCH-EVENTS] CRITICAL ERROR:', error);

    // Format the error using our error handling utilities
    const formattedError = formatApiError(error);
    const executionTime = Date.now() - startTime;

    return safeResponse({
      events: [],
      error: formattedError.error,
      errorType: formattedError.errorType,
      details: formattedError.details,
      timestamp: new Date().toISOString(),
      sourceStats: {
        ticketmaster: { count: 0, error: 'Function execution failed' },
        eventbrite: { count: 0, error: 'API not implemented' },
        serpapi: { count: 0, error: 'API not implemented' },
        predicthq: { count: 0, error: 'Function execution failed' }
      },
      meta: {
        executionTime,
        totalEvents: 0,
        eventsWithCoordinates: 0,
        timestamp: new Date().toISOString(),
        keyUsage: {
          ticketmaster: apiKeyManager.getUsageStats('ticketmaster'),
          predicthq: hasValidPredictHQKey ? apiKeyManager.getUsageStats('predicthq') : null
        }
      }
    }, error instanceof ApiKeyError ? 401 : 500);
  }
});
