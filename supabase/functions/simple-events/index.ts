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
    // Get API key from environment variables
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY') || 'DpUgXkAg7KMNGmB9GsUjt5hIeUCJ7X5f';

    // Parse request body
    let params: any = {};
    try {
      if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
        const body = await req.text();
        if (body && body.trim().length > 0) {
          params = JSON.parse(body);
        }
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
    }

    // Set default parameters if not provided
    const location = params.location || 'New York';
    const radius = params.radius || 10;
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const endDate = params.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const keyword = params.keyword || '';
    const categories = params.categories || ['music', 'sports', 'arts', 'family', 'food'];

    console.log('Fetching events with params:', {
      location,
      radius,
      startDate,
      endDate,
      keyword,
      categories
    });

    // Build the Ticketmaster API URL
    let url = 'https://app.ticketmaster.com/discovery/v2/events.json?';

    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add API key
    queryParams.append('apikey', TICKETMASTER_KEY);

    // Add location parameter
    if (location) {
      queryParams.append('city', location);
    }

    // Add radius parameter
    queryParams.append('radius', radius.toString());
    queryParams.append('unit', 'miles');

    // Add date range parameters
    if (startDate) {
      queryParams.append('startDateTime', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      queryParams.append('endDateTime', `${endDate}T23:59:59Z`);
    }

    // Add keyword parameter
    if (keyword) {
      queryParams.append('keyword', keyword);
    }

    // Add category parameter
    if (categories && categories.includes('music')) {
      queryParams.append('segmentName', 'Music');
    } else if (categories && categories.includes('sports')) {
      queryParams.append('segmentName', 'Sports');
    } else if (categories && categories.includes('arts')) {
      queryParams.append('segmentName', 'Arts & Theatre');
    } else if (categories && categories.includes('family')) {
      queryParams.append('segmentName', 'Family');
    }

    // Add size parameter
    queryParams.append('size', '100');

    // Add sort parameter - sort by date
    queryParams.append('sort', 'date,asc');

    // Append query parameters to URL
    url += queryParams.toString();

    console.log('Ticketmaster API URL:', url);

    // Make the API request
    const response = await fetch(url);

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ticketmaster API error:', response.status, errorText);
      return safeResponse({
        events: [],
        error: `Ticketmaster API error: ${response.status} ${errorText}`,
        status: response.status
      });
    }

    // Parse the response
    const data = await response.json();
    console.log('Ticketmaster API response:', {
      page: data.page,
      totalElements: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
      size: data.page?.size || 0,
      number: data.page?.number || 0,
      hasEvents: !!data._embedded?.events
    });

    // Check if events were returned
    if (!data._embedded?.events) {
      console.log('No events found');
      return safeResponse({
        events: [],
        error: null,
        status: 200,
        message: 'No events found'
      });
    }

    // Transform Ticketmaster events to our Event format
    const events = data._embedded.events.map((event: any) => {
      // Extract venue information
      const venue = event._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const venueCity = venue?.city?.name || '';
      const venueState = venue?.state?.stateCode || '';
      const venueCountry = venue?.country?.countryCode || '';
      const venueAddress = venue?.address?.line1 || '';

      // Build location string
      let locationStr = venueName;
      if (venueCity) {
        locationStr += locationStr ? `, ${venueCity}` : venueCity;
      }
      if (venueState) {
        locationStr += locationStr ? `, ${venueState}` : venueState;
      }
      if (venueCountry && venueCountry !== 'US') {
        locationStr += locationStr ? `, ${venueCountry}` : venueCountry;
      }

      // Extract coordinates
      let coordinates: [number, number] | undefined = undefined;
      if (venue?.location?.longitude && venue?.location?.latitude) {
        coordinates = [
          parseFloat(venue.location.longitude),
          parseFloat(venue.location.latitude)
        ];
      }

      // Extract price information
      let price: string | undefined = undefined;
      if (event.priceRanges && event.priceRanges.length > 0) {
        const priceRange = event.priceRanges[0];
        price = `${priceRange.min} - ${priceRange.max} ${priceRange.currency}`;
      }

      // Extract category information
      const category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';

      // Extract image
      const image = event.images && event.images.length > 0
        ? event.images.find((img: any) => img.ratio === '16_9' && img.width > 500)?.url || event.images[0].url
        : '';

      // Extract date and time
      const date = event.dates?.start?.localDate || '';
      const time = event.dates?.start?.localTime || '';

      return {
        id: `ticketmaster-${event.id}`,
        source: 'ticketmaster',
        title: event.name,
        description: event.description || event.info || '',
        date,
        time,
        location: locationStr,
        venue: venueName,
        category,
        image,
        coordinates,
        url: event.url,
        price
      };
    });

    console.log(`Transformed ${events.length} events`);

    return safeResponse({
      events,
      error: null,
      status: 200,
      meta: {
        totalEvents: events.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return safeResponse({
      events: [],
      error: error instanceof Error ? error.message : String(error),
      status: 500
    }, 500);
  }
});
