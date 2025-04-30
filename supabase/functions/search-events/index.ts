
// supabase/functions/search-events/index.ts
// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import {
  Event,
  SearchParams,
  SearchEventsResponse,
  SourceStats 
} from './types.ts';
import { apiKeyManager } from './apiKeyManager.ts';
import { searchRapidAPIEvents } from './rapidapi-enhanced.ts';
import {
  sortEventsByDate,
  filterEventsByCoordinates,
  generateSourceStats,
  generateMetadata,
  calculateDistance
} from './processing.ts';
import { validateAndParseSearchParams, RequestValidationError } from './validation.ts';
import { ApiKeyError, formatApiError } from './errors.ts';

console.log('Starting search-events function with enhanced RapidAPI integration...');

// Helper for consistent responses
const safeResponse = (body: any, status: number, headers: Headers = new Headers(responseHeaders)) => {
  try {
    return new Response(JSON.stringify(body), { status, headers });
  } catch (error) {
    console.error("Failed to stringify response body:", error);
    return new Response(JSON.stringify({ error: "Internal server error during response generation." }), {
      status: 500,
      headers: new Headers(responseHeaders)
    });
  }
};

// Standard response headers
const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  const startTime = Date.now();
  console.log(`[${new Date(startTime).toISOString()}] Received request: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // --- Request Validation ---
  let params: SearchParams;
  try {
     if (req.method !== 'POST') {
       return safeResponse({ error: 'Method Not Allowed' }, 405);
     }
     
     let requestBody;
     try {
        requestBody = await req.json();
        if (!requestBody || Object.keys(requestBody).length === 0) {
          throw new Error('Request body is empty or invalid JSON');
        }
     } catch (error) {
        console.error('[VALIDATION] Error parsing request body:', error);
        return safeResponse({ error: 'Invalid request body', details: error.message }, 400);
     }
     
     params = validateAndParseSearchParams(requestBody);
     console.log('[VALIDATION] Validated search parameters:', JSON.stringify(params));
  } catch (error) {
     console.error('[VALIDATION] Parameter validation failed:', error);
     
     if (error instanceof RequestValidationError) {
        return safeResponse({ error: 'Invalid request parameters', details: error.errors }, 400);
     }
     
     console.error('[VALIDATION] Unexpected validation error:', error);
     return safeResponse(formatApiError(new Error('Unexpected error during parameter validation')), 500);
  }
  // --- End Request Validation ---

  let rapidapiKey: string | undefined;
  let hasValidRapidAPIKey = false;
  let rapidapiUsageStats: { count: number; errors: number; lastUsed: number } | null = null;

  try {
    // --- Get RapidAPI Key ---
    try {
      rapidapiKey = apiKeyManager.getActiveKey('rapidapi');
      hasValidRapidAPIKey = true;
      console.log('[API_KEY] Successfully validated RapidAPI key.');
    } catch (error) {
      console.error('[API_KEY] RapidAPI key error:', error);
       if (error instanceof ApiKeyError) {
           console.warn(`[API_KEY] Failing gracefully: ${error.message}`);
       } else {
           throw error;
       }
    }
    // --- End Get RapidAPI Key ---

    let allEvents: Event[] = [];
    let rapidapiError: string | null = null;
    let rapidapiCount = 0;
    let searchQueryUsed: string | undefined = undefined;

    // --- Call Enhanced RapidAPI (only if key is valid) ---
    if (hasValidRapidAPIKey && rapidapiKey) {
        console.log('[RAPIDAPI_FETCH] Calling enhanced searchRapidAPIEvents...');
        const rapidapiResult = await searchRapidAPIEvents(params, rapidapiKey);
        allEvents = rapidapiResult.events;
        rapidapiError = rapidapiResult.error;
        rapidapiCount = allEvents.length;
        searchQueryUsed = rapidapiResult.searchQueryUsed;

        if (rapidapiError) {
            console.error(`[RAPIDAPI_FETCH] Error from RapidAPI: ${rapidapiError}`);
        } else {
            console.log(`[RAPIDAPI_FETCH] Received ${rapidapiCount} events from RapidAPI.`);
        }
        rapidapiUsageStats = apiKeyManager.getUsageStats('rapidapi');
    } else {
        rapidapiError = 'RapidAPI key is missing or invalid. Cannot fetch events.';
        console.error(`[RAPIDAPI_FETCH] Skipped fetch due to key issue.`);
    }
    // --- End Call RapidAPI ---

    // --- Process Results ---
    console.log(`[PROCESSING] Starting processing for ${allEvents.length} events.`);
    const { eventsWithCoords } = filterEventsByCoordinates(allEvents);
    const sortedEvents = sortEventsByDate(allEvents);
    console.log(`[PROCESSING] Sorted ${sortedEvents.length} events.`);

    // Apply limit and pagination *after* sorting and filtering
    const page = params.page || 1;
    const limit = params.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);
    const hasMore = sortedEvents.length > endIndex;

    console.log(`[PROCESSING] Paginated events: ${paginatedEvents.length} (Page: ${page}, Limit: ${limit}, HasMore: ${hasMore})`);

    const finalSourceStats = generateSourceStats(rapidapiCount, rapidapiError);
    const finalMeta = generateMetadata(
      startTime,
      paginatedEvents.length,
      eventsWithCoords.length,
      rapidapiUsageStats,
      searchQueryUsed,
      page,
      limit,
      hasMore
    );

    console.log('[RESPONSE] Preparing final response.');
    console.log('[EVENT TRACKING] FINAL SUMMARY', {
      totalEventsReturned: paginatedEvents.length,
      rapidapi: finalSourceStats.rapidapi,
      eventsWithCoordinates: eventsWithCoords.length,
      executionTime: finalMeta.executionTime + 'ms',
      searchQueryUsed: finalMeta.searchQueryUsed,
      pagination: { page: finalMeta.page, limit: finalMeta.limit, hasMore: finalMeta.hasMore }
    });

    return safeResponse({
      events: paginatedEvents,
      sourceStats: finalSourceStats,
      meta: finalMeta,
      apiUsed: "RapidAPI Events"
    }, 200);
    // --- End Process Results ---

  } catch (error) {
     console.error('[CRITICAL_ERROR] Unhandled error in main try block:', error);
     const formattedError = formatApiError(error);
     const executionTime = Date.now() - startTime;

     if (hasValidRapidAPIKey && !rapidapiUsageStats) {
         rapidapiUsageStats = apiKeyManager.getUsageStats('rapidapi');
     }

     return safeResponse({
       events: [],
       error: formattedError.error,
       errorType: formattedError.errorType,
       details: formattedError.details || (error instanceof Error ? error.stack : undefined),
       sourceStats: generateSourceStats(0, `Function execution failed: ${formattedError.error}`),
       meta: generateMetadata(
         startTime,
         0,
         0,
         rapidapiUsageStats,
         undefined,
         params?.page,
         params?.limit,
         false
       )
     }, error instanceof ApiKeyError ? 401 : error instanceof RequestValidationError ? 400 : 500);
  }
});

console.log('search-events function initialized.');
