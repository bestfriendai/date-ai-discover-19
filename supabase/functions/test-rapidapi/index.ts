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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    // Get environment variables
    // @ts-ignore: Deno is available at runtime
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    // @ts-ignore: Deno is available at runtime
    const xRapidApiKey = Deno.env.get('X_RAPIDAPI_KEY');
    // @ts-ignore: Deno is available at runtime
    const realTimeEventsApiKey = Deno.env.get('REAL_TIME_EVENTS_API_KEY');

    // Mask keys for security
    const maskKey = (key: string | undefined) => {
      if (!key) return 'NOT SET';
      if (key.length <= 8) return '********';
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    // Return environment variable status
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'RapidAPI key check',
        environment: {
          RAPIDAPI_KEY: rapidApiKey ? `SET: ${maskKey(rapidApiKey)}` : 'NOT SET',
          X_RAPIDAPI_KEY: xRapidApiKey ? `SET: ${maskKey(xRapidApiKey)}` : 'NOT SET',
          REAL_TIME_EVENTS_API_KEY: realTimeEventsApiKey ? `SET: ${maskKey(realTimeEventsApiKey)}` : 'NOT SET',
        },
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
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
