// Simple search-events function for testing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request parameters
    let params = {};
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.text();
        if (body && body.trim()) {
          params = JSON.parse(body);
        }
      }
    } catch (e) {
      console.error('Error parsing request:', e);
    }

    // Return a simple response
    return new Response(JSON.stringify({
      events: [],
      sourceStats: {
        ticketmaster: { count: 0, error: 'Simplified function' },
        eventbrite: { count: 0, error: null },
        serpapi: { count: 0, error: null },
        predicthq: { count: 0, error: null }
      },
      meta: {
        executionTime: 0,
        totalEvents: 0,
        eventsWithCoordinates: 0,
        currentPage: 1,
        pageSize: 10,
        totalPages: 0,
        timestamp: new Date().toISOString(),
        metrics: {
          apiCalls: 0,
          processingTime: 0,
          errors: 0
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200,
    });
  } catch (error) {
    console.error('Critical error:', error);
    
    // Return a structured error response
    return new Response(JSON.stringify({
      error: String(error),
      timestamp: new Date().toISOString(),
      events: [],
      sourceStats: {
        ticketmaster: { count: 0, error: 'Function execution failed' },
        eventbrite: { count: 0, error: 'Function execution failed' },
        serpapi: { count: 0, error: 'Function execution failed' },
        predicthq: { count: 0, error: 'Function execution failed' }
      },
      meta: {
        metrics: {
          processingTime: 0,
          errors: 1
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500,
    });
  }
});
