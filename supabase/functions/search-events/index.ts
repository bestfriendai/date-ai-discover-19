// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchTicketmasterEvents } from "./ticketmaster.ts";
import { fetchPredictHQEvents } from "./predicthq-fixed.ts";
import { Event, SearchParams } from "./types.ts";
import { apiKeyManager } from "./apiKeyManager.ts";
import { ApiKeyError, formatApiError } from "./errors.ts";
import { logApiKeyUsage } from "./logger.ts";
import { validateAndParseSearchParams, RequestValidationError } from "./validation.ts";
import {
  normalizeAndFilterEvents,
  sortEventsByDate,
  filterEventsByCoordinates,
  generateSourceStats,
  generateMetadata
} from "./processing.ts";
import {
  extractTicketmasterParams,
  extractPredictHQParams
} from "./utils.ts";

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

  const startTime = Date.now();
  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  
  // Helper function for consistent response formatting
  const safeResponse = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { headers: responseHeaders, status });

  // Initialize tracking variables
  let ticketmasterCount = 0;
  let ticketmasterError: string | null = null;
  let predicthqCount = 0;
  let predicthqError: string | null = null;
  let hasValidTicketmasterKey = false;
  let hasValidPredictHQKey = false;

  try {
    console.log('[SEARCH-EVENTS] Received request');

    // Parse request body, allowing empty body for default parameters
    let requestBody;
    try {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 0) {
        requestBody = await req.json();
        console.log('[SEARCH-EVENTS] Parsed request body:', requestBody);
      } else {
        requestBody = {}; // Provide an empty object if no body is present
        console.log('[SEARCH-EVENTS] No request body provided, using empty object.');
      }
    } catch (error) {
      console.error('[SEARCH-EVENTS] Failed to parse request body:', error);
      return safeResponse({
        error: 'Invalid request body',
        errorType: 'ValidationError',
        details: 'Request body must be valid JSON if provided',
        events: [],
        sourceStats: generateSourceStats(0, 'Invalid request body', 0, 'Invalid request body'),
        meta: generateMetadata(startTime, 0, 0, null, null)
      }, 400);
    }

    // Validate and parse search parameters
    let params: SearchParams;
    try {
      params = validateAndParseSearchParams(requestBody);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return safeResponse({
          error: 'Invalid request parameters',
          errorType: 'ValidationError',
          details: error.errors,
          events: [],
          sourceStats: generateSourceStats(0, 'Invalid parameters', 0, 'Invalid parameters'),
          meta: generateMetadata(startTime, 0, 0, null, null)
        }, 400);
      }
      throw error;
    }

    // Get API keys
    let ticketmasterKey: string | undefined;
    let predicthqKey: string | undefined;

    try {
      ticketmasterKey = apiKeyManager.getActiveKey('ticketmaster');
      hasValidTicketmasterKey = true;
      console.log('[SEARCH-EVENTS] Successfully validated Ticketmaster API key');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] Ticketmaster API key error:', error);
    }

    try {
      predicthqKey = apiKeyManager.getActiveKey('predicthq');
      hasValidPredictHQKey = true;
      console.log('[SEARCH-EVENTS] Successfully validated PredictHQ API key');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] PredictHQ API key error:', error);
    }

    if (!hasValidTicketmasterKey && !hasValidPredictHQKey) {
      return safeResponse({
        error: 'No valid API keys available',
        errorType: 'ApiKeyError',
        details: 'Both Ticketmaster and PredictHQ API keys are invalid or missing',
        events: [],
        sourceStats: generateSourceStats(0, 'Invalid API key', 0, 'Invalid API key'),
        meta: generateMetadata(startTime, 0, 0, apiKeyManager.getUsageStats('ticketmaster'), null)
      }, 401);
    }

    // Make parallel API calls with properly extracted parameters
    const results = await Promise.allSettled([
      hasValidTicketmasterKey
        ? fetchTicketmasterEvents(extractTicketmasterParams(params, ticketmasterKey!))
        : Promise.resolve({ events: [], error: 'API key not available' }),
      
      hasValidPredictHQKey
        ? fetchPredictHQEvents(extractPredictHQParams(params, predicthqKey!))
        : Promise.resolve({ events: [], error: 'API key not available' })
    ]);

    const allEvents: Event[] = [];

    // Process Ticketmaster results
    if (results[0].status === 'fulfilled') {
      const tmResult = results[0].value;
      if (tmResult.error) {
        ticketmasterError = tmResult.error;
        logApiKeyUsage('ticketmaster', 'fetch_events', 'error', Date.now() - startTime, { error: tmResult.error });
      } else {
        ticketmasterCount = tmResult.events.length;
        allEvents.push(...tmResult.events);
        logApiKeyUsage('ticketmaster', 'fetch_events', 'success', Date.now() - startTime, { eventCount: ticketmasterCount });
      }
    } else {
      ticketmasterError = results[0].reason?.message || 'API call failed';
      logApiKeyUsage('ticketmaster', 'fetch_events', 'error', Date.now() - startTime, { error: ticketmasterError });
    }

    // Process PredictHQ results
    if (results[1].status === 'fulfilled') {
      const phqResult = results[1].value;
      if (phqResult.error) {
        predicthqError = phqResult.error;
        logApiKeyUsage('predicthq', 'fetch_events', 'error', Date.now() - startTime, { error: phqResult.error });
      } else {
        predicthqCount = phqResult.events.length;
        allEvents.push(...phqResult.events);
        logApiKeyUsage('predicthq', 'fetch_events', 'success', Date.now() - startTime, { eventCount: predicthqCount });
      }
    } else {
      predicthqError = results[1].reason?.message || 'API call failed';
      logApiKeyUsage('predicthq', 'fetch_events', 'error', Date.now() - startTime, { error: predicthqError });
    }

    // Process events
    // Process and filter events
    const normalizedEvents = normalizeAndFilterEvents(allEvents, params);
    
    // Ensure all events have valid coordinates
    const eventsWithCoords = normalizedEvents.map(event => {
      // If event already has valid coordinates, use them
      if (event.coordinates &&
          Array.isArray(event.coordinates) &&
          event.coordinates.length === 2 &&
          !isNaN(event.coordinates[0]) &&
          !isNaN(event.coordinates[1])) {
        return {
          ...event,
          coordinates: event.coordinates as [number, number]
        };
      }

      // If no valid coordinates and no search location, return event without coordinates
      if (typeof params.latitude !== 'number' || typeof params.longitude !== 'number') {
        return event;
      }

      // Generate coordinates near the search location
      const jitterAmount = 0.01; // About 1km
      const lat = params.latitude + (Math.random() - 0.5) * jitterAmount;
      const lng = params.longitude + (Math.random() - 0.5) * jitterAmount;
      
      return {
        ...event,
        coordinates: [lng, lat] as [number, number]
      };
    });

    const sortedEvents = sortEventsByDate(eventsWithCoords);

    // Generate response
    const sourceStats = generateSourceStats(ticketmasterCount, ticketmasterError, predicthqCount, predicthqError);
    const meta = generateMetadata(
      startTime,
      allEvents.length,
      eventsWithCoords.length,
      apiKeyManager.getUsageStats('ticketmaster'),
      hasValidPredictHQKey ? apiKeyManager.getUsageStats('predicthq') : null
    );

    return safeResponse({
      events: sortedEvents,
      sourceStats,
      meta
    }, 200);

  } catch (error) {
    console.error('[SEARCH-EVENTS] CRITICAL ERROR:', error);
    const formattedError = formatApiError(error);
    
    return safeResponse({
      events: [],
      error: formattedError.error,
      errorType: formattedError.errorType,
      details: formattedError.details,
      sourceStats: generateSourceStats(0, 'Function execution failed', 0, 'Function execution failed'),
      meta: generateMetadata(
        startTime,
        0,
        0,
        apiKeyManager.getUsageStats('ticketmaster'),
        hasValidPredictHQKey ? apiKeyManager.getUsageStats('predicthq') : null
      )
    }, error instanceof ApiKeyError ? 401 : 500);
  }
});
