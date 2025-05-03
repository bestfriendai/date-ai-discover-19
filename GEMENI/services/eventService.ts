import { Event } from '../types';
import { supabase } from '../integrations/supabase/client'; // Adjusted path
import { getApiKey as getEnvApiKey } from '../config/env'; // Keep for backward compatibility
import { getApiKey, getApiKeySync, trackApiUsage, getRateLimitStatus } from '../utils/apiKeyManager'; // Import from API key manager
import { searchRapidAPIEvents } from '../integrations/rapidapi/rapidapi-enhanced'; // Import enhanced RapidAPI integration

export interface SearchEventsParams {
  keyword?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  limit?: number;
  page?: number;
  excludeIds?: string[];
  fields?: string[];
}

export interface SearchEventsResponse {
  events: Event[];
  sourceStats?: {
    rapidapi?: {
      count: number;
      error: string | null;
    };
    ticketmaster?: { // Keep for potential future use or compatibility
      count: number;
      error: string | null;
    };
    eventbrite?: { // Keep for potential future use or compatibility
      count: number;
      error: string | null;
    };
  };
  meta?: {
    timestamp: string;
    totalEvents?: number;
    hasMore?: boolean;
  };
  error?: string;
}

// Function to normalize data from RapidAPI to Event format
function normalizeRapidApiEvent(rapidApiEvent: any): Event {
  const startDate = rapidApiEvent.start_time ? new Date(rapidApiEvent.start_time) : null;
  const endDate = rapidApiEvent.end_time ? new Date(rapidApiEvent.end_time) : null;

  return {
    id: rapidApiEvent.event_id?.toString() || '',
    source: rapidApiEvent.publisher_domain || 'rapidapi',
    title: rapidApiEvent.name || 'No Title',
    description: rapidApiEvent.description || '',
    date: startDate ? startDate.toISOString().split('T')[0] : '',
    time: startDate ? startDate.toTimeString().slice(0, 5) : '',
    location: rapidApiEvent.venue?.full_address || rapidApiEvent.venue?.name || 'Unknown Location',
    venue: rapidApiEvent.venue?.name || '',
    category: rapidApiEvent.tags?.[0] || 'Unknown', // Using the first tag as category
    image: rapidApiEvent.thumbnail || '',
    url: rapidApiEvent.link || rapidApiEvent.ticket_links?.[0]?.link || '', // Use link or first ticket link
    coordinates: (rapidApiEvent.venue?.latitude && rapidApiEvent.venue?.longitude)
      ? [rapidApiEvent.venue.longitude, rapidApiEvent.venue.latitude]
      : undefined,
    price: undefined, // No explicit price in example, leaving as undefined
    // Add other fields as needed based on the Event type and RapidAPI response
  };
}


// Unified function to search for events using RapidAPI
export async function searchEvents(params: SearchEventsParams): Promise<SearchEventsResponse> {
  console.log('[EVENT_SERVICE] Searching for events with params:', params);

  try {
    // Check rate limit status first
    const rateLimitStatus = getRateLimitStatus('rapidapi');
    if (rateLimitStatus.limited) {
      const resetTimeMinutes = Math.ceil(rateLimitStatus.resetInMs ? rateLimitStatus.resetInMs / 60000 : 1);
      const errorMsg = `RapidAPI rate limit exceeded. Try again in approximately ${resetTimeMinutes} minute(s).`;
      console.error(`[EVENT_SERVICE] ${errorMsg}`);
      return {
        events: [],
        error: errorMsg,
        sourceStats: {
          rapidapi: { count: 0, error: errorMsg }
        },
        meta: {
          timestamp: new Date().toISOString(),
          totalEvents: 0
        }
      };
    }

    // Convert our SearchEventsParams to the format expected by searchRapidAPIEvents
    const rapidApiParams = {
      keyword: params.keyword,
      location: params.location,
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 25, // Default radius
      startDate: params.startDate,
      endDate: params.endDate,
      categories: params.categories,
      limit: params.limit || 100, // Default limit
      page: params.page || 1, // Default page
      excludeIds: params.excludeIds
    };

    // Use the enhanced RapidAPI integration
    const result = await searchRapidAPIEvents(rapidApiParams);

    // Track API usage
    trackApiUsage('rapidapi', !!result.error);

    // Extract source stats
    const sourceStats = {
      rapidapi: {
        count: result.events.length,
        error: result.error
      },
      // Initialize other sources if needed
      ticketmaster: { count: 0, error: null },
      eventbrite: { count: 0, error: null }
    };

    // Extract meta information
    const meta = {
      timestamp: new Date().toISOString(),
      totalEvents: result.events.length,
      hasMore: result.events.length >= (params.limit || 100), // Assume there might be more if we hit the limit
      searchQueryUsed: result.searchQueryUsed
    };

    return {
      events: result.events,
      sourceStats,
      meta,
      error: result.error || undefined
    };
  } catch (error) {
    console.error('[EVENT_SERVICE] Exception calling RapidAPI search:', error);

    // Track API error
    trackApiUsage('rapidapi', true);

    return {
      events: [],
      error: `Exception calling RapidAPI search: ${error instanceof Error ? error.message : String(error)}`,
      sourceStats: {
        rapidapi: {
          count: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        totalEvents: 0
      }
    };
  }
}

// Get event details by ID using RapidAPI
export async function getEventById(id: string): Promise<Event | null> {
  console.log(`[EVENT_SERVICE] Getting event details for ID: ${id}`);

  // First, try to get the event from the local Supabase database
  try {
    const { data: localEvent } = await supabase
      .from('events') // Assuming 'events' is the table name
      .select('*')
      .eq('external_id', id) // Assuming 'external_id' stores the RapidAPI ID
      .single();

    if (localEvent) {
      console.log(`[EVENT_SERVICE] Found event ${id} in local database.`);
      // Normalize local event data to the Event type if necessary
      // This part might need adjustment based on your local 'events' table schema
      let coordinates: [number, number] | undefined;
      if (localEvent.location_coordinates) {
        const coordStr = typeof localEvent.location_coordinates === 'string'
          ? localEvent.location_coordinates
          : '';
        const matches = coordStr.match(/\(([-\d.]+)\s+([-\d.]+)\)/);
        if (matches) {
          coordinates = [parseFloat(matches[1]), parseFloat(matches[2])];
        }
      }
      const metadata = localEvent.metadata || {};
      const price = typeof metadata === 'object' && 'price' in metadata
        ? metadata.price as string
        : undefined;

      return {
        id: localEvent.external_id ?? '', // Handle null
        source: localEvent.source ?? '', // Handle null
        title: localEvent.title ?? 'No Title', // Handle null
        description: localEvent.description ?? '', // Handle null
        date: localEvent.date_start ? new Date(localEvent.date_start).toISOString().split('T')[0] : '', // Handle null
        time: localEvent.date_start ? new Date(localEvent.date_start).toTimeString().slice(0, 5) : '', // Handle null
        location: localEvent.location_name ?? 'Unknown Location', // Handle null
        venue: localEvent.venue_name ?? '', // Handle null
        category: localEvent.category ?? 'Unknown', // Handle null
        image: localEvent.image_url ?? '', // Handle null
        url: localEvent.url ?? '', // Handle null
        coordinates,
        price
      };
    }
  } catch (error) {
    console.error('[EVENT_SERVICE] Error fetching event from local database:', error);
    // Continue to fetch from RapidAPI if local fetch fails
  }


  // If not in local database, fetch from RapidAPI

  // Check rate limit status first
  const rateLimitStatus = getRateLimitStatus('rapidapi');
  if (rateLimitStatus.limited) {
    const resetTimeMinutes = Math.ceil(rateLimitStatus.resetInMs ? rateLimitStatus.resetInMs / 60000 : 1);
    console.error(`[EVENT_SERVICE] RapidAPI rate limit exceeded. Try again in approximately ${resetTimeMinutes} minute(s).`);
    return null;
  }

  // Try to get the API key
  let apiKey;
  try {
    apiKey = await getApiKey('rapidapi');
  } catch (error) {
    console.error(`[EVENT_SERVICE] Error getting RapidAPI key: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  // Get the endpoint
  const endpoint = getEnvApiKey('rapidapi-events-endpoint');

  if (!apiKey || !endpoint) {
    const errorMsg = 'RapidAPI key or endpoint not configured.';
    console.error(`[EVENT_SERVICE] ${errorMsg}`);
    return null;
  }

  // Track API usage
  trackApiUsage('rapidapi');

  try {
    // Construct the correct RapidAPI request to get a single event by ID
    // Based on the example, the endpoint for details is different and uses 'event-details'
    // and takes 'event_id' as a query parameter.
    const detailsEndpoint = endpoint.replace('/search-events', '/event-details'); // Assuming a consistent base URL

    const url = `${detailsEndpoint}?event_id=${id}`; // Use event_id query parameter

    console.log(`[EVENT_SERVICE] Calling RapidAPI for single event: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': new URL(detailsEndpoint).host, // Use host from details endpoint
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        console.error(`[EVENT_SERVICE] Could not read error response: ${e}`);
      }

      console.error(`[EVENT_SERVICE] RapidAPI single event request failed: ${response.status} ${response.statusText}`, errorText);

      // Track API error
      trackApiUsage('rapidapi', true);

      // Handle specific error codes
      if (response.status === 401 || response.status === 403) {
        console.error('[EVENT_SERVICE] API key is invalid or unauthorized');
      } else if (response.status === 429) {
        console.error('[EVENT_SERVICE] API rate limit exceeded');
      }

      return null;
    }

    const data = await response.json();

    // Process the RapidAPI response and normalize the single event
    // The single event response has the event object directly in the 'data' field
    if (!data?.data) { // Access data.data for the single event object
        console.warn(`[EVENT_SERVICE] No event data returned from RapidAPI for ID: ${id}`);
        return null;
    }

    const normalizedEvent: Event = normalizeRapidApiEvent(data.data); // Access data.data

    console.log(`[EVENT_SERVICE] Received event ${normalizedEvent.id} from RapidAPI`);

    return normalizedEvent;

  } catch (error) {
    console.error('[EVENT_SERVICE] Exception calling RapidAPI for single event:', error);

    // Track API error
    trackApiUsage('rapidapi', true);

    return null;
  }
}
