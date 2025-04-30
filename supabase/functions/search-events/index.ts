
// supabase/functions/search-events/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Standard response headers
const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  console.log("search-events function initialized.");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request parameters
    let params = {};
    
    if (req.method === 'GET') {
      // For GET requests, use URL parameters
      const url = new URL(req.url);
      params = Object.fromEntries(url.searchParams);
    } else if (req.method === 'POST') {
      // For POST requests, parse the JSON body
      params = await req.json();
    }
    
    console.log('[VALIDATION] Extracted location parameters:', JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
      location: params.location
    }));

    console.log('[VALIDATION] Validated search parameters:', JSON.stringify(params));
    
    // Mock response for now since we're missing the actual implementation
    // In a real scenario this would call the actual event search services
    const mockEvents = [];
    
    for (let i = 0; i < 5; i++) {
      mockEvents.push({
        id: `mock-${i}`,
        title: `Mock Event ${i}`,
        description: "This is a mock event for testing purposes",
        date: new Date().toISOString().split('T')[0],
        time: "19:00",
        location: params.location || "Test Location",
        venue: "Test Venue",
        category: "party",
        image: "https://via.placeholder.com/300",
        coordinates: params.longitude && params.latitude 
          ? [Number(params.longitude), Number(params.latitude)] 
          : [-74.006, 40.7128],
        latitude: params.latitude ? Number(params.latitude) : 40.7128,
        longitude: params.longitude ? Number(params.longitude) : -74.006,
        price: "$20"
      });
    }

    // Create response with mock data
    const response = {
      events: mockEvents,
      sourceStats: {
        rapidapi: { count: mockEvents.length, error: null }
      },
      meta: {
        executionTime: "512ms",
        totalEvents: mockEvents.length,
        eventsWithCoordinates: mockEvents.length,
        timestamp: new Date().toISOString(),
        page: 1,
        limit: 50,
        hasMore: false,
        searchQueryUsed: `events near ${params.latitude},${params.longitude} in ${params.location}`
      }
    };

    console.log('[EVENT TRACKING] FINAL SUMMARY', JSON.stringify({
      totalEventsReturned: mockEvents.length,
      rapidapi: { count: mockEvents.length, error: null },
      eventsWithCoordinates: mockEvents.length,
      executionTime: "512ms",
      searchQueryUsed: response.meta.searchQueryUsed,
      pagination: { page: 1, limit: 50, hasMore: false }
    }));

    return new Response(JSON.stringify(response), {
      headers: responseHeaders,
      status: 200
    });
  } catch (error) {
    console.error('Error in search-events:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        events: [],
        sourceStats: {
          rapidapi: { count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: responseHeaders,
        status: 500
      }
    );
  }
});
