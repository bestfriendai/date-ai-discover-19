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
      const ticketmasterEvents = data._embedded?.events?.map(event => ({
        id: `ticketmaster-${event.id}`,
        source: 'ticketmaster',
        title: event.name,
        description: event.description || event.info || '',
        date: event.dates.start.localDate,
        time: event.dates.start.localTime,
        location: event._embedded?.venues?.[0]?.name || '',
        venue: event._embedded?.venues?.[0]?.name,
        category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
        image: event.images?.[0]?.url || '/placeholder.svg',
        coordinates: event._embedded?.venues?.[0]?.location ? [
          parseFloat(event._embedded?.venues?.[0]?.location?.longitude),
          parseFloat(event._embedded?.venues?.[0]?.location?.latitude)
        ] : undefined,
        url: event.url,
        price: event.priceRanges ?
          `${event.priceRanges[0].min} - ${event.priceRanges[0].max} ${event.priceRanges[0].currency}` :
          undefined
      })) || []

      allEvents = [...allEvents, ...ticketmasterEvents]
    } catch (ticketmasterError) {
      console.error('Ticketmaster API error:', ticketmasterError)
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
          // Extract coordinates (would need geocoding in real implementation)
          const coordinates = undefined

          return {
            id: `serpapi-${btoa(event.title).slice(0, 10)}`,
            source: 'serpapi',
            title: event.title,
            description: event.description || '',
            date: event.date?.start_date || '',
            time: event.date?.when?.split(' ').pop() || '',
            location: event.address?.join(', ') || '',
            venue: event.venue?.name,
            category: 'event', // SerpAPI doesn't provide clear categories
            image: event.thumbnail || '/placeholder.svg',
            coordinates,
            url: event.link,
            price: event.ticket_info?.[0]?.price || undefined
          }
        }) || []

        allEvents = [...allEvents, ...serpEvents]
      } catch (serpError) {
        console.error('SerpAPI error:', serpError)
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

    return new Response(JSON.stringify({ events: uniqueEvents }), {
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
