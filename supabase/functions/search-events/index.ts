import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Define the Event interface matching the frontend type
interface Event {
  id: string;
  source?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  venue?: string;
  category: string;
  image: string;
  coordinates?: [number, number]; // [longitude, latitude]
  url?: string;
  price?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use the exact secret names as set in Supabase
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN');
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY');
    const TICKETMASTER_SECRET = Deno.env.get('TICKETMASTER_SECRET');
    const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
    // Try all possible Eventbrite token env var names (including typo variant)
    const EVENTBRITE_TOKEN =
      Deno.env.get('EVENTBRITE_TOKEN') ||
      Deno.env.get('EVENTBRITE_PRIVATE_TOKEN') ||
      Deno.env.get('EVENTBRITE_API_KEY') ||
      Deno.env.get('EVENTBRITE_CLIENT_SECRET') ||
      Deno.env.get('EVENTBRITE_PUBLIC_TOKEN') ||
      Deno.env.get('VENTBRITE_PUBLIC_TOKEN'); // typo variant
    // Debug: Log the presence of API keys (masking sensitive parts)
    console.log('[DEBUG] TICKETMASTER_KEY:', TICKETMASTER_KEY ? TICKETMASTER_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] SERPAPI_KEY:', SERPAPI_KEY ? SERPAPI_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] EVENTBRITE_TOKEN:', EVENTBRITE_TOKEN ? EVENTBRITE_TOKEN.slice(0,4) + '...' : 'NOT SET');

    if (!TICKETMASTER_KEY) {
      throw new Error('TICKETMASTER_KEY is not set')
    }

    // Parse request parameters
    const params = await req.json()
    const {
      keyword = '',
      lat,
      lng,
      latitude,
      longitude,
      location,
      radius = 10,
      startDate,
      endDate,
      categories = []
    } = params

    // Support both lat/lng and latitude/longitude parameter formats
    const userLat = latitude || lat
    const userLng = longitude || lng

    // Prepare results array
    let allEvents: Event[] = []
    // Track per-source stats
    let ticketmasterCount = 0, ticketmasterError: string | null = null
    let eventbriteCount = 0, eventbriteError: string | null = null
    let serpapiCount = 0, serpapiError: string | null = null

    // Fetch from Ticketmaster API
    try {
      // Fetch up to 1000 events from Ticketmaster using pagination (max size=200 per page)
      let ticketmasterEvents: any[] = [];
      let ticketmasterPage = 0;
      let ticketmasterTotalPages = 1;
      const ticketmasterMaxPages = 5; // 5*200=1000 events max
      while (ticketmasterPage < ticketmasterTotalPages && ticketmasterPage < ticketmasterMaxPages) {
        let ticketmasterUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&size=200&page=${ticketmasterPage}`;
        console.log('[DEBUG] Ticketmaster API URL:', ticketmasterUrl);

      // Add location parameters
      if (userLat && userLng) {
        ticketmasterUrl += `&latlong=${userLat},${userLng}&radius=${radius}&unit=miles`
      } else if (location) {
        ticketmasterUrl += `&city=${encodeURIComponent(location)}`
      }

      // Add date range
      if (startDate) {
        ticketmasterUrl += `&startDateTime=${startDate}T00:00:00Z`
      }
      if (endDate) {
        ticketmasterUrl += `&endDateTime=${endDate}T23:59:59Z`
      }

      // Add keyword
      if (keyword) {
        ticketmasterUrl += `&keyword=${encodeURIComponent(keyword)}`
      }

      // Add categories
      if (categories.length > 0) {
        // Map our categories to Ticketmaster's segmentId
        const categoryMap = {
          'music': 'KZFzniwnSyZfZ7v7nJ',
          'sports': 'KZFzniwnSyZfZ7v7nE',
          'arts': 'KZFzniwnSyZfZ7v7na',
          'family': 'KZFzniwnSyZfZ7v7n1',
          'food': 'KZFzniwnSyZfZ7v7l1'
        }

        const segmentIds = categories
          .map(cat => categoryMap[cat])
          .filter(Boolean)

        if (segmentIds.length > 0) {
          ticketmasterUrl += `&segmentId=${segmentIds.join(',')}`
        }
      }

        const response = await fetch(ticketmasterUrl)
        const data = await response.json()
        console.log('[DEBUG] Ticketmaster API response:', {
          page: data.page,
          eventsCount: data._embedded?.events?.length || 0,
          error: data.errors || null
        });
        if (data._embedded?.events) {
          ticketmasterEvents = [...ticketmasterEvents, ...data._embedded.events];
        }
        // Update totalPages from API response
        if (data.page?.totalPages) {
          ticketmasterTotalPages = data.page.totalPages;
        }
        ticketmasterPage++;
      }

      // Transform Ticketmaster events
      const ticketmasterEventsNormalized = ticketmasterEvents.map(event => {
        let coordinates: [number, number] | undefined = undefined;
        const venue = event._embedded?.venues?.[0];
        if (venue?.location?.longitude && venue?.location?.latitude) {
          const lon = parseFloat(venue.location.longitude);
          const lat = parseFloat(venue.location.latitude);
          if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
            coordinates = [lon, lat];
          }
        }
        return {
          id: `ticketmaster-${event.id}`,
          source: 'ticketmaster',
          title: event.name,
          description: event.description || event.info || '',
          date: event.dates.start.localDate,
          time: event.dates.start.localTime,
          location: venue?.name || '',
          venue: venue?.name,
          category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
          image: event.images?.[0]?.url || '/placeholder.svg',
          coordinates,
          url: event.url,
          price: event.priceRanges ?
            `${event.priceRanges[0].min} - ${event.priceRanges[0].max} ${event.priceRanges[0].currency}` :
            undefined
        };
      }) || [];

      allEvents = [...allEvents, ...ticketmasterEventsNormalized]
      ticketmasterCount = ticketmasterEventsNormalized.length
    } catch (err) {
      ticketmasterError = err instanceof Error ? err.message : String(err)
      console.error('Ticketmaster API error:', ticketmasterError)
    }

    // Fetch from Eventbrite API
    try {
      // Try multiple possible Eventbrite token environment variables
      const EVENTBRITE_TOKEN = Deno.env.get('EVENTBRITE_TOKEN') ||
                              Deno.env.get('EVENTBRITE_PRIVATE_TOKEN') ||
                              Deno.env.get('VITE_EVENTBRITE_TOKEN') ||
                              Deno.env.get('VITE_EVENTBRITE_PRIVATE_TOKEN');

      const EVENTBRITE_API_KEY = Deno.env.get('EVENTBRITE_API_KEY') ||
                               Deno.env.get('VITE_EVENTBRITE_API_KEY');

      console.log('[DEBUG] Eventbrite tokens available:', {
        EVENTBRITE_TOKEN: !!EVENTBRITE_TOKEN,
        EVENTBRITE_API_KEY: !!EVENTBRITE_API_KEY
      });

      if (!EVENTBRITE_TOKEN && !EVENTBRITE_API_KEY) {
        console.log('[DEBUG] No Eventbrite tokens available');
        throw new Error('No Eventbrite tokens available');
      }

      // Prefer the token over the API key
      const authToken = EVENTBRITE_TOKEN || EVENTBRITE_API_KEY;
      let eventbriteUrl = `https://www.eventbriteapi.com/v3/events/search/?token=${authToken}&expand=venue`
      if (userLat && userLng) {
        eventbriteUrl += `&location.latitude=${userLat}&location.longitude=${userLng}&location.within=${radius}mi`
      } else if (location) {
        eventbriteUrl += `&location.address=${encodeURIComponent(location)}`
      }
      if (keyword) eventbriteUrl += `&q=${encodeURIComponent(keyword)}`
      if (startDate) eventbriteUrl += `&start_date.range_start=${startDate}T00:00:00Z`
      if (endDate) eventbriteUrl += `&start_date.range_end=${endDate}T23:59:59Z`
      // Note: Eventbrite category mapping can be added here if needed

      // Fetch up to 500 events from Eventbrite using pagination (max page_size=50)
      let eventbriteEvents: any[] = [];
      let ebPage = 1;
      const ebPageSize = 50;
      let ebTotalPages = 1;
      const ebMaxPages = 10; // 10*50=500 events max
      do {
        let pagedUrl = eventbriteUrl + `&page=${ebPage}&page_size=${ebPageSize}`;
        console.log('[DEBUG] Eventbrite API URL:', pagedUrl);
        const ebResp = await fetch(pagedUrl)
        const ebData = await ebResp.json()
        console.log('[DEBUG] Eventbrite API response:', {
          pagination: ebData.pagination,
          eventsCount: ebData.events?.length || 0,
          error: ebData.error || null
        });
        if (ebData.events && Array.isArray(ebData.events)) {
          eventbriteEvents = [...eventbriteEvents, ...ebData.events];
        }
        if (ebData.pagination?.page_count) {
          ebTotalPages = ebData.pagination.page_count;
        }
        ebPage++;
      } while (ebPage <= ebTotalPages && ebPage <= ebMaxPages);

      // Robust Eventbrite normalization
      function mapEventbriteCategory(categoryId) {
        const mapping = {
          '103': 'music',
          '101': 'business',
          '110': 'food',
          '105': 'arts',
          '104': 'film',
          '108': 'sports',
          '107': 'health',
          '102': 'science',
          '109': 'travel',
          '111': 'charity',
          '113': 'spirituality',
          '114': 'family',
          '115': 'holiday',
          '116': 'government',
          '112': 'fashion',
          '106': 'hobbies',
          '117': 'home',
          '118': 'auto',
          '119': 'school',
          '199': 'other',
        };
        return mapping[categoryId] || 'event';
      }

      function normalizeEventbriteEvent(event) {
        try {
          if (!event.id || !event.name?.text || !event.start?.local) return null;
          // Coordinates
          let coordinates: [number, number] | undefined = undefined;
          if (event.venue?.longitude && event.venue?.latitude) {
            const lon = parseFloat(event.venue.longitude);
            const lat = parseFloat(event.venue.latitude);
            if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
              coordinates = [lon, lat];
            }
          }
          // Price
          let price: string | undefined = undefined;
          if (event.is_free) {
            price = 'Free';
          } else if (event.ticket_classes && Array.isArray(event.ticket_classes) && event.ticket_classes.length > 0) {
            const paid = event.ticket_classes.find(tc => tc.free === false && tc.cost);
            if (paid && paid.cost) price = `${paid.cost.display}`;
          }
          // Image
          const image = event.logo?.original?.url || event.logo?.url || '/placeholder.svg';
          // Category
          const category = event.category_id ? mapEventbriteCategory(event.category_id) : 'event';
          // Date/time
          const [date, time] = event.start.local.split('T');
          return {
            id: `eventbrite-${event.id}`,
            source: 'eventbrite',
            title: event.name.text,
            description: event.description?.text || '',
            date: date,
            time: time?.substring(0, 5) || 'N/A',
            location: event.venue?.address?.localized_address_display || event.venue?.name || 'Online or TBD',
            venue: event.venue?.name,
            category,
            image,
            coordinates,
            url: event.url,
            price,
          };
        } catch (error) {
          return null;
        }
      }

      const eventbriteEventsNormalized = eventbriteEvents.map(normalizeEventbriteEvent).filter(e => e !== null) || [];
      allEvents = [...allEvents, ...eventbriteEventsNormalized];
      eventbriteCount = eventbriteEventsNormalized.length;
    } catch (err) {
      eventbriteError = err instanceof Error ? err.message : String(err)
      console.error('Eventbrite API error:', eventbriteError)
    }

    // Fetch from SerpAPI if key is available
    if (SERPAPI_KEY && (keyword || location)) {
      try {
        console.log('[DEBUG] Using SERPAPI_KEY:', SERPAPI_KEY ? SERPAPI_KEY.slice(0,4) + '...' : 'NOT SET');
        let serpQuery = keyword || '' // Start with keyword or empty string
        let serpBaseUrl = `https://serpapi.com/search.json?engine=google_events&api_key=${SERPAPI_KEY}&hl=en&gl=us`

        // Add categories to the query if provided
        if (categories && categories.length > 0) {
          serpQuery += (serpQuery ? ' ' : '') + categories.join(' ') + ' events' // Append categories and "events"
        } else if (!keyword) {
           serpQuery = 'events' // Default to "events" if no keyword and no categories
        }


        // Prioritize lat/lng for location if available
        if (userLat && userLng) {
          serpBaseUrl += `&ll=@${userLat},${userLng},11z` // Use ll parameter with coordinates and zoom level 11z
          // Optionally add location string for context if available
          if (location) {
             serpQuery += ` near ${location}` // Add location context
          }
        } else if (location) {
          // Fallback to location string if no coordinates
          serpQuery += ` in ${location}` // Add location context
        }

        // Add the final query to the URL
        serpBaseUrl += `&q=${encodeURIComponent(serpQuery.trim())}` // Trim potential leading/trailing spaces

        // Paginate SerpApi results (up to 100 events, 10 pages)
        let serpEvents: any[] = [];
        let serpStart = 0;
        const serpPageSize = 10;
        const serpMaxPages = 10;
        let serpHasMore = true;
        let serpApiWorked = false;
        let serpApiLastError = null;
        for (let serpPage = 0; serpPage < serpMaxPages && serpHasMore; serpPage++) {
          let pagedSerpUrl = serpBaseUrl + `&start=${serpStart}`;
          if (location) pagedSerpUrl += `&location=${encodeURIComponent(location)}`;
          console.log('[DEBUG] SerpApi URL:', pagedSerpUrl);
          try {
            const response = await fetch(pagedSerpUrl);
            const data = await response.json();
            console.log('[DEBUG] SerpApi raw response:', JSON.stringify(data).slice(0, 1000));
            console.log('[DEBUG] SerpApi response:', {
              eventsCount: data.events_results?.length || 0,
              error: data.error || null,
              message: data.message || null
            });
            if (data.events_results && Array.isArray(data.events_results) && data.events_results.length > 0) {
              serpEvents = [...serpEvents, ...data.events_results];
              serpStart += serpPageSize;
              serpApiWorked = true;
            } else {
              serpHasMore = false;
              if (data.error || data.message) {
                serpApiLastError = data;
              }
            }
          } catch (err) {
            serpHasMore = false;
            serpApiLastError = err && err.message ? err.message : err;
            console.log('[DEBUG][SerpApi] Fetch error:', serpApiLastError);
          }
        }
        if (!serpApiWorked) {
          console.log('[DEBUG] SerpApi integration is NOT WORKING');
          if (serpApiLastError) {
            console.log('[DEBUG][SerpApi] Last error or message:', JSON.stringify(serpApiLastError, null, 2));
          }
        }

        // Transform SerpAPI events
        const serpEventsNormalized = serpEvents.map(event => {
          // SerpApi does not provide coordinates; geocoding could be added here in the future
          const coordinates: [number, number] | undefined = undefined;

          // Robust fallback/defaults for all fields
          const id = event.title ? `serpapi-${btoa(event.title).slice(0, 10)}` : `serpapi-${Date.now()}`;
          const title = event.title || 'Untitled Event';
          const date = event.date?.start_date || '';
          const time = event.date?.when?.split(' ').pop() || '';
          const location = Array.isArray(event.address) ? event.address.join(', ') : (event.address || '');
          const venue = event.venue?.name || '';
          const image = event.thumbnail || '/placeholder.svg';
          const url = event.link || '';
          const price = event.ticket_info?.[0]?.price || undefined;
          const description = event.description || '';
          const category = 'event';

          return {
            id,
            source: 'serpapi',
            title,
            description,
            date,
            time,
            location,
            venue,
            category,
            image,
            coordinates,
            url,
            price
          };
        }) || [];

        allEvents = [...allEvents, ...serpEventsNormalized]
        serpapiCount = serpEventsNormalized.length
      } catch (err) {
        serpapiError = err instanceof Error ? err.message : String(err)
        console.error('SerpAPI error:', serpapiError)
      }
    }

    // Deduplicate events based on title and date
    const uniqueEvents: Event[] = []
    const eventKeys = new Set()

    for (const event of allEvents) {
      const key = `${event.title}-${event.date}`
      if (!eventKeys.has(key)) {
        eventKeys.add(key)
        uniqueEvents.push(event)
      }
    }

    return new Response(JSON.stringify({
      events: uniqueEvents,
      sourceStats: {
        ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
        eventbrite: { count: eventbriteCount, error: eventbriteError },
        serpapi: { count: serpapiCount, error: serpapiError }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
