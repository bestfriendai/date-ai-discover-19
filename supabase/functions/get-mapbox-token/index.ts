
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[MAPBOX-TOKEN] Retrieving Mapbox token from environment variables')
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN')

    if (!MAPBOX_TOKEN) {
      console.error('[MAPBOX-TOKEN] MAPBOX_TOKEN environment variable is not set')
      throw new Error('MAPBOX_TOKEN environment variable is not set')
    }

    // Log partial token for debugging (don't log the full token for security)
    const tokenPreview = MAPBOX_TOKEN.substring(0, 8) + '...' + MAPBOX_TOKEN.substring(MAPBOX_TOKEN.length - 4)
    console.log(`[MAPBOX-TOKEN] Successfully retrieved token: ${tokenPreview}`)

    return new Response(
      JSON.stringify({ MAPBOX_TOKEN }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[MAPBOX-TOKEN] Error retrieving token:', error)

    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
