/**
 * Supabase Edge Function: search-events
 * 
 * This function fetches events from multiple sources (Ticketmaster, PredictHQ)
 * and returns a normalized response with deduplication and filtering.
 * 
 * Implements best practices for Deno runtime and Supabase Edge Functions.
 */

// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../shared/cors.ts";
import { TicketmasterClient } from "./services/ticketmaster.ts";
import { PredictHQClient } from "./services/predicthq.ts";
import { Event, SearchParams, Metadata } from "./types.ts";
import { ApiKeyManager } from "./services/apiKeyManager.ts";
import { validateSearchParams } from "./validators/searchParamsValidator.ts";
import { EventProcessor } from "./services/eventProcessor.ts";
import { CacheService } from "./services/cacheService.ts";
import { MetricsService } from "./services/metricsService.ts";
import { ErrorHandler } from "./services/errorHandler.ts";

// Initialize services
const apiKeyManager = new ApiKeyManager();
const ticketmasterClient = new TicketmasterClient();
const predictHQClient = new PredictHQClient();
const eventProcessor = new EventProcessor();
const cacheService = new CacheService();
const metricsService = new MetricsService();
const errorHandler = new ErrorHandler();

/**
 * Handle CORS preflight requests
 */
function handleOptionsRequest(): Response {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status: 204,
  });
}

/**
 * Generate a cache key from search parameters
 */
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

/**
 * Create a JSON response with CORS headers
 */
function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  );
}

/**
 * Main handler function
 */
export async function handler(req: Request): Promise<Response> {
  // Start performance monitoring
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  // Create a context object for this request
  const context = {
    requestId,
    startTime,
    method: req.method,
    url: new URL(req.url)
  };
  
  try {
    // Parse request parameters
    let params: Record<string, any>;
    
    if (req.method === 'POST') {
      try {
        params = await req.json();
      } catch (error) {
        return createJsonResponse({
          error: 'Invalid request body',
          message: 'Failed to parse JSON body'
        }, 400);
      }
    } else {
      params = Object.fromEntries(context.url.searchParams);
    }
    
    // Log request details
    console.log(`[REQUEST] ${context.method} ${context.url.pathname} - RequestID: ${requestId}`);
    
    // Validate search parameters
    const validationResult = validateSearchParams(params);
    if (!validationResult.isValid) {
      return createJsonResponse({
        error: 'Invalid parameters',
        details: validationResult.errors
      }, 400);
    }
    
    const searchParams = validationResult.params!; // Add non-null assertion since we've checked isValid
    
    // Check cache for existing results
    const cacheKey = generateCacheKey(searchParams);
    const cachedData = await cacheService.get<{
      events: Event[];
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
      sourceStats: any;
      metadata?: Metadata;
    }>(cacheKey);
    
    if (cachedData) {
      console.log(`[CACHE] Hit for request ${requestId}`);
      metricsService.recordCacheHit(requestId);
      
      // Update cache metadata
      if (cachedData.metadata) {
        cachedData.metadata.cache = {
          hit: true,
          ttl: cachedData.metadata.cache?.ttl
        };
      } else {
        // Add metadata if it doesn't exist
        cachedData.metadata = {
          requestId,
          processingTime: 0,
          timestamp: new Date().toISOString(),
          cache: {
            hit: true,
            ttl: 5 * 60 * 1000 // 5 minutes default
          }
        };
      }
      
      return createJsonResponse(cachedData);
    }
    
    console.log(`[CACHE] Miss for request ${requestId}`);
    metricsService.recordCacheMiss(requestId);
    
    // Get API keys
    const apiKeys = await apiKeyManager.getKeys(['ticketmaster', 'predicthq']);
    
    // Create API clients with proper configuration
    const ticketmasterConfig = {
      apiKey: apiKeys.ticketmaster,
      timeout: searchParams.timeout || 5000
    };
    
    const predictHQConfig = {
      apiKey: apiKeys.predicthq,
      timeout: searchParams.timeout || 5000
    };
    
    // Execute API requests in parallel with proper error handling
    const [ticketmasterResponse, predictHQResponse] = await Promise.allSettled([
      ticketmasterClient.fetchEvents(searchParams, ticketmasterConfig),
      predictHQClient.fetchEvents(searchParams, predictHQConfig)
    ]);
    
    // Process Ticketmaster results
    let ticketmasterEvents: Event[] = [];
    let ticketmasterError: string | null = null;
    
    if (ticketmasterResponse.status === 'fulfilled') {
      ticketmasterEvents = ticketmasterResponse.value.events || [];
      ticketmasterError = ticketmasterResponse.value.error;
      
      if (ticketmasterError) {
        console.error(`[TICKETMASTER] API error for request ${requestId}:`, ticketmasterError);
      } else {
        console.log(`[TICKETMASTER] Fetched ${ticketmasterEvents.length} events for request ${requestId}`);
      }
    } else {
      ticketmasterError = ticketmasterResponse.reason?.message || 'Unknown error';
      console.error(`[TICKETMASTER] Promise rejected for request ${requestId}:`, ticketmasterError);
    }
    
    // Process PredictHQ results
    let predictHQEvents: Event[] = [];
    let predictHQError: string | null = null;
    
    if (predictHQResponse.status === 'fulfilled') {
      predictHQEvents = predictHQResponse.value.events || [];
      predictHQError = predictHQResponse.value.error;
      
      if (predictHQError) {
        console.error(`[PREDICTHQ] API error for request ${requestId}:`, predictHQError);
      } else {
        console.log(`[PREDICTHQ] Fetched ${predictHQEvents.length} events for request ${requestId}`);
      }
    } else {
      predictHQError = predictHQResponse.reason?.message || 'Unknown error';
      console.error(`[PREDICTHQ] Promise rejected for request ${requestId}:`, predictHQError);
    }
    
    // Process events with the EventProcessor service
    const processedEvents = eventProcessor.process({
      ticketmaster: {
        events: ticketmasterEvents,
        error: ticketmasterError
      },
      predictHQ: {
        events: predictHQEvents,
        error: predictHQError
      }
    }, searchParams);
    
    // Apply pagination
    const offset = searchParams.offset || 0;
    const limit = searchParams.limit || 100;
    const paginatedEvents = processedEvents.events.slice(offset, offset + limit);
    
    // Prepare response data
    const cacheTtl = 5 * 60 * 1000; // 5 minutes
    const metadata: Metadata = {
      requestId,
      processingTime: performance.now() - startTime,
      timestamp: new Date().toISOString(),
      cache: {
        hit: false,
        ttl: cacheTtl
      }
    };
    
    // Add API usage information if available
    if (processedEvents.meta?.apiUsage) {
      metadata.apiUsage = processedEvents.meta.apiUsage;
    }
    
    const responseData = {
      events: paginatedEvents,
      total: processedEvents.events.length,
      offset,
      limit,
      hasMore: offset + limit < processedEvents.events.length,
      sourceStats: processedEvents.sourceStats,
      metadata
    };
    
    // Cache the results
    await cacheService.set(cacheKey, responseData, cacheTtl);
    
    // Record metrics
    metricsService.recordApiCall({
      requestId,
      duration: performance.now() - startTime,
      eventCount: paginatedEvents.length,
      sources: {
        ticketmaster: ticketmasterEvents.length,
        predictHQ: predictHQEvents.length
      }
    });
    
    // Return the response
    return createJsonResponse(responseData);
  } catch (error) {
    // Handle unexpected errors
    const errorResponse = errorHandler.handle(error, context);
    return createJsonResponse(errorResponse, errorResponse.status || 500);
  } finally {
    // Log request completion
    const duration = performance.now() - startTime;
    console.log(`[COMPLETE] Request ${requestId} completed in ${duration.toFixed(2)}ms`);
  }
}

// Serve the handler function
serve(handler);
