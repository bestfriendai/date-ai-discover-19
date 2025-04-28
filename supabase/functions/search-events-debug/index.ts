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
  console.log('[SEARCH-EVENTS-DEBUG] Handling OPTIONS request');
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status: 204,
  });
}

// Simple function to check RapidAPI key
async function checkRapidAPIKey() {
  try {
    // Get RapidAPI key
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    const xRapidApiKey = Deno.env.get('X_RAPIDAPI_KEY');
    const realTimeEventsApiKey = Deno.env.get('REAL_TIME_EVENTS_API_KEY');
    
    // Log the masked API keys (first 4 chars and last 4 chars only)
    const maskKey = (key: string | undefined) => {
      if (!key) return 'NOT SET';
      if (key.length <= 8) return '********';
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };
    
    // Check if keys meet validation rules
    const validateKey = (key: string | undefined) => {
      if (!key) return false;
      
      // RapidAPI validation rules
      const format = /^[A-Za-z0-9_-]+$/;
      const minLength = 25;
      const maxLength = 50;
      
      const isFormatValid = format.test(key);
      const isLengthValid = key.length >= minLength && key.length <= maxLength;
      
      return {
        isValid: isFormatValid && isLengthValid,
        format: isFormatValid,
        length: isLengthValid,
        actualLength: key.length
      };
    };
    
    return {
      status: 'success',
      environment: {
        RAPIDAPI_KEY: rapidApiKey ? `SET: ${maskKey(rapidApiKey)}` : 'NOT SET',
        X_RAPIDAPI_KEY: xRapidApiKey ? `SET: ${maskKey(xRapidApiKey)}` : 'NOT SET',
        REAL_TIME_EVENTS_API_KEY: realTimeEventsApiKey ? `SET: ${maskKey(realTimeEventsApiKey)}` : 'NOT SET',
      },
      validation: {
        RAPIDAPI_KEY: rapidApiKey ? validateKey(rapidApiKey) : 'NOT SET',
        X_RAPIDAPI_KEY: xRapidApiKey ? validateKey(xRapidApiKey) : 'NOT SET',
        REAL_TIME_EVENTS_API_KEY: realTimeEventsApiKey ? validateKey(realTimeEventsApiKey) : 'NOT SET',
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

serve(async (req: Request) => {
  console.log('[SEARCH-EVENTS-DEBUG] Function started');
  console.log('[SEARCH-EVENTS-DEBUG] Request method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    console.log('[SEARCH-EVENTS-DEBUG] Processing request');
    
    // Check RapidAPI key
    const result = await checkRapidAPIKey();
    
    // Return the response
    console.log('[SEARCH-EVENTS-DEBUG] Returning response');
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
    console.error('[SEARCH-EVENTS-DEBUG] Error:', error instanceof Error ? error.message : String(error));
    
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