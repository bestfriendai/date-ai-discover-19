
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Event, SearchEventsResponse } from "../search-events/types.ts";

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Request received');

    // Parse the request body
    let params;
    try {
      if (req.body) {
        const bodyText = new TextDecoder().decode(await req.arrayBuffer());
        console.log('Request body:', bodyText);
        if (bodyText && bodyText.trim()) {
          params = JSON.parse(bodyText);
        } else {
          params = {};
        }
      } else {
        params = {};
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', details: e.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Parsed params:', params);

    const startTime = Date.now();
    const searchParams = {
      keyword: params.keyword || '',
      latitude: params.lat || params.latitude,
      longitude: params.lng || params.longitude,
      radius: params.radius || 30,
      location: params.location || 'New York',
      startDate: params.startDate || new Date().toISOString().split('T')[0],
      endDate: params.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      categories: params.categories || [],
      limit: params.limit || 100,
      predicthqLocation: params.predicthqLocation || ''
    };

    // Get API keys from environment variables
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY') || 'DpUgXkAg7KMNGmB9GsUjt5hIeUCJ7X5f';
    const PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY') || '';

    console.log('API Keys available:', {
      TICKETMASTER_KEY_SET: !!TICKETMASTER_KEY,
      PREDICTHQ_API_KEY_SET: !!PREDICTHQ_API_KEY
    });

    // Fetch events from Ticketmaster
    const ticketmasterEvents = await fetchTicketmasterEvents(TICKETMASTER_KEY, searchParams);
    console.log(`Fetched ${ticketmasterEvents.length} events from Ticketmaster`);

    // Fetch events from PredictHQ if API key is available
    let predicthqEvents: Event[] = [];
    let predicthqError: string | null = null;

    if (PREDICTHQ_API_KEY) {
      try {
        predicthqEvents = await fetchPredictHQEvents(PREDICTHQ_API_KEY, searchParams);
        console.log(`Fetched ${predicthqEvents.length} events from PredictHQ`);
      } catch (error) {
        predicthqError = error instanceof Error ? error.message : String(error);
        console.error('Error fetching PredictHQ events:', predicthqError);
      }
    } else {
      predicthqError = 'PredictHQ API key not configured';
    }

    // Combine events from both sources
    const allEvents = [...ticketmasterEvents, ...predicthqEvents];

    // Remove duplicates (if any events appear in both sources)
    const uniqueEvents = removeDuplicateEvents(allEvents);

    // Sort events by date
    uniqueEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Limit the number of events
    const limitedEvents = uniqueEvents.slice(0, searchParams.limit);

    const response: SearchEventsResponse = {
      events: limitedEvents,
      sourceStats: {
        ticketmaster: { count: ticketmasterEvents.length, error: null },
        eventbrite: { count: 0, error: null },
        serpapi: { count: 0, error: null },
        predicthq: { count: predicthqEvents.length, error: predicthqError }
      },
      meta: {
        executionTime: Date.now() - startTime,
        totalEvents: limitedEvents.length,
        eventsWithCoordinates: limitedEvents.filter(e => e.coordinates).length,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: 'Service error' },
          eventbrite: { count: 0, error: 'Service error' },
          serpapi: { count: 0, error: 'Service error' },
          predicthq: { count: 0, error: 'Service error' }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Function to fetch events from Ticketmaster
async function fetchTicketmasterEvents(apiKey: string, params: any): Promise<Event[]> {
  // Build the Ticketmaster API URL
  let url = 'https://app.ticketmaster.com/discovery/v2/events.json?';

  // Build query parameters
  const queryParams = new URLSearchParams();

  // Add API key
  queryParams.append('apikey', apiKey);

  // Add location parameter
  if (params.location) {
    queryParams.append('city', params.location);
  }

  // Add radius parameter
  queryParams.append('radius', params.radius.toString());
  queryParams.append('unit', 'miles');

  // Add date range parameters
  if (params.startDate) {
    queryParams.append('startDateTime', `${params.startDate}T00:00:00Z`);
  }
  if (params.endDate) {
    queryParams.append('endDateTime', `${params.endDate}T23:59:59Z`);
  }

  // Add keyword parameter
  if (params.keyword) {
    queryParams.append('keyword', params.keyword);
  }

  // Add category parameter
  const categoryMapping: Record<string, string> = {
    'music': 'Music',
    'sports': 'Sports',
    'arts': 'Arts & Theatre',
    'family': 'Family',
    'food': 'Miscellaneous',
    'party': 'Music', // Map party to Music since Ticketmaster doesn't have a party category
    'conference': 'Miscellaneous',
    'community': 'Miscellaneous'
  };

  // Check if we have any categories that map to Ticketmaster segments
  if (params.categories && params.categories.length > 0) {
    // Find the first matching category
    for (const category of params.categories) {
      if (categoryMapping[category]) {
        queryParams.append('segmentName', categoryMapping[category]);
        break; // Ticketmaster only supports one segment at a time
      }
    }

    // If searching for parties, add party-related keywords
    if (params.categories.includes('party')) {
      const partyKeyword = params.keyword
        ? `${params.keyword} OR party OR club OR nightlife OR dance`
        : 'party OR club OR nightlife OR dance OR dj OR festival';
      queryParams.append('keyword', partyKeyword);
    }
  }

  // Add size parameter
  queryParams.append('size', params.limit.toString());

  // Add sort parameter - sort by date
  queryParams.append('sort', 'date,asc');

  // Append query parameters to URL
  url += queryParams.toString();

  console.log('Ticketmaster API URL:', url);

  // Make the API request with timeout and error handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('Ticketmaster API call timed out after 10 seconds');
  }, 10000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ticketmaster API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Check if events were returned
    if (!data._embedded?.events) {
      return [];
    }

    // Transform Ticketmaster events to our Event format
    return data._embedded.events.map((event: any) => {
      try {
        // Extract venue information
        const venue = event._embedded?.venues?.[0];
        const venueName = venue?.name || '';
        const venueCity = venue?.city?.name || '';
        const venueState = venue?.state?.stateCode || '';
        const venueCountry = venue?.country?.countryCode || '';

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
        let category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';

        // Map Ticketmaster categories to our standard categories
        if (category === 'music') {
          // Check if it's a party event
          const name = event.name?.toLowerCase() || '';
          const desc = event.description?.toLowerCase() || event.info?.toLowerCase() || '';
          const isParty = ['party', 'club', 'nightlife', 'dance', 'dj'].some(term =>
            name.includes(term) || desc.includes(term)
          );

          if (isParty) {
            category = 'party';
          }
        } else if (category === 'arts & theatre' || category === 'arts' || category === 'theatre') {
          category = 'arts';
        }

        // Extract image
        let image = '';
        if (event.images && event.images.length > 0) {
          // Try to find a high-quality 16:9 image first
          const highQualityImage = event.images.find((img: any) =>
            img.ratio === '16_9' && img.width >= 640
          );

          // If not found, try any 16:9 image
          const anyWideImage = event.images.find((img: any) =>
            img.ratio === '16_9'
          );

          // If still not found, use the first image
          image = highQualityImage?.url || anyWideImage?.url || event.images[0].url;
        }

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
      } catch (error) {
        console.error('Error transforming Ticketmaster event:', error);
        // Return a minimal valid event in case of error
        return {
          id: `ticketmaster-error-${event?.id || Date.now()}`,
          source: 'ticketmaster',
          title: event?.name || 'Unknown Event',
          description: 'Error processing event details',
          date: event?.dates?.start?.localDate || new Date().toISOString().split('T')[0],
          time: event?.dates?.start?.localTime || '00:00',
          location: 'Location unavailable',
          category: 'other',
          image: ''
        };
      }
    });
  } catch (error) {
    console.error('Error fetching Ticketmaster events:', error);
    throw error;
  }
}

// Function to fetch events from PredictHQ
async function fetchPredictHQEvents(apiKey: string, params: any): Promise<Event[]> {
  // Build the PredictHQ API URL
  const baseUrl = 'https://api.predicthq.com/v1/events/';

  // Build query parameters
  const queryParams = new URLSearchParams();

  // Add location parameter
  if (params.latitude && params.longitude) {
    queryParams.append('location.origin', `${params.latitude},${params.longitude}`);
    queryParams.append('location.radius', `${params.radius}km`);
  } else if (params.location) {
    queryParams.append('location.place', params.location);
  }

  // Add date range parameters
  if (params.startDate) {
    queryParams.append('start.gte', params.startDate);
  }
  if (params.endDate) {
    queryParams.append('start.lte', params.endDate);
  }

  // Add keyword parameter
  if (params.keyword) {
    queryParams.append('q', params.keyword);
  }

  // Add category parameter
  const categoryMapping: Record<string, string[]> = {
    'music': ['concerts', 'festivals'],
    'sports': ['sports'],
    'arts': ['performing-arts', 'community', 'expos'],
    'family': ['community', 'expos'],
    'food': ['food-drink'],
    'party': ['concerts', 'festivals']
  };

  const categories: string[] = [];
  if (params.categories && params.categories.length > 0) {
    params.categories.forEach((category: string) => {
      if (categoryMapping[category]) {
        categories.push(...categoryMapping[category]);
      }
    });
  }

  if (categories.length > 0) {
    queryParams.append('category', categories.join(','));
  }

  // Add limit parameter
  queryParams.append('limit', params.limit.toString());

  // Add sort parameter - sort by date
  queryParams.append('sort', 'start');

  // Append query parameters to URL
  const url = `${baseUrl}?${queryParams.toString()}`;

  console.log('PredictHQ API URL:', url);

  // Make the API request with timeout and error handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('PredictHQ API call timed out after 10 seconds');
  }, 10000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PredictHQ API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Check if events were returned
    if (!data.results) {
      return [];
    }

    // Transform PredictHQ events to our Event format
    return data.results.map((event: any) => {
      try {
        // Map PredictHQ categories to our standard categories
        let category = 'event';
        if (event.category === 'concerts' || event.category === 'festivals') {
          category = 'music';
          // Check if it's a party event
          const title = event.title?.toLowerCase() || '';
          const description = event.description?.toLowerCase() || '';
          const isParty = ['party', 'club', 'nightlife', 'dance', 'dj'].some(term =>
            title.includes(term) || description.includes(term)
          );

          if (isParty) {
            category = 'party';
          }
        } else if (event.category === 'sports') {
          category = 'sports';
        } else if (event.category === 'performing-arts') {
          category = 'arts';
        } else if (event.category === 'community' || event.category === 'expos') {
          category = 'family';
        } else if (event.category === 'food-drink') {
          category = 'food';
        }

        // Extract date and time
        const startDate = new Date(event.start);
        const date = startDate.toISOString().split('T')[0];
        const time = startDate.toISOString().split('T')[1].substring(0, 5);

        // Extract location
        let location = event.location_name || event.place_hierarchies?.[0]?.join(', ') || '';
        if (!location && event.country) {
          location = event.country;
        }

        // Extract coordinates
        let coordinates: [number, number] | undefined = undefined;
        if (event.geo) {
          coordinates = [event.geo.lon, event.geo.lat];
        }

        return {
          id: `predicthq-${event.id}`,
          source: 'predicthq',
          title: event.title,
          description: event.description || '',
          date,
          time,
          location,
          venue: event.location_name || '',
          category,
          image: '', // PredictHQ doesn't provide images
          coordinates,
          url: '',
          rank: event.rank,
          localRelevance: event.local_rank,
          attendance: {
            forecast: event.predicted_attendance
          },
          demandSurge: event.demand_surge ? 1 : 0
        };
      } catch (error) {
        console.error('Error transforming PredictHQ event:', error);
        // Return a minimal valid event in case of error
        return {
          id: `predicthq-error-${event?.id || Date.now()}`,
          source: 'predicthq',
          title: event?.title || 'Unknown Event',
          description: event?.description || 'Error processing event details',
          date: event?.start ? new Date(event.start).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          time: event?.start ? new Date(event.start).toISOString().split('T')[1].substring(0, 5) : '00:00',
          location: event?.location_name || 'Location unavailable',
          category: 'other',
          image: ''
        };
      }
    });
  } catch (error) {
    console.error('Error fetching PredictHQ events:', error);
    throw error;
  }
}

// Function to remove duplicate events
function removeDuplicateEvents(events: Event[]): Event[] {
  const uniqueEvents: Event[] = [];
  const seenTitles = new Set<string>();

  for (const event of events) {
    // Create a unique key based on title and date
    const key = `${event.title.toLowerCase()}-${event.date}`;

    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueEvents.push(event);
    }
  }

  return uniqueEvents;
}
