import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { Event, SearchParams, SourceStats, SearchEventsResponse } from "./types.ts"
// Import the fixed PredictHQ integration
import { fetchPredictHQEvents } from "./predicthq-fixed.ts"

/**
 * Normalize a Ticketmaster event to our standard format
 */
function normalizeTicketmasterEvent(event: any): Event {
  try {
    // Extract date and time
    const startDateTime = event.dates?.start?.dateTime || new Date().toISOString();
    const date = new Date(startDateTime).toISOString().split('T')[0];
    const time = new Date(startDateTime).toTimeString().slice(0, 5);

    // Extract location
    const venue = event._embedded?.venues?.[0];
    const location = venue?.city?.name
      ? `${venue.city.name}${venue.state?.name ? `, ${venue.state.name}` : ''}`
      : 'Location not specified';

    // Extract coordinates if available
    let coordinates: [number, number] | undefined = undefined;
    if (venue?.location?.longitude && venue?.location?.latitude) {
      coordinates = [
        parseFloat(venue.location.longitude),
        parseFloat(venue.location.latitude)
      ];
    }

    // Extract price if available
    let price: string | undefined = undefined;
    if (event.priceRanges && event.priceRanges.length > 0) {
      const priceRange = event.priceRanges[0];
      if (priceRange.min === priceRange.max) {
        price = `$${priceRange.min}`;
      } else {
        price = `$${priceRange.min} - $${priceRange.max}`;
      }
    }

    // Map category
    let category = 'other';
    const classifications = event.classifications || [];
    if (classifications.length > 0) {
      const segment = classifications[0].segment?.name?.toLowerCase();
      const genreName = classifications[0].genre?.name?.toLowerCase();

      if (segment === 'music') category = 'music';
      else if (segment === 'sports') category = 'sports';
      else if (segment === 'arts & theatre' || segment === 'arts') category = 'arts';
      else if (segment === 'family') category = 'family';
      else if (segment === 'food & drink' || segment === 'food') category = 'food';

      // Check for party-related genres
      if (genreName?.includes('party') || segment?.includes('party')) category = 'party';

      // Further refinement based on segment & genre
      if (segment === 'miscellaneous' && genreName?.includes('party')) category = 'party';
    }

    // Fallback check on keywords if category is still 'other'
    const titleLower = event.name.toLowerCase();
    if (category === 'other') {
      if (titleLower.includes('party') || titleLower.includes('social') || titleLower.includes('gathering')) {
        category = 'party';
      }
    }

    return {
      id: `ticketmaster-${event.id}`,
      source: 'ticketmaster',
      title: event.name,
      description: event.description || event.info,
      date,
      time,
      location,
      venue: venue?.name,
      category,
      image: event.images && event.images.length > 0
        ? event.images.sort((a: any, b: any) => b.width - a.width)[0].url
        : 'https://via.placeholder.com/400',
      coordinates,
      url: event.url,
      price
    };
  } catch (error) {
    console.error('Error normalizing Ticketmaster event:', error);
    throw error;
  }
}

/**
 * Normalize a SerpApi Google Events result to our standard format
 */
function normalizeSerpApiEvent(event: any): Event {
  try {
    // Extract date and time
    const date = event.date?.when || new Date().toISOString().split('T')[0];
    const time = event.date?.start_time || '19:00';

    // Extract location
    const location = event.address || event.venue?.name || 'Location not specified';

    // Map category based on event title and description
    let category = 'other';
    const titleLower = (event.title || '').toLowerCase();
    const descLower = (event.description || '').toLowerCase();
    const venueType = (event.venue?.type || '').toLowerCase();

    if (
      titleLower.includes('concert') ||
      titleLower.includes('music') ||
      descLower.includes('band') ||
      venueType.includes('music venue')
    ) {
      category = 'music';
    } else if (
      titleLower.includes('game') ||
      titleLower.includes('match') ||
      titleLower.includes('tournament') ||
      descLower.includes('sports')
    ) {
      category = 'sports';
    } else if (
      titleLower.includes('art') ||
      titleLower.includes('exhibit') ||
      titleLower.includes('theatre') ||
      titleLower.includes('theater') ||
      titleLower.includes('museum')
    ) {
      category = 'arts';
    } else if (
      titleLower.includes('food') ||
      titleLower.includes('drink') ||
      titleLower.includes('tasting') ||
      titleLower.includes('dinner') ||
      titleLower.includes('brunch') ||
      venueType.includes('restaurant')
    ) {
      category = 'food';
    } else if (
      titleLower.includes('family') ||
      titleLower.includes('kids') ||
      titleLower.includes('children')
    ) {
      category = 'family';
    } else if (
      titleLower.includes('party') ||
      titleLower.includes('social') ||
      titleLower.includes('gathering') ||
      titleLower.includes('mixer') ||
      venueType.includes('nightclub') ||
      venueType.includes('bar')
    ) {
      category = 'party';
    }

    // Generate a unique ID
    const id = `serpapi-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      id,
      source: 'google',
      title: event.title,
      description: event.description,
      date: event.date?.start_date || date,
      time,
      location,
      venue: event.venue?.name,
      category,
      image: event.thumbnail || 'https://via.placeholder.com/400',
      url: event.link,
      price: event.ticket_info?.price
    };
  } catch (error) {
    console.error('Error normalizing SerpApi event:', error);
    throw error;
  }
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


// Use the shared corsHeaders from _shared/cors.ts

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[SEARCH-EVENTS] Received request');
    const startTime = Date.now();

    // Use the exact secret names as set in Supabase
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN');
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY');
    const TICKETMASTER_SECRET = Deno.env.get('TICKETMASTER_SECRET');
    const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
    const PREDICTHQ_API_KEY = Deno.env.get('PREDICTHQ_API_KEY');

    // Log API key availability (not the actual keys)
    console.log('[SEARCH-EVENTS] API keys available:', {
      MAPBOX_TOKEN: !!MAPBOX_TOKEN,
      TICKETMASTER_KEY: !!TICKETMASTER_KEY,
      SERPAPI_KEY: !!SERPAPI_KEY,
      PREDICTHQ_API_KEY: !!PREDICTHQ_API_KEY
    });

    // Get Eventbrite tokens - check all possible env var names
    const EVENTBRITE_TOKEN = Deno.env.get('EVENTBRITE_TOKEN') || Deno.env.get('EVENTBRITE_PRIVATE_TOKEN');
    const EVENTBRITE_API_KEY = Deno.env.get('EVENTBRITE_API_KEY');
    const EVENTBRITE_CLIENT_SECRET = Deno.env.get('EVENTBRITE_CLIENT_SECRET');
    const EVENTBRITE_PUBLIC_TOKEN = Deno.env.get('EVENTBRITE_PUBLIC_TOKEN') || Deno.env.get('VENTBRITE_PUBLIC_TOKEN');

    // Debug: Log the presence of API keys (masking sensitive parts)
    console.log('[DEBUG] TICKETMASTER_KEY:', TICKETMASTER_KEY ? TICKETMASTER_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] SERPAPI_KEY:', SERPAPI_KEY ? SERPAPI_KEY.slice(0,4) + '...' : 'NOT SET');
    console.log('[DEBUG] PREDICTHQ_API_KEY:', PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.slice(0,4) + '...' : 'NOT SET');
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
    console.log('[SEARCH-EVENTS] Request parameters:', JSON.stringify(params, null, 2));

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
      serpDate = '',
      limit = 50,
      page = 1,
      excludeIds = []
    } = params;

    // Allow location to be reassigned if reverse geocoding is needed
    let location = params.location;

    // Support both lat/lng and latitude/longitude parameter formats
    let userLat = latitude || lat;
    let userLng = longitude || lng;

    // If location is not provided but coordinates are, reverse geocode to get city name
    if (!location && userLat && userLng && MAPBOX_TOKEN) {
      const city = await reverseGeocodeCity(Number(userLat), Number(userLng), MAPBOX_TOKEN);
      if (city) {
        location = city;
      }
    }

    // Check if a valid location or coordinates are provided
    const hasValidLocation = (
      (typeof location === 'string' && location.trim().length > 0) ||
      (userLat && userLng && !isNaN(Number(userLat)) && !isNaN(Number(userLng)))
    );

    // If no location is provided, use a default location (New York)
    if (!hasValidLocation) {
      console.log('[DEBUG] No valid location provided, using default location (New York)');
      location = 'New York';
      // Default coordinates for New York City
      if (!userLat) userLat = 40.7128;
      if (!userLng) userLng = -74.0060;
    }

    // Prepare results array
    let allEvents: Event[] = []
    // Track per-source stats
    let ticketmasterCount = 0, ticketmasterError: string | null = null
    let eventbriteCount = 0, eventbriteError: string | null = null
    let serpapiCount = 0, serpapiError: string | null = null
    let predicthqCount = 0, predicthqError: string | null = null

    // Fetch from Ticketmaster API
    try {
      // Fetch up to 200 events from Ticketmaster (reduced for performance)
      let ticketmasterEvents: any[] = [];
      let ticketmasterPage = 0;
      let ticketmasterTotalPages = 1;
      const ticketmasterMaxPages = 1; // Reduced to 1 page (200 events) for better performance
      while (ticketmasterPage < ticketmasterTotalPages && ticketmasterPage < ticketmasterMaxPages) {
        // Use a stricter radius for more local results (default 25 miles)
        const effectiveRadius = Math.max(1, Math.min(Number(radius) || 25, 100));
        let ticketmasterUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&size=200&page=${ticketmasterPage}`;

        // Add location parameters
        if (userLat && userLng) {
          ticketmasterUrl += `&latlong=${userLat},${userLng}&radius=${effectiveRadius}&unit=miles`
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
            'food': 'KZFzniwnSyZfZ7v7l1',
            'party': 'KZFzniwnSyZfZ7v7nJ' // Map party to Music segment, as Ticketmaster doesn't have a specific party segment
          }

          const segmentIds = categories
            .map((cat: string) => categoryMap[cat as keyof typeof categoryMap])
            .filter(Boolean)

          if (segmentIds.length > 0) {
            ticketmasterUrl += `&segmentId=${segmentIds.join(',')}`
          }
        }
        console.log('[DEBUG] Ticketmaster API URL:', ticketmasterUrl);

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

      // Transform Ticketmaster events using normalization utility
      const ticketmasterEventsNormalized = ticketmasterEvents
        .map(event => {
          try {
            return normalizeTicketmasterEvent(event);
          } catch (e) {
            console.warn('Failed to normalize Ticketmaster event:', event?.id, e);
            return null;
          }
        })
        .filter((event): event is Event => event !== null) || [];

      allEvents = [...allEvents, ...ticketmasterEventsNormalized]
      ticketmasterCount = ticketmasterEventsNormalized.length
    } catch (err) {
      ticketmasterError = err instanceof Error ? err.message : String(err)
      console.error('Ticketmaster API error:', ticketmasterError)
    }

    // No Eventbrite API integration - removed as requested
    eventbriteCount = 0;
    eventbriteError = null;

    // PredictHQ API integration with improved error handling
    // Docs: https://docs.predicthq.com/
    if (PREDICTHQ_API_KEY) {
      try {
        console.log('[DEBUG] Using PredictHQ API to fetch events');
        console.log('[DEBUG] PredictHQ API Key available:', !!PREDICTHQ_API_KEY);
        console.log('[DEBUG] PredictHQ API Key prefix:', PREDICTHQ_API_KEY ? PREDICTHQ_API_KEY.substring(0, 4) + '...' : 'N/A');

        // Log request parameters for debugging
        console.log('[DEBUG] PredictHQ request parameters:', {
          hasLatLng: !!(userLat && userLng),
          lat: userLat,
          lng: userLng,
          radius,
          hasDateRange: !!(startDate && endDate),
          startDate,
          endDate,
          location,
          keyword,
          categories
        });

        const { events: predicthqEvents, error } = await fetchPredictHQEvents({
          apiKey: PREDICTHQ_API_KEY,
          latitude: userLat ? Number(userLat) : undefined,
          longitude: userLng ? Number(userLng) : undefined,
          radius: Number(radius),
          startDate,
          endDate,
          categories,
          location,
          keyword,
          limit: 200 // Increased limit to get more events
        });

        if (error) {
          predicthqError = error;
          console.error('[PredictHQ] API error:', error);
        } else {
          console.log(`[PredictHQ] Successfully fetched ${predicthqEvents.length} events`);
          allEvents = [...allEvents, ...predicthqEvents];
          predicthqCount = predicthqEvents.length;
        }
      } catch (err) {
        predicthqError = err instanceof Error ? err.message : String(err);
        console.error('[PredictHQ] Error fetching events:', predicthqError);
      }
    } else {
      console.log('[DEBUG] PredictHQ API key not available, skipping');
      predicthqError = 'PredictHQ API key not configured';
    }

    // SerpApi Google Events API integration - Enhanced to replace Eventbrite
    // Docs: https://serpapi.com/google-events-api
    // Best practices: https://serpapi.com/blog/filter-and-scrape-google-events-with-python/
    // Node.js example: https://serpapi.com/blog/web-scraping-google-events-results-with-nodejs/
    // Note: SerpAPI can find events from multiple sources including Eventbrite
    // Only call SerpAPI if we have a location (either as a name or coordinates)
    if (SERPAPI_KEY && (location || (userLat && userLng))) {
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

        // Paginate SerpApi results (reduced for performance)
        let serpEvents: any[] = [];
        let serpStart = 0;
        const serpPageSize = 10;
        const serpMaxPages = 2; // Reduced to 2 pages for better performance
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
        // Use normalization utility and assign coordinates after normalization
        const serpEventsNormalized = serpEvents
          .map(event => {
            try {
              const normalized = normalizeSerpApiEvent(event);
              // Assign coordinates near user location if available
              if (userLng && userLat) {
                const randomLngOffset = (Math.random() * 0.02) - 0.01;
                const randomLatOffset = (Math.random() * 0.02) - 0.01;
                normalized.coordinates = [
                  Number(userLng) + randomLngOffset,
                  Number(userLat) + randomLatOffset
                ];
              }
              // Ensure the event has a unique ID
              if (!normalized.id) {
                normalized.id = `serp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
              }
              return normalized;
            } catch (e) {
              console.warn('Failed to normalize SerpAPI event:', event?.title, e);
              return null;
            }
          })
          .filter((event): event is Event => event !== null) || [];

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

    // Filter out excluded IDs
    let filteredEvents = uniqueEvents;
    if (excludeIds && excludeIds.length > 0) {
      const excludeIdSet = new Set(excludeIds);
      filteredEvents = uniqueEvents.filter(event => !excludeIdSet.has(event.id));
    }

    // Sort events by date (soonest first)
    filteredEvents.sort((a, b) => {
      // Parse dates
      const dateA = parseEventDate(a.date, a.time);
      const dateB = parseEventDate(b.date, b.time);

      // Sort by date (ascending)
      return dateA.getTime() - dateB.getTime();
    });

    // Helper function to parse event dates in various formats
    function parseEventDate(dateStr: string, timeStr: string): Date {
      try {
        // Try to parse ISO date format (YYYY-MM-DD)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-').map(Number);

          // Parse time (HH:MM format)
          let hours = 0, minutes = 0;
          if (timeStr) {
            const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (timeParts) {
              hours = parseInt(timeParts[1], 10);
              minutes = parseInt(timeParts[2], 10);

              // Handle AM/PM
              if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
                hours += 12;
              } else if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
              }
            }
          }

          return new Date(year, month - 1, day, hours, minutes);
        }

        // Try to parse date strings like "Mon, May 19"
        const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
        if (monthMatch) {
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const month = monthNames.indexOf(monthMatch[1].toLowerCase());
          const day = parseInt(monthMatch[2], 10);

          // Use current year as default
          const year = new Date().getFullYear();

          // Parse time (HH:MM AM/PM format)
          let hours = 0, minutes = 0;
          if (timeStr) {
            const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (timeParts) {
              hours = parseInt(timeParts[1], 10);
              minutes = parseInt(timeParts[2], 10);

              // Handle AM/PM
              if (timeParts[3] && timeParts[3].toUpperCase() === 'PM' && hours < 12) {
                hours += 12;
              } else if (timeParts[3] && timeParts[3].toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
              }
            }
          }

          return new Date(year, month, day, hours, minutes);
        }

        // Fallback: return current date (events with unparseable dates will be sorted last)
        return new Date();
      } catch (error) {
        console.error('Error parsing event date:', error, { dateStr, timeStr });
        return new Date(); // Fallback to current date
      }
    }

    // Calculate total events before pagination
    const totalEvents = filteredEvents.length;

    // Apply pagination
    if (limit && limit > 0) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      filteredEvents = filteredEvents.slice(startIndex, endIndex);
    }

    // Calculate execution time
    const executionTime = Date.now() - startTime;
    console.log(`[SEARCH-EVENTS] Execution completed in ${executionTime}ms`);
    console.log(`[SEARCH-EVENTS] Returning ${filteredEvents.length} events`);

    // Log event sources breakdown
    console.log('[SEARCH-EVENTS] Events by source:', {
      ticketmaster: ticketmasterCount,
      eventbrite: eventbriteCount,
      serpapi: serpapiCount,
      total: filteredEvents.length
    });

    // Log events with/without coordinates
    const eventsWithCoords = filteredEvents.filter(event => event.coordinates && event.coordinates.length === 2);
    console.log(`[SEARCH-EVENTS] ${eventsWithCoords.length} of ${filteredEvents.length} events have valid coordinates`);

    // Return the response
    return new Response(JSON.stringify({
      events: filteredEvents,
      sourceStats: {
        ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
        eventbrite: { count: eventbriteCount, error: eventbriteError },
        serpapi: { count: serpapiCount, error: serpapiError },
        predicthq: { count: predicthqCount, error: predicthqError }
      },
      meta: {
        executionTime,
        totalEvents: totalEvents,
        eventsWithCoordinates: eventsWithCoords.length,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(totalEvents / limit),
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Improved error reporting: include stack trace if available
    console.error('[SEARCH-EVENTS] CRITICAL ERROR:', error);

    // Extract detailed error information
    let errorMessage = 'Unknown error occurred';
    let errorStack = '';
    let errorType = 'Unknown';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack || '';
      errorType = error.name || 'Error';
      console.error(`[SEARCH-EVENTS] ${errorType}: ${errorMessage}`);
      console.error('[SEARCH-EVENTS] Stack trace:', errorStack);
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = '[Object cannot be stringified]';
      }
    } else {
      errorMessage = String(error);
    }

    // Return a structured error response
    return new Response(JSON.stringify({
      error: errorMessage,
      errorType,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      events: [],
      sourceStats: {
        ticketmaster: { count: 0, error: 'Function execution failed' },
        eventbrite: { count: 0, error: 'Function execution failed' },
        serpapi: { count: 0, error: 'Function execution failed' },
        predicthq: { count: 0, error: 'Function execution failed' }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
