// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// This is a public function that doesn't require authentication
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Add CORS headers to all responses
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  try {
    // Get environment variables (mask sensitive parts)
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY') || '';
    const PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY') || '';

    // Mask sensitive parts of the keys
    const maskedTicketmasterKey = TICKETMASTER_KEY
      ? `${TICKETMASTER_KEY.substring(0, 4)}...${TICKETMASTER_KEY.substring(TICKETMASTER_KEY.length - 4)}`
      : 'NOT SET';

    const maskedPredictHQKey = PREDICTHQ_API_KEY
      ? `${PREDICTHQ_API_KEY.substring(0, 4)}...${PREDICTHQ_API_KEY.substring(PREDICTHQ_API_KEY.length - 4)}`
      : 'NOT SET';

    // Return environment variable status
    return new Response(JSON.stringify({
      status: 'success',
      env: {
        TICKETMASTER_KEY_SET: !!TICKETMASTER_KEY,
        TICKETMASTER_KEY_LENGTH: TICKETMASTER_KEY.length,
        TICKETMASTER_KEY_PREFIX: maskedTicketmasterKey,
        PREDICTHQ_API_KEY_SET: !!PREDICTHQ_API_KEY,
        PREDICTHQ_API_KEY_LENGTH: PREDICTHQ_API_KEY.length,
        PREDICTHQ_API_KEY_PREFIX: maskedPredictHQKey
      }
    }), {
      headers: responseHeaders,
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      headers: responseHeaders,
      status: 500
    });
  }
})
