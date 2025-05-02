import { Event } from '../types';
import { supabase } from '../integrations/supabase/client'; // Adjusted path
import { getApiKey } from '../config/env'; // Updated import

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

  const apiKey = getApiKey('rapidapi-key'); // Use getApiKey
  const endpoint = getApiKey('rapidapi-events-endpoint'); // Use getApiKey

  // Add more detailed logging for debugging
  console.log('[EVENT_SERVICE] RapidAPI key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined');
  console.log('[EVENT_SERVICE] RapidAPI endpoint:', endpoint);

  if (!apiKey || !endpoint) {
    const errorMsg = 'RapidAPI key or endpoint not configured.';
    console.error(`[EVENT_SERVICE] ${errorMsg}`);
    return { events: [], error: errorMsg };
  }

  try {
    // Construct the correct RapidAPI request based on params
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append('query', params.keyword); // Use 'query' based on example
    if (params.latitude && params.longitude) {
        // Check if API supports lat/lon or needs location string
        // Based on example, 'query' seems to handle location like "concerts in san-francisco"
        // If lat/lon is preferred, check API docs for parameter names (e.g., 'lat', 'lon', 'geo')
        // For now, relying on keyword/location string in 'query'
        if (params.location) {
             queryParams.append('query', `${params.keyword || ''} in ${params.location}`);
        } else {
             queryParams.append('query', params.keyword || '');
        }
        // If API supports radius with lat/lon, add it here
        // if (params.radius) queryParams.append('radius', params.radius.toString());
    } else if (params.location) {
         queryParams.append('query', `${params.keyword || ''} in ${params.location}`);
    } else if (params.keyword) {
         queryParams.append('query', params.keyword);
    }


    // RapidAPI expects 'date' parameter to be one of: all, today, tomorrow, week, weekend, next_week, month, next_month
    // It does not support custom date ranges in the format startDate..endDate
    if (params.startDate && params.endDate) {
        // Calculate the difference in days between startDate and endDate
        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        // Choose the appropriate date range based on the difference
        if (diffDays <= 7) {
            queryParams.append('date', 'week');
        } else if (diffDays <= 14) {
            queryParams.append('date', 'next_week');
        } else if (diffDays <= 30) {
            queryParams.append('date', 'month');
        } else {
            queryParams.append('date', 'next_month');
        }
    } else if (params.startDate) {
        // If only startDate is provided, use 'today' if it's today, otherwise use 'week'
        const today = new Date().toISOString().split('T')[0];
        if (params.startDate === today) {
            queryParams.append('date', 'today');
        } else {
            queryParams.append('date', 'week');
        }
    } else {
        queryParams.append('date', 'week'); // Default to 'week' as a reasonable default
    }


    if (params.categories) {
        // Check API category format. Example doesn't show category filtering.
        // Need to consult RapidAPI docs.
        // Assuming a parameter like 'categories' or 'tags' might exist.
        // queryParams.append('categories', params.categories.join(',')); // Placeholder
    }

    if (params.limit) queryParams.append('limit', params.limit.toString()); // Check API limit parameter
    if (params.page) queryParams.append('start', ((params.page - 1) * (params.limit || 10)).toString()); // Assuming 'start' parameter for pagination based on example

    // Add other parameters as required by the RapidAPI endpoint

    const url = `${endpoint}?${queryParams.toString()}`;

    console.log(`[EVENT_SERVICE] Calling RapidAPI: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': new URL(endpoint).host, // Extract host from endpoint
        'Content-Type': 'application/json', // Adjust if API expects different content type
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EVENT_SERVICE] RapidAPI search request failed: ${response.status} ${response.statusText}`, errorText);
      return { events: [], error: `RapidAPI search request failed: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();

    // Process the RapidAPI response and normalize events
    // The search response has an array of events in the 'data' field
    const normalizedEvents: Event[] = (data.data || []).map(normalizeRapidApiEvent); // Access data.data

    console.log(`[EVENT_SERVICE] Received ${normalizedEvents.length} events from RapidAPI`);

    // Extract source stats if available in the RapidAPI response
    const sourceStats = {
      rapidapi: {
        count: normalizedEvents.length,
        error: null, // Set to error message if any occurred during fetch/normalization
      },
      // Initialize other sources if needed, or remove them
      ticketmaster: { count: 0, error: null },
      eventbrite: { count: 0, error: null },
    };

    // Extract meta information if available in the RapidAPI response
    const meta = {
      timestamp: new Date().toISOString(),
      totalEvents: data.total || normalizedEvents.length, // Assuming data has a 'total' field
      hasMore: data.hasMore || false, // Assuming data has a 'hasMore' field
    };


    return {
      events: normalizedEvents,
      sourceStats,
      meta,
    };

  } catch (error) {
    console.error('[EVENT_SERVICE] Exception calling RapidAPI search:', error);
    return {
      events: [],
      error: `Exception calling RapidAPI search: ${error instanceof Error ? error.message : String(error)}`,
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
  const apiKey = getApiKey('rapidapi-key'); // Use getApiKey
  const endpoint = getApiKey('rapidapi-events-endpoint'); // Use getApiKey

  if (!apiKey || !endpoint) {
    const errorMsg = 'RapidAPI key or endpoint not configured.';
    console.error(`[EVENT_SERVICE] ${errorMsg}`);
    return null;
  }

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
      const errorText = await response.text();
      console.error(`[EVENT_SERVICE] RapidAPI single event request failed: ${response.status} ${response.statusText}`, errorText);
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
    return null;
  }
}
