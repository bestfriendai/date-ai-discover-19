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

// Utility: Convert 24-hour time (e.g., '14:30') to 12-hour format with AM/PM
function to12Hour(time24: string): string {
  if (!time24 || typeof time24 !== 'string') return '';
  const [h, m] = time24.split(':');
  let hour = parseInt(h, 10);
  if (isNaN(hour)) return time24;
  const minute = m && m.length > 0 ? m.padStart(2, '0') : '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}
// Helper: Reverse geocode lat/lng to city name using Mapbox
async function reverseGeocodeCity(lat: number, lng: number, mapboxToken: string): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].text;
    }
    return null;
  } catch (err) {
    console.error('[ReverseGeocode] Error:', err);
    return null;
  }
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
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

    // Get Eventbrite tokens - check all possible env var names
    const EVENTBRITE_TOKEN = Deno.env.get('EVENTBRITE_TOKEN') || Deno.env.get('EVENTBRITE_PRIVATE_TOKEN');
    const EVENTBRITE_API_KEY = Deno.env.get('EVENTBRITE_API_KEY');
    const EVENTBRITE_CLIENT_SECRET = Deno.env.get('EVENTBRITE_CLIENT_SECRET');
    const EVENTBRITE_PUBLIC_TOKEN = Deno.env.get('EVENTBRITE_PUBLIC_TOKEN');

    // Debug: Log the presence of API keys (masking sensitive parts)
    console.log('[DEBUG] TICKETMASTER_KEY:', TICKETMASTER_KEY ? TICKETMASTER_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] SERPAPI_KEY:', SERPAPI_KEY ? SERPAPI_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] EVENTBRITE_TOKEN:', EVENTBRITE_TOKEN ? EVENTBRITE_TOKEN.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] EVENTBRITE_API_KEY:', EVENTBRITE_API_KEY ? EVENTBRITE_API_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] EVENTBRITE_PUBLIC_TOKEN:', EVENTBRITE_PUBLIC_TOKEN ? EVENTBRITE_PUBLIC_TOKEN.slice(0,4) + '...' : 'NOT SET');

    // Debug Eventbrite tokens availability
    console.log('[DEBUG] Eventbrite tokens available:', {
      EVENTBRITE_TOKEN: !!EVENTBRITE_TOKEN,
      EVENTBRITE_API_KEY: !!EVENTBRITE_API_KEY,
      EVENTBRITE_PUBLIC_TOKEN: !!EVENTBRITE_PUBLIC_TOKEN
    });

    if (!TICKETMASTER_KEY) {
      return new Response(JSON.stringify({ error: 'TICKETMASTER_KEY is not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request parameters
    const params = await req.json();
    const {
      keyword = '',
      lat,
      lng,
      latitude,
      longitude,
      radius = 10,
      startDate,
      endDate,
      categories = [],
      eventType = '',
      serpDate = ''
    } = params;

    // Allow location to be reassigned if reverse geocoding is needed
    let location = params.location;

    // Support both lat/lng and latitude/longitude parameter formats
    const userLat = latitude || lat;
    const userLng = longitude || lng;

    // If location is not provided but coordinates are, reverse geocode to get city name
    if (!location && userLat && userLng && MAPBOX_TOKEN) {
      const city = await reverseGeocodeCity(Number(userLat), Number(userLng), MAPBOX_TOKEN);
      if (city) {
        location = city;
      }
    }

    // Prepare results array
    let allEvents: Event[] = []
    // Track per-source stats
    let ticketmasterCount = 0, ticketmasterError: string | null = null
    let eventbriteCount = 0, eventbriteError: string | null = null
    let serpapiCount = 0, serpapiError: string | null = null

    // Fetch from Ticketmaster API
    try {
      // Fetch up to 200 events from Ticketmaster (no pagination)
      let ticketmasterEvents: any[] = [];
      let ticketmasterPage = 0;
      let ticketmasterTotalPages = 1;
      const ticketmasterMaxPages = 1; // Limit to 200 events as requested
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

    // No Eventbrite API integration - removed as requested
    eventbriteCount = 0;
    eventbriteError = null;

    // SerpApi Google Events API integration - Enhanced to replace Eventbrite
    // Docs: https://serpapi.com/google-events-api
    // Best practices: https://serpapi.com/blog/filter-and-scrape-google-events-with-python/
    // Node.js example: https://serpapi.com/blog/web-scraping-google-events-results-with-nodejs/
    // Note: SerpAPI can find events from multiple sources including Eventbrite
    if (SERPAPI_KEY) {
      try {
        console.log('[DEBUG] Using SERPAPI_KEY:', SERPAPI_KEY ? SERPAPI_KEY.slice(0,4) + '...' : 'NOT SET');
        // Build a more effective query for local events
        let serpQuery = keyword || 'events';
        let serpBaseUrl = `https://serpapi.com/search.json?engine=google_events&api_key=${SERPAPI_KEY}&hl=en&gl=us`;

        // Add categories to the query if provided
        if (categories && categories.length > 0) {
          serpQuery += (serpQuery !== 'events' ? ' ' : '') + categories.join(' ') + ' events';
        }

        // Build SerpApi params with strong location emphasis
        const serpParams: Record<string, string> = {};

        // If we have a location or coordinates, do NOT add 'near me' to the query
        if (location) {
          serpQuery += ` in ${location}`;
          serpParams['location'] = location;
        } else if (userLat && userLng) {
          // If only coordinates, don't add 'near me', but set ll param
          serpParams['ll'] = `@${userLat},${userLng},15z`;
        } else {
          // If neither location nor coordinates, add 'near me' to the query
          if (!serpQuery.toLowerCase().includes('near me')) {
            serpQuery += ' near me';
          }
        }

        // If both location and coordinates, set both params for maximum locality
        if (location && userLat && userLng) {
          serpParams['ll'] = `@${userLat},${userLng},15z`;
        }

        // Also add a radius parameter to limit results to nearby events
        if (radius) {
          // Convert miles to kilometers for Google
          const radiusKm = Math.round(radius * 1.60934);
          serpParams['radius'] = `${radiusKm}km`;
        } else {
          // Default to 10km radius if not specified
          serpParams['radius'] = '10km';
        }

        // Advanced: support htichips for event type/date filtering
        // Example: htichips=event_type:Virtual-Event,date:today
        let htichips: string[] = [];
        if (typeof eventType === 'string' && eventType.length > 0) {
          htichips.push(`event_type:${eventType}`);
        }
        if (typeof serpDate === 'string' && serpDate.length > 0) {
          htichips.push(`date:${serpDate}`);
        }
        if (htichips.length > 0) {
          serpParams['htichips'] = htichips.join(',');
        }

        // Add the final query to the URL
        const finalSerpQuery = serpQuery.trim();
        console.log('[DEBUG] SerpApi final query:', finalSerpQuery);
        serpBaseUrl += `&q=${encodeURIComponent(finalSerpQuery)}`;

        // Add all parameters
        Object.entries(serpParams).forEach(([k, v]) => {
          serpBaseUrl += `&${k}=${encodeURIComponent(v)}`;
          console.log(`[DEBUG] SerpApi param ${k}:`, v);
        });

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
          console.log('[DEBUG] SerpApi URL:', pagedSerpUrl);
          try {
            const response = await fetch(pagedSerpUrl);
            const data = await response.json();
            // Log quota info if available
            if (data.search_metadata && data.search_metadata.api_quota) {
              console.log('[DEBUG] SerpApi quota:', data.search_metadata.api_quota);
            }
            console.log('[DEBUG] SerpApi response:', {
              eventsCount: data.events_results?.length || 0,
              error: data.error || null,
              message: data.message || null,
              status: data.search_metadata?.status || null
            });
            // Check for explicit error status
            if (data.search_metadata?.status && data.search_metadata.status !== "Success") {
              serpHasMore = false;
              serpApiLastError = data;
              console.error('[SerpApi] Non-success status:', data.search_metadata.status);
              break;
            }
            if (data.events_results && Array.isArray(data.events_results) && data.events_results.length > 0) {
              serpEvents = [...serpEvents, ...data.events_results];
              serpStart += serpPageSize;
              serpApiWorked = true;
            } else {
              serpHasMore = false;
              if (data.error || data.message) {
                serpApiLastError = data;
                // Handle SerpApi-specific errors
                if (data.error === 'Invalid API key' || data.error === 'API key is missing') {
                  throw new Error('SerpApi authentication error: ' + data.error);
                }
                if (data.error && data.error.includes('rate limit')) {
                  throw new Error('SerpApi rate limit exceeded: ' + data.error);
                }
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
          // Try to extract coordinates from the event
          let coordinates: [number, number] | undefined = undefined;

          // If we have user coordinates and no event-specific coordinates, use the user's coordinates
          // This ensures events show up on the map near the user's location
          if (userLng && userLat) {
            // Add a tiny random offset (±0.01) to prevent all events from stacking at the same point
            const randomLngOffset = (Math.random() * 0.02) - 0.01;
            const randomLatOffset = (Math.random() * 0.02) - 0.01;
            coordinates = [
              Number(userLng) + randomLngOffset,
              Number(userLat) + randomLatOffset
            ];
          }

          // Robust fallback/defaults for all fields
          // Create a safe ID without using base64 encoding to avoid character encoding issues
          const id = event.title ?
            `serpapi-${Date.now()}-${event.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}` :
            `serpapi-${Date.now()}`;
          const title = event.title || 'Untitled Event';
          // Normalize date to ISO 8601 if possible
          let date = event.date?.start_date || '';
          if (date && isNaN(Date.parse(date))) {
            // Try to parse non-ISO date
            const parsed = Date.parse(date.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1'));
            if (!isNaN(parsed)) {
              date = new Date(parsed).toISOString();
            }
          }
          const time = event.date?.when?.split(' ').pop() || '';
          // Convert to 12-hour format
          const time12 = time ? to12Hour(time) : '';
          const location = Array.isArray(event.address) ? event.address.join(', ') : (event.address || '');
          const venue = event.venue?.name || '';
          const image = event.thumbnail || '/placeholder.svg';
          const url = event.link || '';
          const price = event.ticket_info?.[0]?.price || undefined;
          const description = event.description || '';
          // Use a more specific category if possible, otherwise default to 'event'
          const category = event.type || 'event';

          return {
            id,
            source: 'serpapi',
            title,
            description,
            date,
            time: time12,
            location,
            venue,
            category,
            image,
            coordinates,
            url,
            price
          };
        }) || [];

        allEvents = [...allEvents, ...serpEventsNormalized];
        serpapiCount = serpEventsNormalized.length;
      } catch (err) {
        serpapiError = err instanceof Error ? err.message : String(err);
        console.error('SerpAPI error:', serpapiError);
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
    // Improved error reporting: include stack trace if available
    console.error('Error:', error)
    return new Response(JSON.stringify({
      error: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
