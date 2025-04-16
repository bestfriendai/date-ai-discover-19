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
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY')
    const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY')

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
      let ticketmasterUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&size=20`

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

      // Transform Ticketmaster events
      const ticketmasterEvents = data._embedded?.events?.map(event => {
        let coordinates: [number, number] | undefined = undefined;
        const venue = event._embedded?.venues?.[0];
        if (venue?.location?.longitude && venue?.location?.latitude) {
          const lon = parseFloat(venue.location.longitude);
          const lat = parseFloat(venue.location.latitude);
          if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
            coordinates = [lon, lat];
          } else {
            // Optionally log invalid coordinates
            // console.warn(`Invalid coordinates for Ticketmaster event ${event.id}:`, venue.location.longitude, venue.location.latitude);
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

      allEvents = [...allEvents, ...ticketmasterEvents]
      ticketmasterCount = ticketmasterEvents.length
    } catch (err) {
      ticketmasterError = err instanceof Error ? err.message : String(err)
      console.error('Ticketmaster API error:', ticketmasterError)
    }

    // Fetch from Eventbrite API
    try {
      const EVENTBRITE_TOKEN = Deno.env.get('EVENTBRITE_TOKEN')
      if (!EVENTBRITE_TOKEN) throw new Error('EVENTBRITE_TOKEN is not set')
      let eventbriteUrl = `https://www.eventbriteapi.com/v3/events/search/?token=${EVENTBRITE_TOKEN}&expand=venue`
      if (userLat && userLng) {
        eventbriteUrl += `&location.latitude=${userLat}&location.longitude=${userLng}&location.within=${radius}mi`
      } else if (location) {
        eventbriteUrl += `&location.address=${encodeURIComponent(location)}`
      }
      if (keyword) eventbriteUrl += `&q=${encodeURIComponent(keyword)}`
      if (startDate) eventbriteUrl += `&start_date.range_start=${startDate}T00:00:00Z`
      if (endDate) eventbriteUrl += `&start_date.range_end=${endDate}T23:59:59Z`
      // Note: Eventbrite category mapping can be added here if needed

      const ebResp = await fetch(eventbriteUrl)
      const ebData = await ebResp.json()
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

      const eventbriteEvents = ebData.events?.map(normalizeEventbriteEvent).filter(e => e !== null) || [];
      allEvents = [...allEvents, ...eventbriteEvents];
      eventbriteCount = eventbriteEvents.length;
    } catch (err) {
      eventbriteError = err instanceof Error ? err.message : String(err)
      console.error('Eventbrite API error:', eventbriteError)
    }

    // Fetch from SerpAPI if key is available
    if (SERPAPI_KEY && (keyword || location)) {
      try {
        let serpQuery = keyword || '' // Start with keyword or empty string
        let serpUrl = `https://serpapi.com/search.json?engine=google_events&api_key=${SERPAPI_KEY}`

        // Add categories to the query if provided
        if (categories && categories.length > 0) {
          serpQuery += (serpQuery ? ' ' : '') + categories.join(' ') + ' events' // Append categories and "events"
        } else if (!keyword) {
           serpQuery = 'events' // Default to "events" if no keyword and no categories
        }


        // Prioritize lat/lng for location if available
        if (userLat && userLng) {
          serpUrl += `&ll=@${userLat},${userLng},11z` // Use ll parameter with coordinates and zoom level 11z
          // Optionally add location string for context if available
          if (location) {
             serpQuery += ` near ${location}` // Add location context
          }
        } else if (location) {
          // Fallback to location string if no coordinates
          serpQuery += ` in ${location}` // Add location context
        }

        // Add the final query to the URL
        serpUrl += `&q=${encodeURIComponent(serpQuery.trim())}` // Trim potential leading/trailing spaces

        const response = await fetch(serpUrl)
        const data = await response.json()

        // Transform SerpAPI events
        const serpEvents = data.events_results?.map(event => {
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

        allEvents = [...allEvents, ...serpEvents]
        serpapiCount = serpEvents.length
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
