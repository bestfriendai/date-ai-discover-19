// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

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

// Function to check RapidAPI key and make a test request
async function debugRapidAPI() {
  try {
    // Get RapidAPI key from environment variables
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') ||
                        Deno.env.get('X_RAPIDAPI_KEY') ||
                        Deno.env.get('REAL_TIME_EVENTS_API_KEY') ||
                        '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'; // Fallback to the provided key

    // Mask the key for logging
    const maskedKey = rapidApiKey ? 
      `${rapidApiKey.substring(0, 4)}...${rapidApiKey.substring(rapidApiKey.length - 4)}` : 
      'NOT SET';
    
    console.log(`[RAPIDAPI_DEBUG] Using RapidAPI key: ${maskedKey}`);

    // Make a test request to RapidAPI
    const queryParams = new URLSearchParams();
    queryParams.append('query', 'events near 38.7907584,-77.021184');
    queryParams.append('date', 'month');
    queryParams.append('is_virtual', 'false');
    queryParams.append('start', '0');

    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    console.log(`[RAPIDAPI_DEBUG] Sending test request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });

    console.log(`[RAPIDAPI_DEBUG] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RAPIDAPI_DEBUG] Request failed: ${response.status}`, errorText.substring(0, 200));
      return {
        status: 'error',
        apiKeyStatus: 'configured but not working',
        responseStatus: response.status,
        error: errorText.substring(0, 200),
        timestamp: new Date().toISOString()
      };
    }

    const data = await response.json();
    const eventCount = data.data?.length || 0;
    console.log(`[RAPIDAPI_DEBUG] Received ${eventCount} events from test request`);

    // Return debug information
    return {
      status: 'success',
      apiKeyStatus: 'working',
      apiKeyConfigured: !!rapidApiKey,
      apiKeyMasked: maskedKey,
      testRequestUrl: url,
      responseStatus: response.status,
      eventCount: eventCount,
      sampleEvents: eventCount > 0 ? data.data.slice(0, 2).map((event: any) => ({
        name: event.name,
        venue: event.venue?.name,
        coordinates: [event.venue?.longitude, event.venue?.latitude]
      })) : [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[RAPIDAPI_DEBUG] Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    console.log('[RAPIDAPI_DEBUG] Processing request');

    // Debug RapidAPI
    const result = await debugRapidAPI();

    // Return the response
    console.log('[RAPIDAPI_DEBUG] Returning response');
    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[RAPIDAPI_DEBUG] Error:', error instanceof Error ? error.message : String(error));

    // Return error response
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
