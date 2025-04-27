
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[MAPBOX-TOKEN] Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[MAPBOX-TOKEN] Attempting to retrieve token from environment variables')
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN')

    // Check if token exists
    if (!MAPBOX_TOKEN) {
      console.error('[MAPBOX-TOKEN] CRITICAL ERROR: MAPBOX_TOKEN secret is NOT SET in Supabase Function environment!')
      console.error('[MAPBOX-TOKEN] Please go to Supabase Dashboard > Project Settings > Edge Functions > Add New Secret')

      // Use fallback token instead of throwing an error
      const FALLBACK_TOKEN = 'pk.eyJ1IjoidHJhcHBhdCIsImEiOiJjbTMzODBqYTYxbHcwMmpwdXpxeWljNXJ3In0.xKUEW2C1kjFBu7kr7Uxfow'
      console.log('[MAPBOX-TOKEN] Using fallback token instead')
      return new Response(
        JSON.stringify({
          MAPBOX_TOKEN: FALLBACK_TOKEN,
          success: true,
          timestamp: new Date().toISOString(),
          source: 'fallback'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
          status: 200,
        }
      )
    }

    // Validate token format (basic check)
    if (!MAPBOX_TOKEN.startsWith('pk.') && !MAPBOX_TOKEN.startsWith('sk.')) {
      console.error('[MAPBOX-TOKEN] WARNING: Token does not start with expected prefix (pk. or sk.)')
    }

    // Log partial token for debugging (don't log the full token for security)
    const tokenPreview = MAPBOX_TOKEN.substring(0, 8) + '...' + MAPBOX_TOKEN.substring(MAPBOX_TOKEN.length - 4)
    console.log(`[MAPBOX-TOKEN] Successfully retrieved token: ${tokenPreview}`)

    // Return the token with appropriate headers
    return new Response(
      JSON.stringify({
        MAPBOX_TOKEN,
        success: true,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
        status: 200,
      }
    )
  } catch (error) {
    // Detailed error logging
    console.error('[MAPBOX-TOKEN] Error retrieving token:', error)
    console.error('[MAPBOX-TOKEN] Error details:', error.stack || 'No stack trace available')

    // Return a more informative error to the client
    return new Response(
      JSON.stringify({
        error: 'Failed to retrieve map configuration.',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        status: 500,
      }
    )
  }
})
