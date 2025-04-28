// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchTicketmasterEvents } from "./ticketmaster.ts";
import { fetchPredictHQEvents } from "./predicthq-fixed.ts";
import { searchSeatGeekEvents } from "./seatgeek.ts";
import { searchRapidAPIEvents } from "./rapidapi.ts";
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
  let seatgeekCount = 0;
  let seatgeekError: string | null = null;
  let rapidapiCount = 0;
  let rapidapiError: string | null = null;
  let hasValidTicketmasterKey = false;
  let hasValidPredictHQKey = false;
  let hasValidSeatgeekKey = false;
  let hasValidRapidAPIKey = false;
  
  // Initialize browser console tracking
  console.log('%c[EVENT TRACKING] Search-Events Function Started', 'color: #9C27B0; font-weight: bold; font-size: 14px');

  try {
    console.log('[SEARCH-EVENTS] Received request');

    // Validate request method and content type
    if (req.method !== 'POST') {
      return safeResponse({
        error: 'Method not allowed',
        errorType: 'ValidationError',
        details: 'Only POST requests are supported',
        events: [],
        sourceStats: generateSourceStats(0, 'Invalid method', 0, 'Invalid method'),
        meta: generateMetadata(startTime, 0, 0, null, null)
      }, 405);
    }

    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return safeResponse({
        error: 'Invalid content type',
        errorType: 'ValidationError',
        details: 'Content-Type must be application/json',
        events: [],
        sourceStats: generateSourceStats(0, 'Invalid content type', 0, 'Invalid content type'),
        meta: generateMetadata(startTime, 0, 0, null, null)
      }, 400);
    }

    if (!req.body || parseInt(req.headers.get('content-length') || '0') === 0) {
      return safeResponse({
        error: 'Empty request body',
        errorType: 'ValidationError',
        details: 'Request body is required with search parameters',
        events: [],
        sourceStats: generateSourceStats(0, 'Empty request body', 0, 'Empty request body'),
        meta: generateMetadata(startTime, 0, 0, null, null)
      }, 400);
    }

    // Parse request body with proper error handling
    let requestBody;
    try {
      requestBody = await req.json();
      if (!requestBody || Object.keys(requestBody).length === 0) {
        throw new Error('Empty request parameters');
      }
    } catch (error) {
      return safeResponse({
        error: 'Invalid request body',
        errorType: 'ValidationError',
        details: error instanceof Error ? error.message : 'Failed to parse request body',
        events: [],
        sourceStats: generateSourceStats(0, 'Invalid request body', 0, 'Invalid request body'),
        meta: generateMetadata(startTime, 0, 0, null, null)
      }, 400);
    }

    // Parse and validate request parameters
    let params: SearchParams;
    try {
      params = validateAndParseSearchParams(requestBody);
      
      // Add comprehensive logging for all validated parameters
      console.log('[SEARCH-EVENTS] Validated search parameters:', {
        // Location parameters
        latitude: params.latitude,
        longitude: params.longitude,
        lat: params.lat,
        lng: params.lng,
        userLat: params.userLat,
        userLng: params.userLng,
        radius: params.radius,
        location: params.location,
        hasValidCoordinates: !!(params.latitude && params.longitude) ||
                            !!(params.lat && params.lng) ||
                            !!(params.userLat && params.userLng),
        radiusInKm: params.radius ? Math.round(Number(params.radius) * 1.60934) : 'N/A',
        
        // Search parameters
        keyword: params.keyword || 'not provided',
        categories: params.categories || [],
        startDate: params.startDate || 'not provided',
        endDate: params.endDate || 'not provided',
        page: params.page || 1,
        limit: params.limit || 20
      });
      
      // Log specific warnings for missing parameters
      if (!params.latitude && !params.longitude && !params.lat && !params.lng && !params.userLat && !params.userLng) {
        console.warn('[SEARCH-EVENTS] No valid coordinates found, falling back to location name only');
      }
      
      if (!params.location && !params.latitude && !params.longitude) {
        console.warn('[SEARCH-EVENTS] No location information provided (neither coordinates nor location name)');
      }
      
      if (params.categories && params.categories.includes('party')) {
        console.log('[SEARCH-EVENTS] Party category detected, will prioritize party events');
      }
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
    let seatgeekKey: string | undefined;

    try {
      console.log('[SEARCH-EVENTS] Attempting to get Ticketmaster API key');
      ticketmasterKey = apiKeyManager.getActiveKey('ticketmaster');
      hasValidTicketmasterKey = true;
      console.log('[SEARCH-EVENTS] Successfully validated Ticketmaster API key:',
        ticketmasterKey ? `${ticketmasterKey.substring(0, 4)}...${ticketmasterKey.substring(ticketmasterKey.length - 4)}` : 'NOT SET');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] Ticketmaster API key error:', error);
      console.warn('[SEARCH-EVENTS] Ticketmaster API key error details:', error instanceof Error ? error.message : String(error));

      // List all environment variables for debugging (masking values)
      console.log('[SEARCH-EVENTS] Environment variables:');
      // @ts-ignore: Deno is available at runtime
      for (const [key, value] of Object.entries(Deno.env.toObject())) {
        if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
          // @ts-ignore: value is a string at runtime
          console.log(`  ${key}: ${value ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 'NOT SET'}`);
        } else {
          console.log(`  ${key}: ${value || 'NOT SET'}`);
        }
      }
    }

    try {
      console.log('[SEARCH-EVENTS] Attempting to get PredictHQ API key');
      predicthqKey = apiKeyManager.getActiveKey('predicthq');
      hasValidPredictHQKey = true;
      console.log('[SEARCH-EVENTS] Successfully validated PredictHQ API key:',
        predicthqKey ? `${predicthqKey.substring(0, 4)}...${predicthqKey.substring(predicthqKey.length - 4)}` : 'NOT SET');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] PredictHQ API key error:', error);
      console.warn('[SEARCH-EVENTS] PredictHQ API key error details:', error instanceof Error ? error.message : String(error));
    }

    try {
      console.log('[SEARCH-EVENTS] Attempting to get SeatGeek API key');
      seatgeekKey = apiKeyManager.getActiveKey('seatgeek');
      hasValidSeatgeekKey = true;
      console.log('[SEARCH-EVENTS] Successfully validated SeatGeek API key:',
        seatgeekKey ? `${seatgeekKey.substring(0, 4)}...${seatgeekKey.substring(seatgeekKey.length - 4)}` : 'NOT SET');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] SeatGeek API key error:', error);
      console.warn('[SEARCH-EVENTS] SeatGeek API key error details:', error instanceof Error ? error.message : String(error));
    }
    
    // Get RapidAPI key
    let rapidapiKey: string | undefined;
    try {
      console.log('[SEARCH-EVENTS] Attempting to get RapidAPI key');
      rapidapiKey = apiKeyManager.getActiveKey('rapidapi');
      hasValidRapidAPIKey = true;
      console.log('[SEARCH-EVENTS] Successfully validated RapidAPI key:',
        rapidapiKey ? `${rapidapiKey.substring(0, 4)}...${rapidapiKey.substring(rapidapiKey.length - 4)}` : 'NOT SET');
    } catch (error) {
      console.warn('[SEARCH-EVENTS] RapidAPI key error:', error);
      console.warn('[SEARCH-EVENTS] RapidAPI key error details:', error instanceof Error ? error.message : String(error));
    }

    // We only need RapidAPI key since other APIs are disabled
    if (!hasValidRapidAPIKey) {
      return safeResponse({
        error: 'No valid RapidAPI key available',
        errorType: 'ApiKeyError',
        details: 'RapidAPI key is invalid or missing - this is the only API being used',
        events: [],
        sourceStats: generateSourceStats(0, 'API intentionally disabled', 0, 'API intentionally disabled', 0, 'API intentionally disabled', 0, 'Invalid API key'),
        meta: generateMetadata(startTime, 0, 0, null, null, null, apiKeyManager.getUsageStats('rapidapi'))
      }, 401);
    }
    
    // Log info about disabled APIs
    console.log('[SEARCH-EVENTS] Using only RapidAPI for event search. Other APIs are intentionally disabled.');
    console.warn('[SEARCH-EVENTS] Ticketmaster API intentionally disabled per user request.');
    console.warn('[SEARCH-EVENTS] PredictHQ API intentionally disabled per user request.');
    console.warn('[SEARCH-EVENTS] SeatGeek API intentionally disabled per user request.');
    console.log('[SEARCH-EVENTS] RapidAPI key is valid and will be used for searching events.')

    // Make API calls - only using RapidAPI as requested
    const results = await Promise.allSettled([
      // Disabled Ticketmaster API call - keeping the code reference
      Promise.resolve({ events: [], error: 'API intentionally disabled' }),

      // Disabled PredictHQ API call - keeping the code reference
      Promise.resolve({ events: [], error: 'API intentionally disabled' }),
        
      // Disabled SeatGeek API call - keeping the code reference
      Promise.resolve({ events: [], error: 'API intentionally disabled' }),
      hasValidRapidAPIKey
        ? (async () => {
            try {
              console.log('[SEARCH-EVENTS] Calling RapidAPI Events Search API with key:',
                rapidapiKey ? `${rapidapiKey.substring(0, 4)}...${rapidapiKey.substring(rapidapiKey.length - 4)}` : 'NOT SET');
              
              // Add browser console log for tracking API call start
              console.log('%c[EVENT TRACKING] RapidAPI API call started', 'color: #2196F3; font-weight: bold');
              
              const result = await searchRapidAPIEvents(params);
              console.log('[SEARCH-EVENTS_DEBUG] RapidAPI result:', {
                eventCount: result.length,
                success: result.length > 0
              });
              
              // Browser console log for tracking successful events
              console.log('%c[EVENT TRACKING] RapidAPI events added', 'color: #4CAF50; font-weight: bold', {
                count: result.length,
                eventsWithImages: result.filter(e => e.image && e.image !== 'https://placehold.co/600x400?text=No+Image').length,
                eventsWithUrls: result.filter(e => e.url).length,
                source: 'RapidAPI'
              });
              
              return {
                events: result,
                error: null,
                status: 200
              };
            } catch (error) {
              console.error('[SEARCH-EVENTS] Error calling RapidAPI Events Search API:', error);
              // Browser console log for tracking errors
              console.log('%c[EVENT TRACKING] RapidAPI API error', 'color: #F44336; font-weight: bold', {
                error: error instanceof Error ? error.message : String(error),
                source: 'RapidAPI'
              });
              return {
                events: [],
                error: `Error calling RapidAPI Events Search API: ${error instanceof Error ? error.message : String(error)}`,
                status: 500
              };
            }
          })()
        : Promise.resolve({ events: [], error: 'API key not available' })
    ]);

    const allEvents: Event[] = [];

    // Skip processing of disabled API results (Ticketmaster, PredictHQ, SeatGeek)
    // We only keep the error messages for tracking purposes
    ticketmasterError = 'API intentionally disabled';
    predicthqError = 'API intentionally disabled';
    seatgeekError = 'API intentionally disabled';
    
    // Log that these APIs are intentionally disabled
    console.log('[SEARCH-EVENTS] Ticketmaster API disabled, skipping result processing');
    console.log('[SEARCH-EVENTS] PredictHQ API disabled, skipping result processing');
    console.log('[SEARCH-EVENTS] SeatGeek API disabled, skipping result processing');

    
    // Process RapidAPI results
    if (results[3].status === 'fulfilled') {
      const rapidResult = results[3].value;
      if (rapidResult.error) {
        rapidapiError = rapidResult.error;
        console.error('[SEARCH-EVENTS] RapidAPI error:', rapidResult.error);
        // Browser console log for tracking errors
        console.log('%c[EVENT TRACKING] RapidAPI error', 'color: #F44336; font-weight: bold', {
          error: rapidResult.error,
          source: 'RapidAPI'
        });
        logApiKeyUsage('rapidapi', 'fetch_events', 'error', Date.now() - startTime, { error: rapidResult.error });
      } else {
        rapidapiCount = rapidResult.events.length;
        allEvents.push(...rapidResult.events);
        console.log(`[SEARCH-EVENTS] Successfully fetched ${rapidapiCount} events from RapidAPI`);
        // Browser console log for tracking successful events
        console.log('%c[EVENT TRACKING] RapidAPI events added', 'color: #4CAF50; font-weight: bold', {
          count: rapidResult.events.length,
          eventsWithImages: rapidResult.events.filter(e => e.image && e.image !== 'https://placehold.co/600x400?text=No+Image').length,
          eventsWithUrls: rapidResult.events.filter(e => e.url).length,
          source: 'RapidAPI'
        });
        logApiKeyUsage('rapidapi', 'fetch_events', 'success', Date.now() - startTime, { eventCount: rapidapiCount });
      }
    } else {
      rapidapiError = results[3].reason?.message || 'API call failed';
      console.error('[SEARCH-EVENTS] RapidAPI call rejected:', rapidapiError);
      logApiKeyUsage('rapidapi', 'fetch_events', 'error', Date.now() - startTime, { error: rapidapiError });
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
    const sourceStats = generateSourceStats(ticketmasterCount, ticketmasterError, predicthqCount, predicthqError, seatgeekCount, seatgeekError, rapidapiCount, rapidapiError);
    const meta = generateMetadata(
      startTime,
      allEvents.length,
      eventsWithCoords.length,
      apiKeyManager.getUsageStats('ticketmaster'),
      hasValidPredictHQKey ? apiKeyManager.getUsageStats('predicthq') : null,
      hasValidSeatgeekKey ? apiKeyManager.getUsageStats('seatgeek') : null,
      hasValidRapidAPIKey ? apiKeyManager.getUsageStats('rapidapi') : null
    );

    // Add comprehensive summary of API results - only RapidAPI is enabled
    console.log('%c[EVENT TRACKING] SUMMARY', 'color: #9C27B0; font-weight: bold; font-size: 14px', {
      totalEvents: sortedEvents.length,
      ticketmaster: {
        count: 0,
        error: ticketmasterError,
        percentage: '0%'
      },
      predicthq: {
        count: 0,
        error: predicthqError,
        percentage: '0%'
      },
      seatgeek: {
        count: 0,
        error: seatgeekError,
        percentage: '0%'
      },
      rapidapi: {
        count: rapidapiCount,
        error: rapidapiError,
        percentage: '100%'
      },
      eventsWithCoordinates: eventsWithCoords.length,
      executionTime: (Date.now() - startTime) + 'ms'
    });

    return safeResponse({
      events: sortedEvents,
      sourceStats,
      meta,
      apiUsed: "RapidAPI Events" // Indicate that only RapidAPI is being used
    }, 200);

  } catch (error) {
    console.error('[SEARCH-EVENTS] CRITICAL ERROR:', error);
    const formattedError = formatApiError(error);

    return safeResponse({
      events: [],
      error: formattedError.error,
      errorType: formattedError.errorType,
      details: formattedError.details,
      sourceStats: generateSourceStats(0, 'Function execution failed', 0, 'Function execution failed', 0, 'Function execution failed'),
      meta: generateMetadata(
        startTime,
        0,
        0,
        apiKeyManager.getUsageStats('ticketmaster'),
        hasValidPredictHQKey ? apiKeyManager.getUsageStats('predicthq') : null,
        hasValidSeatgeekKey ? apiKeyManager.getUsageStats('seatgeek') : null
      )
    }, error instanceof ApiKeyError ? 401 : 500);
  }
});
