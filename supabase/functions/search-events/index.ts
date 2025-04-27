
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    console.log('Request received to search-events');
    
    // Parse request body
    const body = await req.json();
    const { lat, lng, radius = 10 } = body;
    
    console.log(`Searching for events near lat:${lat}, lng:${lng}, radius:${radius}`);

    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required');
    }

    // Get API key from environment
    // @ts-ignore
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY');
    
    if (!TICKETMASTER_KEY) {
      throw new Error('TICKETMASTER_KEY is not configured');
    }

    // Call Ticketmaster API
    const tmResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&latlong=${lat},${lng}&radius=${radius}&unit=miles&size=20`
    );

    if (!tmResponse.ok) {
      const errorText = await tmResponse.text();
      throw new Error(`Ticketmaster API error: ${tmResponse.status} - ${errorText}`);
    }

    const tmData = await tmResponse.json();

    // Transform Ticketmaster events
    const events = tmData._embedded?.events?.map((event: any) => ({
      id: `ticketmaster-${event.id}`,
      title: event.name,
      description: event.description || event.info,
      date: event.dates.start.localDate,
      time: event.dates.start.localTime,
      location: event._embedded?.venues?.[0]?.name,
      category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
      image: event.images?.[0]?.url || '/placeholder.svg',
      coordinates: event._embedded?.venues?.[0]?.location ? [
        parseFloat(event._embedded.venues[0].location.longitude),
        parseFloat(event._embedded.venues[0].location.latitude)
      ] : undefined,
      venue: event._embedded?.venues?.[0]?.name,
      url: event.url,
      source: 'ticketmaster'
    })) || [];

    return new Response(
      JSON.stringify({ events }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in search-events function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        events: [] 
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
