
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
      console.error('[GET-EVENT] TICKETMASTER_KEY is not set in environment variables')
      throw new Error('TICKETMASTER_KEY is not set')
    }

    // Parse request parameters
    let id: string;
    
    try {
      const body = await req.json();
      id = body.id;
      
      if (!id) {
        throw new Error('Event ID is required');
      }
      
      console.log(`[GET-EVENT] Fetching event with ID: ${id}`);
    } catch (parseError) {
      console.error('[GET-EVENT] Error parsing request body:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid request body. Event ID is required.',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check if it's a Ticketmaster event
    if (id.startsWith('ticketmaster-')) {
      const ticketmasterId = id.replace('ticketmaster-', '')
      console.log(`[GET-EVENT] Fetching Ticketmaster event: ${ticketmasterId}`);

      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events/${ticketmasterId}.json?apikey=${TICKETMASTER_KEY}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[GET-EVENT] Ticketmaster API error: ${response.status}`, errorText)
        throw new Error(`Event not found or API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.errors || !data.name) {
        throw new Error('Event not found')
      }

      // Transform Ticketmaster event
      const event = {
        id: `ticketmaster-${data.id}`,
        source: 'ticketmaster',
        title: data.name,
        description: data.description || data.info || '',
        date: data.dates.start.localDate,
        time: data.dates.start.localTime,
        location: data._embedded?.venues?.[0]?.name || '',
        venue: data._embedded?.venues?.[0]?.name,
        category: data.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
        image: data.images?.[0]?.url || '/placeholder.svg',
        coordinates: data._embedded?.venues?.[0]?.location ? [
          parseFloat(data._embedded?.venues?.[0]?.location?.longitude),
          parseFloat(data._embedded?.venues?.[0]?.location?.latitude)
        ] : undefined,
        url: data.url,
        price: data.priceRanges ?
          `${data.priceRanges[0].min} - ${data.priceRanges[0].max} ${data.priceRanges[0].currency}` :
          undefined
      }

      console.log(`[GET-EVENT] Successfully retrieved Ticketmaster event: ${event.title}`);

      return new Response(JSON.stringify({ event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else if (id.startsWith('predicthq-')) {
      // Future implementation for PredictHQ events
      console.error('[GET-EVENT] PredictHQ event retrieval not implemented');
      throw new Error('PredictHQ event retrieval not implemented')
    } else if (id.startsWith('serpapi-')) {
      // For SerpAPI events, we would need to implement a way to retrieve them
      console.error('[GET-EVENT] SerpAPI event retrieval not implemented');
      throw new Error('SerpAPI event retrieval not implemented')
    } else {
      console.error('[GET-EVENT] Unknown event source:', id);
      throw new Error('Unknown event source')
    }
  } catch (error) {
    console.error('[GET-EVENT] Error:', error)

    // Extract error details
    let errorMessage = 'Unknown error occurred';
    let errorType = 'UnknownError';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = error.name;
      console.error('[GET-EVENT] Error stack:', error.stack);
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      errorType,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
