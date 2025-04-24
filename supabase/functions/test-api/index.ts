// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for safe JSON responses
function safeResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 204,
    });
  }

  try {
    // Get API keys from environment variables
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY') || '';
    const PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY') || '';

    // Test Ticketmaster API
    let ticketmasterStatus = 'unknown';
    let ticketmasterError = null;
    let ticketmasterResponseStatus = null;
    
    try {
      console.log('[TEST-API] Testing Ticketmaster API...');
      const ticketmasterUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&size=1`;
      const ticketmasterResponse = await fetch(ticketmasterUrl);
      ticketmasterResponseStatus = ticketmasterResponse.status;
      
      if (ticketmasterResponse.ok) {
        const data = await ticketmasterResponse.json();
        ticketmasterStatus = data._embedded?.events ? 'success' : 'no_events';
      } else {
        ticketmasterStatus = 'error';
        ticketmasterError = await ticketmasterResponse.text();
      }
    } catch (error) {
      ticketmasterStatus = 'exception';
      ticketmasterError = error instanceof Error ? error.message : String(error);
    }

    // Test PredictHQ API
    let predicthqStatus = 'unknown';
    let predicthqError = null;
    let predicthqResponseStatus = null;
    
    try {
      console.log('[TEST-API] Testing PredictHQ API...');
      const predicthqUrl = 'https://api.predicthq.com/v1/events?limit=1';
      const predicthqResponse = await fetch(predicthqUrl, {
        headers: {
          'Authorization': `Bearer ${PREDICTHQ_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      predicthqResponseStatus = predicthqResponse.status;
      
      if (predicthqResponse.ok) {
        const data = await predicthqResponse.json();
        predicthqStatus = data.results?.length > 0 ? 'success' : 'no_events';
      } else {
        predicthqStatus = 'error';
        predicthqError = await predicthqResponse.text();
      }
    } catch (error) {
      predicthqStatus = 'exception';
      predicthqError = error instanceof Error ? error.message : String(error);
    }

    // Return the test results
    return safeResponse({
      timestamp: new Date().toISOString(),
      ticketmaster: {
        keyAvailable: !!TICKETMASTER_KEY,
        keyLength: TICKETMASTER_KEY.length,
        keyPrefix: TICKETMASTER_KEY ? `${TICKETMASTER_KEY.substring(0, 4)}...` : 'NOT SET',
        status: ticketmasterStatus,
        responseStatus: ticketmasterResponseStatus,
        error: ticketmasterError
      },
      predicthq: {
        keyAvailable: !!PREDICTHQ_API_KEY,
        keyLength: PREDICTHQ_API_KEY.length,
        keyPrefix: PREDICTHQ_API_KEY ? `${PREDICTHQ_API_KEY.substring(0, 4)}...${PREDICTHQ_API_KEY.substring(PREDICTHQ_API_KEY.length - 4)}` : 'NOT SET',
        status: predicthqStatus,
        responseStatus: predicthqResponseStatus,
        error: predicthqError
      }
    });
  } catch (error) {
    return safeResponse({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, 500);
  }
});
