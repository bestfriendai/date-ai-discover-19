
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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY')
    if (!TICKETMASTER_KEY) {
      console.error('[FETCH-EVENTS] TICKETMASTER_KEY is not set in environment variables')
      throw new Error('TICKETMASTER_KEY is not set')
    }

    // Parse request parameters
    const url = new URL(req.url)
    const lat = url.searchParams.get('lat') || '40.7831'
    const lng = url.searchParams.get('lng') || '-73.9712'
    const radius = url.searchParams.get('radius') || '10'
    
    console.log(`[FETCH-EVENTS] Fetching events for lat: ${lat}, lng: ${lng}, radius: ${radius}`)

    // Fetch events from Ticketmaster API
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?` +
      `apikey=${TICKETMASTER_KEY}&` +
      `latlong=${lat},${lng}&` +
      `radius=${radius}&` +
      `unit=miles&` +
      `size=20`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[FETCH-EVENTS] Ticketmaster API error: ${response.status}`, errorText)
      throw new Error(`Ticketmaster API error: ${response.status}`)
    }

    const data = await response.json()
    
    console.log(`[FETCH-EVENTS] Retrieved ${data._embedded?.events?.length || 0} events from Ticketmaster`)

    // Transform the data to match our Event type
    const events = data._embedded?.events?.map((event: any) => ({
      id: event.id,
      title: event.name,
      description: event.description || event.info,
      date: event.dates.start.localDate,
      time: event.dates.start.localTime,
      location: event._embedded?.venues?.[0]?.name,
      category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
      image: event.images?.[0]?.url || '/placeholder.svg',
      coordinates: [
        parseFloat(event._embedded?.venues?.[0]?.location?.longitude),
        parseFloat(event._embedded?.venues?.[0]?.location?.latitude)
      ],
      venue: event._embedded?.venues?.[0]?.name,
      url: event.url,
      source: 'ticketmaster'
    })) || []

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[FETCH-EVENTS] Error:', error)

    // Extract error details
    let errorMessage = 'Unknown error occurred';
    let errorType = 'UnknownError';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = error.name;
      console.error('[FETCH-EVENTS] Error stack:', error.stack);
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      errorType,
      timestamp: new Date().toISOString(),
      events: [] // Return empty events array for consistency
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
