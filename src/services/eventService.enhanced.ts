import { supabase } from '@/integrations/supabase/client';
import { invokeFunctionWithRetry } from '@/integrations/supabase/functions-client';
import type { Event } from '@/types';
import { getApiKey, getApiKeySync } from '@/utils/apiKeyManager';
import {
  getCachedSearchResults,
  cacheSearchResults,
  getCachedEvent,
  cacheEvent
} from '@/utils/eventCache';

interface SearchParams {
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
  partySubcategory?: string;
}

// Maximum number of retries for API calls
const MAX_RETRIES = 3;

// Fetch events from multiple sources with caching and direct API calls
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  meta?: any;
}> {
  console.log('[EVENT_SERVICE] searchEvents called with params:', params);

  try {
    // Ensure all required parameters are present
    const searchParams = {
      startDate: params.startDate || new Date().toISOString().split('T')[0],
      endDate: params.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: params.location || 'New York', // Default location if none provided
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 30, // Default to 30 miles radius
      categories: params.categories || [],
      keyword: params.keyword || '',
      limit: params.limit || 100,
      page: params.page || 1,
      excludeIds: params.excludeIds || [],
      partySubcategory: params.partySubcategory
    };

    console.log('[EVENT_SERVICE] Processed search params:', searchParams);

    // Check cache first
    const cachedResults = getCachedSearchResults(searchParams);
    if (cachedResults) {
      // If we have a party subcategory filter, apply it to the cached results
      if (searchParams.partySubcategory && searchParams.partySubcategory !== 'all') {
        const filteredEvents = cachedResults.events.filter(event =>
          event.partySubcategory === searchParams.partySubcategory
        );

        return {
          ...cachedResults,
          events: filteredEvents,
          meta: {
            ...cachedResults.meta,
            totalEvents: filteredEvents.length
          }
        };
      }

      return cachedResults;
    }

    // Try direct RapidAPI call first
    try {
      console.log('[EVENT_SERVICE] Making direct RapidAPI call');
      const result = await searchEventsDirectly(searchParams);

      // Cache the results
      cacheSearchResults(searchParams, result);

      // If we have a party subcategory filter, apply it
      if (searchParams.partySubcategory && searchParams.partySubcategory !== 'all') {
        const filteredEvents = result.events.filter(event =>
          event.partySubcategory === searchParams.partySubcategory
        );

        return {
          ...result,
          events: filteredEvents,
          meta: {
            ...result.meta,
            totalEvents: filteredEvents.length
          }
        };
      }

      return result;
    } catch (directApiError) {
      console.error('[EVENT_SERVICE] Direct RapidAPI call failed:', directApiError);

      // Fallback to Supabase function
      console.log('[EVENT_SERVICE] Falling back to Supabase function');

      try {
        // Use our custom function invoker with retry logic
        const data = await invokeFunctionWithRetry('search-events', searchParams);

        // Cache the results
        cacheSearchResults(searchParams, data);

        return data;
      } catch (functionError) {
        console.error('[EVENT_SERVICE] Error from function invocation:', functionError);
        throw functionError;
      }
    }
  } catch (error) {
    console.error('[ERROR] Error searching events:', error);
    return {
      events: [],
      sourceStats: {
        rapidapi: { count: 0, error: String(error) }
      },
      meta: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Get event details by ID with caching
export async function getEventById(id: string): Promise<Event | null> {
  try {
    // Check cache first
    const cachedEvent = getCachedEvent(id);
    if (cachedEvent) {
      return cachedEvent;
    }

    // Check if this is a RapidAPI event
    if (id.startsWith('rapidapi_')) {
      try {
        console.log(`[EVENT_SERVICE] Fetching RapidAPI event details for ID: ${id}`);
        const result = await getEventDetailsDirectly(id);
        if (result.event) {
          // Cache the event
          cacheEvent(result.event);
          return result.event;
        }
      } catch (error) {
        console.error('[EVENT_SERVICE] Error fetching RapidAPI event details:', error);
      }
    }

    // Check local database
    const { data: localEvent } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (localEvent) {
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

      const event = {
        id: localEvent.external_id,
        source: localEvent.source,
        title: localEvent.title,
        description: localEvent.description,
        date: new Date(localEvent.date_start).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        time: new Date(localEvent.date_start).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        location: localEvent.location_name,
        venue: localEvent.venue_name,
        category: localEvent.category,
        image: localEvent.image_url,
        url: localEvent.url,
        coordinates,
        price
      };

      // Cache the event
      cacheEvent(event);
      return event;
    }

    // If not found locally or in RapidAPI, try Supabase function
    try {
      console.log(`[EVENT_SERVICE] Fetching event details from Supabase function for ID: ${id}`);
      const data = await invokeFunctionWithRetry('get-event', { id });

      if (!data?.event) {
        console.warn(`[EVENT_SERVICE] No event data returned for ID: ${id}`);
        return null;
      }

      // Cache the event
      cacheEvent(data.event);
      return data.event;
    } catch (error) {
      console.error('[ERROR] Error fetching event by ID:', error);
      return null;
    }
  } catch (error) {
    console.error('Error getting event by ID:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}

/**
 * Search for events using RapidAPI directly
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} - Search results
 */
async function searchEventsDirectly(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  meta?: any;
}> {
  // Get the RapidAPI key
  const rapidApiKey = await getApiKey('rapidapi');
  if (!rapidApiKey) {
    throw new Error('RapidAPI key not available');
  }

  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`[RAPIDAPI] Searching for events (attempt ${retries + 1}/${MAX_RETRIES})`);

      // Build query parameters
      const queryParams = new URLSearchParams();

      // Determine if this is a party search
      const isPartySearch = params.categories &&
                           Array.isArray(params.categories) &&
                           params.categories.includes('party');

      // Build the query string based on parameters
      let queryString = '';

      // Add location to query if provided
      if (params.location) {
        if (isPartySearch) {
          // For party searches, add party keywords to the location search
          queryString = `parties in ${params.location}`;
        } else {
          queryString = `events in ${params.location}`;
        }
      } else if (params.latitude !== undefined && params.longitude !== undefined) {
        // For coordinate-based searches
        if (isPartySearch) {
          queryString = 'parties nearby';
        } else {
          queryString = 'events nearby';
        }
      } else {
        // Default fallback
        queryString = isPartySearch ? 'popular parties' : 'popular events';
      }

      // If this is a party search, enhance the query with party keywords
      if (isPartySearch && params.keyword) {
        queryString += ` ${params.keyword}`;
      } else if (isPartySearch) {
        // Add party-related keywords to improve results
        queryString += ' nightclub dj dance festival celebration';

        // Add specific keywords based on party subcategory
        if (params.partySubcategory) {
          switch (params.partySubcategory) {
            case 'nightclub':
              queryString += ' club nightlife dj';
              break;
            case 'festival':
              queryString += ' festival music concert';
              break;
            case 'brunch':
              queryString += ' brunch daytime';
              break;
            case 'day party':
              queryString += ' day party daytime pool rooftop';
              break;
          }
        }
      } else if (params.keyword) {
        // Add any provided keywords
        queryString += ` ${params.keyword}`;
      }

      // Set the query parameter
      queryParams.append('query', queryString);
      console.log(`[RAPIDAPI] Using query string: "${queryString}"`);

      // Add date parameter - valid values for RapidAPI:
      // all, today, tomorrow, week, weekend, next_week, month, next_month
      if (params.startDate) {
        // If we have a specific start date, use 'month' to get a wider range
        queryParams.append('date', 'month');
      } else {
        // Default to 'today' to ensure we only get events from today forward
        queryParams.append('date', 'today');
      }
      console.log(`[RAPIDAPI] Using date parameter: ${params.startDate ? 'month' : 'today'}`);

      // Set is_virtual parameter to false to only get in-person events
      queryParams.append('is_virtual', 'false');

      // Add start parameter for pagination (0-based index)
      queryParams.append('start', params.page ? ((params.page - 1) * (params.limit || 20)).toString() : '0');

      // Add limit parameter to get more results
      queryParams.append('limit', '100'); // Request 100 events to have enough after filtering
      console.log(`[RAPIDAPI] Requesting 100 events`);

      // Build the complete URL for the RapidAPI Events Search API
      const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;

      console.log(`[RAPIDAPI] Sending request to: ${url}`);

      // Make the API call
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`RapidAPI request failed with status: ${response.status}`);
      }

      // Parse the JSON response
      const data = await response.json();

      // Get raw events from the response
      const rawEvents = data.data || [];
      console.log(`[RAPIDAPI] Received ${rawEvents.length} raw events from RapidAPI`);

      // Transform events to our standardized format
      let transformedEvents = rawEvents.map(transformRapidAPIEvent);

      // Filter events based on parameters
      if (params.categories && Array.isArray(params.categories)) {
        // If searching for party events, filter to only include party events
        if (params.categories.includes('party')) {
          console.log('[RAPIDAPI] Filtering for party events only');
          transformedEvents = transformedEvents.filter(event =>
            event.isPartyEvent || event.category === 'party'
          );
          console.log(`[RAPIDAPI] Found ${transformedEvents.length} party events`);
        }
      }

      // Filter events by radius if coordinates are provided
      if (params.latitude !== undefined && params.longitude !== undefined && params.radius) {
        console.log(`[RAPIDAPI] Filtering events within ${params.radius} miles of [${params.latitude}, ${params.longitude}]`);

        const userLat = params.latitude;
        const userLng = params.longitude;
        const radius = params.radius;

        transformedEvents = transformedEvents.filter(event => {
          // Get event coordinates
          const eventLat = event.latitude;
          const eventLng = event.longitude;

          // Skip events with invalid coordinates
          if (eventLat === null || eventLng === null ||
              eventLat === undefined || eventLng === undefined ||
              isNaN(Number(eventLat)) || isNaN(Number(eventLng))) {
            return false;
          }

          // Calculate distance between user and event
          const distance = calculateDistance(
            Number(userLat),
            Number(userLng),
            Number(eventLat),
            Number(eventLng)
          );

          // Return true if event is within the radius
          return distance <= radius;
        });

        console.log(`[RAPIDAPI] Found ${transformedEvents.length} events within ${radius} miles`);
      }

      // Filter by date range if provided
      if (params.startDate || params.endDate) {
        const startDate = params.startDate ? new Date(params.startDate) : new Date();
        const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3); // Default to 3 months from start date if no end date

        console.log(`[RAPIDAPI] Filtering events between ${startDate.toISOString()} and ${endDate.toISOString()}`);

        transformedEvents = transformedEvents.filter(event => {
          // Skip events without a date
          if (!event.rawDate) return false;

          // Parse the event date
          const eventDate = new Date(event.rawDate);

          // Return true if event is within the date range
          return eventDate >= startDate && eventDate <= endDate;
        });

        console.log(`[RAPIDAPI] Found ${transformedEvents.length} events within date range`);
      }

      // Filter out excluded events
      if (params.excludeIds && Array.isArray(params.excludeIds) && params.excludeIds.length > 0) {
        transformedEvents = transformedEvents.filter(event =>
          !params.excludeIds?.includes(event.id)
        );
      }

      // Filter by party subcategory if provided
      if (params.partySubcategory && params.partySubcategory !== 'all') {
        console.log(`[RAPIDAPI] Filtering for party subcategory: ${params.partySubcategory}`);
        transformedEvents = transformedEvents.filter(event =>
          event.partySubcategory === params.partySubcategory
        );
        console.log(`[RAPIDAPI] Found ${transformedEvents.length} events with subcategory ${params.partySubcategory}`);
      }

      // Sort events by date (soonest first)
      transformedEvents.sort((a, b) => {
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
      });

      // Limit the number of events if requested
      const totalEvents = transformedEvents.length;
      if (params.limit && transformedEvents.length > params.limit) {
        const startIndex = params.page ? (params.page - 1) * params.limit : 0;
        transformedEvents = transformedEvents.slice(startIndex, startIndex + params.limit);
      }

      // Return the filtered events
      return {
        events: transformedEvents,
        sourceStats: {
          rapidapi: {
            count: transformedEvents.length,
            error: null
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          totalEvents,
          page: params.page || 1,
          limit: params.limit || totalEvents,
          hasMore: params.limit ? totalEvents > params.page * params.limit : false
        }
      };
    } catch (error) {
      console.error(`[RAPIDAPI] Error searching RapidAPI events (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      retries++;

      // Wait before retrying
      if (retries < MAX_RETRIES) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        console.log(`[RAPIDAPI] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError || new Error('Failed to search RapidAPI events after multiple attempts');
}

/**
 * Get event details from RapidAPI directly
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} - Event details
 */
async function getEventDetailsDirectly(eventId: string): Promise<{
  event: Event | null;
  error: string | null;
}> {
  // Get the RapidAPI key
  const rapidApiKey = await getApiKey('rapidapi');
  if (!rapidApiKey) {
    throw new Error('RapidAPI key not available');
  }

  // Extract the actual event ID from our prefixed ID
  const actualEventId = eventId.startsWith('rapidapi_')
    ? eventId.substring('rapidapi_'.length)
    : eventId;

  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`[RAPIDAPI] Getting event details (attempt ${retries + 1}/${MAX_RETRIES})`);

      // Build the query URL
      const url = `https://real-time-events-search.p.rapidapi.com/event-details?event_id=${encodeURIComponent(actualEventId)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`RapidAPI event details request failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.data) {
        throw new Error('Invalid response from RapidAPI event details endpoint');
      }

      // Transform the event
      const transformedEvent = transformRapidAPIEvent(data.data);

      return {
        event: transformedEvent,
        error: null
      };
    } catch (error) {
      console.error(`[RAPIDAPI] Error fetching event details (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      retries++;

      // Wait before retrying
      if (retries < MAX_RETRIES) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        console.log(`[RAPIDAPI] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, return the error
  return {
    event: null,
    error: lastError ? lastError.message : 'Failed to fetch event details after multiple attempts'
  };
}

/**
 * Transform a RapidAPI event to our standardized format
 * @param {Object} event - Raw event from RapidAPI
 * @returns {Object} - Standardized event object
 */
function transformRapidAPIEvent(event: any): Event {
  // Extract venue information
  const venue = event.venue?.name || '';
  const location = event.venue?.full_address ||
                  `${event.venue?.city || ''}, ${event.venue?.state || ''}`.trim() ||
                  'Location not specified';

  // Extract date and time
  const rawDate = event.start_time_utc || event.start_time || event.date_human_readable;
  let dateObj = null;

  if (event.start_time_utc) {
    dateObj = new Date(event.start_time_utc);
  } else if (event.start_time) {
    dateObj = new Date(event.start_time);
  } else if (event.date_human_readable) {
    // Try to parse the human-readable date
    try {
      const parts = event.date_human_readable.split(' ');
      if (parts.length >= 3) {
        // Format might be like "Monday, June 10, 2023"
        dateObj = new Date(parts.slice(1).join(' '));
      }
    } catch (e) {
      console.warn('[RAPIDAPI] Could not parse date:', event.date_human_readable);
    }
  }

  // Format the date and time
  const date = dateObj
    ? dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : event.date_human_readable || 'Date not specified';

  const time = dateObj
    ? dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : '';

  // Extract coordinates
  let coordinates: [number, number] | undefined = undefined;
  let eventLatitude: number | undefined = undefined;
  let eventLongitude: number | undefined = undefined;

  if (event.venue?.latitude !== undefined && event.venue?.longitude !== undefined) {
    eventLatitude = event.venue.latitude;
    eventLongitude = event.venue.longitude;
    coordinates = [eventLongitude, eventLatitude];
  }

  // Enhanced party detection with expanded keywords
  const partyKeywords = [
    'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
    'festival', 'celebration', 'gala', 'social', 'mixer', 'nightclub',
    'disco', 'bash', 'soiree', 'fiesta', 'shindig', 'get-together',
    'brunch', 'day party', 'pool party', 'rooftop', 'concert', 'live music',
    'edm', 'hip hop', 'techno', 'house music', 'afterparty', 'after party',
    'vip', 'bottle service', 'bar crawl', 'music festival'
  ];

  // Venue-specific keywords that strongly indicate a party venue
  const partyVenueKeywords = [
    'club', 'lounge', 'bar', 'nightclub', 'disco', 'hall', 'arena',
    'venue', 'rooftop', 'terrace', 'garden', 'pool'
  ];

  const nameLower = event.name?.toLowerCase() || '';
  const descriptionLower = event.description?.toLowerCase() || '';
  const venueLower = venue.toLowerCase();

  const hasPartyKeyword =
    partyKeywords.some(keyword => nameLower.includes(keyword)) ||
    partyKeywords.some(keyword => descriptionLower.includes(keyword));

  // Check if venue name contains party venue keywords
  const hasPartyVenue = partyVenueKeywords.some(keyword => venueLower.includes(keyword));

  const isPartyEvent = hasPartyKeyword || hasPartyVenue;

  // Determine event category and subcategory
  let category = 'other';
  let partySubcategory: string | undefined = undefined;

  if (isPartyEvent) {
    category = 'party';
    partySubcategory = 'general';

    // Determine party subcategory
    if (nameLower.includes('festival') || descriptionLower.includes('festival')) {
      partySubcategory = 'festival';
    } else if (nameLower.includes('brunch') || descriptionLower.includes('brunch')) {
      partySubcategory = 'brunch';
    } else if ((nameLower.includes('day') && nameLower.includes('party')) ||
               (descriptionLower.includes('day') && descriptionLower.includes('party'))) {
      partySubcategory = 'day party';
    } else if (nameLower.includes('club') || descriptionLower.includes('club') ||
               nameLower.includes('nightlife') || descriptionLower.includes('nightlife')) {
      partySubcategory = 'nightclub';
    }
  }

  // Get event URL and ticket URL
  const eventUrl = event.link || '';
  let ticketUrl = '';

  if (event.ticket_links && event.ticket_links.length > 0) {
    ticketUrl = event.ticket_links[0].link || '';
  }

  // Get event image
  const eventImage = event.thumbnail || 'https://placehold.co/600x400?text=No+Image';

  // Create standardized event object
  return {
    id: `rapidapi_${event.event_id}`,
    source: 'rapidapi',
    title: event.name,
    description: event.description || '',
    date,
    time,
    location,
    venue,
    category,
    partySubcategory,
    image: eventImage,
    imageAlt: `${event.name} event image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: eventUrl,
    rawDate,
    isPartyEvent,
    ticketInfo: {
      price: 'Check website for prices',
      minPrice: undefined,
      maxPrice: undefined,
      currency: 'USD',
      availability: 'available',
      purchaseUrl: ticketUrl || eventUrl,
      provider: 'RapidAPI'
    },
    websites: {
      tickets: ticketUrl || eventUrl,
      official: eventUrl
    }
  };
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Convert latitude and longitude from degrees to radians
  const radLat1 = (Math.PI * lat1) / 180;
  const radLon1 = (Math.PI * lon1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;
  const radLon2 = (Math.PI * lon2) / 180;

  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Earth's radius in miles
  const R = 3958.8;

  // Calculate the distance
  const distance = R * c;

  return distance;
}
