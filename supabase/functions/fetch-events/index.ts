
// supabase/functions/fetch-events/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard response headers
const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  console.log("fetch-events function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Mock events for testing
    const mockEvents = [];
    
    for (let i = 0; i < 10; i++) {
      mockEvents.push({
        id: `mock-${i}`,
        title: `Mock Event ${i}`,
        description: "This is a mock event for testing purposes",
        date: new Date().toISOString().split('T')[0],
        time: "19:00",
        location: "Test Location",
        venue: "Test Venue",
        category: "party",
        partySubcategory: ["club", "day-party", "social", "networking", "celebration"][i % 5],
        image: "https://via.placeholder.com/300",
        coordinates: [-74.006, 40.7128],
        latitude: 40.7128,
        longitude: -74.006,
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
        searchQueryUsed: "events near mock location"
      }
    };

    // Return mock response for now
    return new Response(JSON.stringify(response), { 
      headers: responseHeaders,
      status: 200
    });
  } catch (error) {
    console.error('Error in fetch-events:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        events: []
      }),
      {
        headers: responseHeaders,
        status: 500
      }
    );
  }
});
