
// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchTicketmasterEvents } from "./ticketmaster-new.ts";
import { fetchPredictHQEvents } from "./predicthq.ts";
import { Event, SearchParams } from "./types.ts";
import { apiKeyManager } from "./apiKeyManager.ts";
import { ApiKeyError, formatApiError } from "./errors.ts";
import { logApiKeyUsage } from "./logger.ts";
import { validateAndParseSearchParams, RequestValidationError } from "./validation.ts";
import {
  normalizeAndFilterEvents,
  sortEventsByDate,
  separateEventsByCoordinates,
  filterEventsByDistance,
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

// Simple in-memory cache with expiration
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
};

// Run cache cleanup every minute
setInterval(clearExpiredCache, 60 * 1000);

// Generate cache key from search parameters
function generateCacheKey(params: SearchParams): string {
  return JSON.stringify({
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    categories: params.categories?.sort(),
    text: params.text,
    start: params.start,
    end: params.end,
    limit: params.limit,
    offset: params.offset,
    sort: params.sort
  });
}

// Main handler function
serve(async (req) => {
  // Start timing for performance monitoring
  const startTime = performance.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    // Parse request parameters
    const url = new URL(req.url);
    let params: Record<string, any> = {};
    
    // Handle both GET and POST requests
    if (req.method === 'POST') {
      try {
        // Parse JSON body for POST requests
        const body = await req.json();
        params = body;
        console.log(`[REQUEST] ${req.method} ${url.pathname} - Body:`, params);
      } catch (error) {
        console.error('[ERROR] Failed to parse request body:', error);
        return new Response(
          JSON.stringify({
            error: 'Invalid request body',
            message: 'Failed to parse JSON body'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    } else {
      // Parse query parameters for GET requests
      params = Object.fromEntries(url.searchParams);
      console.log(`[REQUEST] ${req.method} ${url.pathname} - Params:`, params);
    }
    
    // Validate and parse search parameters
    let searchParams: SearchParams;
    try {
      searchParams = validateAndParseSearchParams(params);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            details: error.errors
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      throw error;
    }
    
    // Check cache for existing results
    const cacheKey = generateCacheKey(searchParams);
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey)!;
      console.log('[CACHE] Cache hit for query');
      
      // Add cache hit metadata
      const responseData = {
        ...cachedData.data,
        metadata: {
          ...cachedData.data.metadata,
          cacheHit: true,
          cachedAt: new Date(cachedData.timestamp).toISOString(),
          responseTime: performance.now() - startTime
        }
      };
      
      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    console.log('[CACHE] Cache miss for query');
    
    // Get API keys
    let ticketmasterApiKey: string;
    let predictHQApiKey: string;
    
    try {
      ticketmasterApiKey = apiKeyManager.getActiveKey('ticketmaster');
      predictHQApiKey = apiKeyManager.getActiveKey('predicthq');
      
      // Log API key usage
      logApiKeyUsage('ticketmaster', 'get_key', 'success', 0, { keyLength: ticketmasterApiKey.length });
      logApiKeyUsage('predicthq', 'get_key', 'success', 0, { keyLength: predictHQApiKey.length });
    } catch (error) {
      if (error instanceof ApiKeyError) {
        return formatApiError(error);
      }
      throw error;
    }
    
    // Prepare API-specific parameters
    const ticketmasterParams = extractTicketmasterParams(searchParams, ticketmasterApiKey);
    const predictHQParams = extractPredictHQParams(searchParams, predictHQApiKey);
    
    // Fetch events from both APIs in parallel
    const [ticketmasterResponse, predictHQResponse] = await Promise.allSettled([
      fetchTicketmasterEvents(ticketmasterParams),
      fetchPredictHQEvents(predictHQParams)
    ]);
    
    // Process Ticketmaster results
    let ticketmasterEvents: Event[] = [];
    let ticketmasterError: string | null = null;
    
    if (ticketmasterResponse.status === 'fulfilled') {
      ticketmasterEvents = ticketmasterResponse.value.events || [];
      ticketmasterError = ticketmasterResponse.value.error;
      
      if (ticketmasterError) {
        console.error('[TICKETMASTER] API error:', ticketmasterError);
      } else {
        console.log(`[TICKETMASTER] Fetched ${ticketmasterEvents.length} events`);
      }
    } else {
      ticketmasterError = ticketmasterResponse.reason?.message || 'Unknown error';
      console.error('[TICKETMASTER] Promise rejected:', ticketmasterError);
    }
    
    // Process PredictHQ results
    let predictHQEvents: Event[] = [];
    let predictHQError: string | null = null;
    
    if (predictHQResponse.status === 'fulfilled') {
      predictHQEvents = predictHQResponse.value.events || [];
      predictHQError = predictHQResponse.value.error;
      
      if (predictHQError) {
        console.error('[PREDICTHQ] API error:', predictHQError);
      } else {
        console.log(`[PREDICTHQ] Fetched ${predictHQEvents.length} events`);
      }
    } else {
      predictHQError = predictHQResponse.reason?.message || 'Unknown error';
      console.error('[PREDICTHQ] Promise rejected:', predictHQError);
    }
    
    // Combine events from both sources
    let allEvents: Event[] = [...ticketmasterEvents, ...predictHQEvents];
    
    // Apply post-processing
    allEvents = normalizeAndFilterEvents(allEvents, searchParams);
    
    // Filter by coordinates if provided
    if (searchParams.latitude && searchParams.longitude) {
      // Use separateEventsByCoordinates instead of filterEventsByCoordinates
      const { eventsWithCoords } = separateEventsByCoordinates(allEvents);
      allEvents = eventsWithCoords;
      
      // Apply distance filtering if radius is provided
      if (searchParams.radius) {
        allEvents = filterEventsByDistance(
          allEvents,
          searchParams.latitude,
          searchParams.longitude,
          searchParams.radius
        );
      }
    }
    
    // Sort events by date
    allEvents = sortEventsByDate(allEvents);
    
    // Apply pagination
    const offset = searchParams.offset || 0;
    const limit = searchParams.limit || 100;
    const paginatedEvents = allEvents.slice(offset, offset + limit);
    
    // Generate source statistics
    const sourceStats = generateSourceStats(
      ticketmasterEvents.length,
      ticketmasterError,
      predictHQEvents.length,
      predictHQError
    );
    
    // Generate metadata
    const metadata = generateMetadata(
      startTime,
      allEvents.length,
      allEvents.filter(event => event.coordinates).length,
      ticketmasterEvents.length,
      predictHQEvents.length
    );
    
    // Prepare response data
    const responseData = {
      events: paginatedEvents,
      total: allEvents.length,
      offset,
      limit,
      hasMore: offset + limit < allEvents.length,
      sourceStats,
      metadata
    };
    
    // Cache the results
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    // Return the response
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('[ERROR] Unhandled error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
