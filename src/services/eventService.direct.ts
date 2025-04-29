import { supabase } from '@/integrations/supabase/client';
import { invokeFunctionWithRetry } from '@/integrations/supabase/functions-client';
import type { Event } from '@/types';
import { v4 as uuidv4 } from 'uuid';
/* Removed duplicate import */

// RapidAPI key configuration
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || 'YOUR_DEFAULT_KEY';
const RAPIDAPI_HOST = 'real-time-events-search.p.rapidapi.com';
// Type definitions for event response
interface EventResponse {
  events: Event[];
  sourceStats?: any;
  meta?: any;
  error?: string;
}
/* Removed duplicate declaration */
/* Removed duplicate declaration */

// Validate key exists
/* Removed duplicate comment */
/* Removed duplicate comment */
if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'YOUR_DEFAULT_KEY') {
  throw new Error('RapidAPI key not configured. Please set VITE_RAPIDAPI_KEY in your .env file');
}

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
  searchType?: 'coordinates' | 'location' | 'fallback';
}

// Cache for storing recent search results
interface CacheEntry {
  timestamp: number;
  data: EventSearchResult;
}

const searchCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Generate a cache key from search parameters
function generateCacheKey(params: any): string {
  return JSON.stringify({
    location: params.location,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    categories: params.categories,
    keyword: params.keyword,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit
  });
}

// Check if cache entry is valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Search for events using the direct RapidAPI integration.
 * This is the main entry point for event searches in the application.
 */
export async function searchEvents(params: SearchParams): Promise<EventSearchResult> {
  console.log('[EVENT_SERVICE] searchEvents called with params:', params);

  try {
    // Ensure all required parameters are present
    const searchParams = {
      startDate: params.startDate || new Date().toISOString().split('T')[0],
      endDate: params.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ahead
      location: params.location,
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 30, // Default to 30 miles radius
      categories: params.categories || [],
      keyword: params.keyword || '',
      limit: params.limit || 100,
      page: params.page || 1,
      excludeIds: params.excludeIds || []
    };

    console.log('[EVENT_SERVICE] Processed search params:', searchParams);

    // Check cache first
    const cacheKey = generateCacheKey(searchParams);
    if (searchCache[cacheKey] && isCacheValid(searchCache[cacheKey])) {
      console.log('[EVENT_SERVICE] Returning cached results');
      return searchCache[cacheKey].data;
    }

    // Make the direct RapidAPI call
    console.log('[EVENT_SERVICE] Making direct RapidAPI call');
    const result = await searchEventsDirectly(searchParams);

    // Cache the results
    searchCache[cacheKey] = {
      timestamp: Date.now(),
      data: result
    };

    // If there was an error with the direct call but we still want to return something
    if (result.error) {
      console.error('[EVENT_SERVICE] Direct RapidAPI call had an error:', result.error);

      // Only try the fallback if we have no events
      if (result.events.length === 0) {
        try {
          console.log('[EVENT_SERVICE] Falling back to Supabase function');
          // Use our custom function invoker with retry logic
          const data = await invokeFunctionWithRetry('search-events', searchParams);

          // Cache the fallback results
          if (data.events && data.events.length > 0) {
            searchCache[cacheKey] = {
              timestamp: Date.now(),
              data: data
            };
            return data;
          }
        } catch (functionError) {
          console.error('[EVENT_SERVICE] Error from function invocation:', functionError);
          // Continue with the original result even if fallback fails
        }
      }
    }

    return result;
  } catch (error) {
    console.error('[ERROR] Error searching events:', error);
    return {
      events: [],
      sourceStats: {
        rapidapi: { count: 0, error: String(error) }
      },
      meta: {
        error: String(error),
        timestamp: new Date().toISOString(),
        totalEvents: 0
      }
    };
  }
}

/**
 * Get event details by ID from RapidAPI or local database.
 * @param id - The event ID to fetch
 * @returns The event details or null if not found
 */
export async function getEventById(id: string): Promise<Event | null> {
  // Add UUID validation
  if (!uuidv4.validate(id)) {
    console.warn(`[EVENT_SERVICE] Invalid event ID format: ${id}`);
    return null;
  }
  // Add UUID validation
  /* Removed duplicate validation */
    /* Removed duplicate validation check */
    return null;
  }
  try {
    // Check if this is a RapidAPI event
    if (id.startsWith('rapidapi_')) {
      try {
        console.log(`[EVENT_SERVICE] Fetching RapidAPI event details for ID: ${id}`);
        const result = await getEventDetailsDirectly(id);
        if (result.event) {
          return result.event;
        } else {
          console.warn(`[EVENT_SERVICE] No event data returned from RapidAPI for ID: ${id}`);
          console.warn(`[EVENT_SERVICE] Error: ${result.error}`);
        }
      } catch (error) {
        console.error('[EVENT_SERVICE] Error fetching RapidAPI event details:', error);
      }
    }

    // Check local database
    try {
      const { data: localEvent, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.warn(`[EVENT_SERVICE] Supabase error fetching event ID ${id}:`, error.message);
      }

      if (localEvent) {
        console.log(`[EVENT_SERVICE] Found event in local database: ${id}`);
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
          id: localEvent.id || localEvent.external_id,
          source: localEvent.source,
          title: localEvent.title,
          description: localEvent.description,
          date: new Date(localEvent.date_start).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
          }),
          time: new Date(localEvent.date_start).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
          }),
          location: localEvent.location_name,
          venue: localEvent.venue_name,
          category: localEvent.category,
          image: localEvent.image_url,
          imageAlt: `${localEvent.title} event image`,
          url: localEvent.url,
          coordinates,
          latitude: coordinates ? coordinates[1] : undefined,
          longitude: coordinates ? coordinates[0] : undefined,
          price,
          rawDate: localEvent.date_start
        };
      }
    } catch (dbError) {
      console.error('[EVENT_SERVICE] Error querying local database:', dbError);
    }

    // If not found locally or in RapidAPI, try Supabase function
    try {
      console.log(`[EVENT_SERVICE] Fetching event details from Supabase function for ID: ${id}`);
      const data = await invokeFunctionWithRetry('get-event', { id });

      if (!data?.event) {
        console.warn(`[EVENT_SERVICE] No event data returned from function for ID: ${id}`);
        return null;
      }

      console.log(`[EVENT_SERVICE] Successfully retrieved event from function: ${id}`);
      return data.event;
    } catch (functionError) {
      console.error('[EVENT_SERVICE] Error fetching event by ID from function:', functionError);
      return null;
    }
  } catch (error) {
    console.error('[EVENT_SERVICE] Unhandled error getting event by ID:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}

/**
 * Search for events using RapidAPI directly.
 * @param {Object} params - Search parameters
 * @returns {Promise<EventSearchResult>} - Search results
 */
async function searchEventsDirectly(params: SearchParams): Promise<EventSearchResult> {
  console.log('[RAPIDAPI_DIRECT] Searching events with params:', params);

  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'YOUR_DEFAULT_KEY') {
    console.error('[RAPIDAPI_DIRECT] RapidAPI Key is missing or default value. Please configure in .env');
    return {
      events: [],
      error: 'RapidAPI key is not configured.',
      status: 500,
      sourceStats: { rapidapi: { count: 0, error: 'API key missing' } },
      meta: { timestamp: new Date().toISOString(), totalEvents: 0 }
    };
  }

  const queryParams = new URLSearchParams();
  let queryString = '';
  const isPartySearch = params.categories?.includes('party');

  // Build Query String
  if (params.latitude !== undefined && params.longitude !== undefined) {
    const lat = Number(params.latitude).toFixed(6);
    const lng = Number(params.longitude).toFixed(6);
    queryString = `events near ${lat},${lng}`;
    if (isPartySearch) {
      queryString = `party events near ${lat},${lng}`; // More specific for parties
    }
    console.log(`[RAPIDAPI_DIRECT] Using coordinates for query: ${queryString}`);
  } else if (params.location) {
    queryString = `events in ${params.location}`;
    if (isPartySearch) {
      queryString = `party events in ${params.location}`;
    }
    console.log(`[RAPIDAPI_DIRECT] Using location name for query: ${queryString}`);
  } else {
    queryString = isPartySearch ? 'popular party events' : 'popular events'; // Fallback
    console.log(`[RAPIDAPI_DIRECT] Using fallback query: ${queryString}`);
  }

  // Add keyword if provided
  if (params.keyword) {
    queryString += ` ${params.keyword}`;
  }
  // Add more party keywords if it's a party search without specific keywords
  else if (isPartySearch) {
    queryString += ' club dj dance nightlife festival celebration';
  }

  queryParams.append('query', queryString);
  console.log(`[RAPIDAPI_DIRECT] Final Query String: "${queryString}"`);

  // API Parameters
  queryParams.append('date', 'month'); // Get upcoming events for the next month
  queryParams.append('is_virtual', 'false');
  queryParams.append('start', params.page ? ((params.page - 1) * (params.limit || 100)).toString() : '0');
  queryParams.append('limit', (params.limit || 100).toString()); // Get more results for filtering
  queryParams.append('sort', 'relevance'); // Sort by relevance

  const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
  console.log(`[RAPIDAPI_DIRECT] Request URL: ${url.substring(0, 150)}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[RAPIDAPI_DIRECT] Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RAPIDAPI_DIRECT] Request failed: ${response.status}`, errorText.substring(0, 500));
      throw new Error(`RapidAPI request failed: ${response.status}`);
    }

    const data = await response.json();
    const rawEvents = data?.data || [];
    console.log(`[RAPIDAPI_DIRECT] Received ${rawEvents.length} raw events.`);

    // --- Transformation & Filtering ---
    let transformedEvents = rawEvents
      .map(transformRapidAPIEvent)
      .filter((event): event is Event => event !== null); // Filter out nulls from failed transformations

    console.log(`[RAPIDAPI_DIRECT] Successfully transformed ${transformedEvents.length} events.`);

    // --- Post-Fetch Filtering (Radius, Date) ---
    // 1. Filter by Date (ensure only future events)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const initialCountBeforeDateFilter = transformedEvents.length;
    transformedEvents = transformedEvents.filter((event: Event) => {
      if (!event.rawDate) return true; // Keep if date is uncertain
      try {
        const eventDate = new Date(event.rawDate);
        return !isNaN(eventDate.getTime()) && eventDate >= today;
      } catch (e) { return true; } // Keep if date parsing fails
    });
    console.log(`[RAPIDAPI_DIRECT] Filtered out past events: ${initialCountBeforeDateFilter} -> ${transformedEvents.length}`);

    // 2. Filter by Radius (if coordinates were provided in the original request)
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius !== undefined) {
      const initialCountBeforeRadiusFilter = transformedEvents.length;
      const userLat = Number(params.latitude);
      const userLng = Number(params.longitude);
      const radiusMiles = Number(params.radius);

      if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(radiusMiles) && radiusMiles > 0) {
        transformedEvents = transformedEvents.filter((event: Event) => {
          const eventLat = event.latitude;
          const eventLng = event.longitude;
          if (eventLat === undefined || eventLng === undefined || isNaN(eventLat) || isNaN(eventLng)) {
            return false; // Exclude events without valid coordinates for radius filtering
          }
          const distance = calculateDistance(userLat, userLng, eventLat, eventLng);
          return distance <= radiusMiles;
        });
        console.log(`[RAPIDAPI_DIRECT] Filtered by radius (${radiusMiles} miles): ${initialCountBeforeRadiusFilter} -> ${transformedEvents.length}`);
      } else {
        console.warn('[RAPIDAPI_DIRECT] Invalid coordinates or radius for filtering.');
      }
    }

    // 3. Filter by Category if specifically requested (beyond party)
    if (params.categories && params.categories.length > 0) {
      const initialCountBeforeCategoryFilter = transformedEvents.length;

      // If party category is requested, filter for party events
      if (isPartySearch) {
        transformedEvents = transformedEvents.filter(event =>
          event.isPartyEvent || event.category === 'party'
        );
      }
      // Otherwise filter by other categories
      else {
        const requestedCategories = params.categories.map(c => c.toLowerCase());
        transformedEvents = transformedEvents.filter(event =>
          event.category && requestedCategories.includes(event.category.toLowerCase())
        );
      }
      console.log(`[RAPIDAPI_DIRECT] Filtered by categories (${params.categories.join(', ')}): ${initialCountBeforeCategoryFilter} -> ${transformedEvents.length}`);
    }

    // 4. Filter by Date Range if provided
    if (params.startDate || params.endDate) {
      const initialCountBeforeDateRangeFilter = transformedEvents.length;
      const startDate = params.startDate ? new Date(params.startDate) : new Date();
      const endDate = params.endDate ? new Date(params.endDate) : new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Default to 3 months if only start date provided

      transformedEvents = transformedEvents.filter(event => {
        if (!event.rawDate) return true; // Keep if date is uncertain
        try {
          const eventDate = new Date(event.rawDate);
          return !isNaN(eventDate.getTime()) && eventDate >= startDate && eventDate <= endDate;
        } catch (e) { return true; } // Keep if date parsing fails
      });
      console.log(`[RAPIDAPI_DIRECT] Filtered by date range: ${initialCountBeforeDateRangeFilter} -> ${transformedEvents.length}`);
    }

    // 5. Filter out excluded events
    if (params.excludeIds && params.excludeIds.length > 0) {
      const initialCountBeforeExcludeFilter = transformedEvents.length;
      transformedEvents = transformedEvents.filter(event =>
        !params.excludeIds?.includes(event.id)
      );
      console.log(`[RAPIDAPI_DIRECT] Filtered out excluded events: ${initialCountBeforeExcludeFilter} -> ${transformedEvents.length}`);
    }

    // 6. Sort events by date (soonest first)
    transformedEvents.sort((a, b) => {
      if (!a.rawDate) return 1;
      if (!b.rawDate) return -1;
      return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
    });

    // 7. Apply pagination if requested
    const totalEvents = transformedEvents.length;
    if (params.limit && params.page) {
      const startIndex = (params.page - 1) * params.limit;
      transformedEvents = transformedEvents.slice(startIndex, startIndex + params.limit);
    } else if (params.limit) {
      transformedEvents = transformedEvents.slice(0, params.limit);
    }

    console.log(`[RAPIDAPI_DIRECT] Returning ${transformedEvents.length} final events.`);

    return {
      events: transformedEvents,
      sourceStats: { rapidapi: { count: transformedEvents.length, error: null } },
      meta: {
        timestamp: new Date().toISOString(),
        totalEvents: totalEvents,
        page: params.page || 1,
        limit: params.limit || totalEvents,
        hasMore: params.limit ? totalEvents > (params.page || 1) * params.limit : false
      }
    };

  } catch (error) {
    console.error('[RAPIDAPI_DIRECT] Fetch or processing error:', error);
    return {
      events: [],
      error: `Error fetching/processing events: ${error instanceof Error ? error.message : String(error)}`,
      status: 500, // Indicate internal error
      sourceStats: { rapidapi: { count: 0, error: error instanceof Error ? error.message : String(error) } },
      meta: { timestamp: new Date().toISOString(), totalEvents: 0 }
    };
  }
}

/**
 * Get event details directly from RapidAPI.
 * @param {string} eventId - The RapidAPI event ID (without the 'rapidapi_' prefix).
 * @returns {Promise<EventDetailResult>} - Event details response
 */
async function getEventDetailsDirectly(eventId: string): Promise<EventDetailResult> {
  const actualEventId = eventId.startsWith('rapidapi_') ? eventId.substring(9) : eventId;
  console.log(`[RAPIDAPI_DIRECT] Getting details for event ID: ${actualEventId}`);

  if (!RAPIDAPI_KEY) {
    console.error('[RAPIDAPI_DIRECT] RapidAPI Key is missing for getEventDetailsDirectly!');
    return { event: null, error: 'RapidAPI key not configured' };
  }

  const url = `https://real-time-events-search.p.rapidapi.com/event-details?event_id=${encodeURIComponent(actualEventId)}`;
  console.log(`[RAPIDAPI_DIRECT] Requesting details from: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    console.log(`[RAPIDAPI_DIRECT] Details Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RAPIDAPI_DIRECT] Details request failed: ${response.status}`, errorText.substring(0, 500));
      return { event: null, error: `RapidAPI details request failed: ${response.status}` };
    }

    const data = await response.json();
    if (!data || !data.data) {
      console.warn('[RAPIDAPI_DIRECT] Invalid details response format.');
      return { event: null, error: 'Invalid details response from API' };
    }

    const transformedEvent = transformRapidAPIEvent(data.data);
    if (!transformedEvent) {
      console.warn('[RAPIDAPI_DIRECT] Failed to transform event details.');
      return { event: null, error: 'Failed to process event details' };
    }

    console.log(`[RAPIDAPI_DIRECT] Successfully retrieved and transformed details for event: ${transformedEvent.id}`);
    return { event: transformedEvent, error: null };

  } catch (error) {
    console.error(`[RAPIDAPI_DIRECT] Error fetching event details:`, error);
    return { event: null, error: `Error fetching details: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Transform a single RapidAPI event object into our standard Event format.
 * @param rawEvent - The raw event object from the RapidAPI response.
 * @returns A normalized Event object or null if transformation fails.
 */
function transformRapidAPIEvent(rawEvent: any): Event | null {
  // Add validation for required fields
  if (!rawEvent || !rawEvent.event_id || !rawEvent.name) {
    console.warn('[TRANSFORM] Skipping invalid raw event:', rawEvent?.event_id);
    return null;
  }
  // Add validation for required fields
  if (!rawEvent || !rawEvent.event_id || !rawEvent.name) {
    console.warn('[TRANSFORM] Skipping invalid raw event:', rawEvent?.event_id);
    return null;
  }
  try {
    if (!rawEvent || !rawEvent.event_id || !rawEvent.name) {
      console.warn('[TRANSFORM] Skipping invalid raw event:', rawEvent?.event_id);
      return null;
    }

    const venue = rawEvent.venue;
    const venueName = venue?.name || '';

    // Build a detailed location string, preferring full address
    const locationParts = [
      venueName,
      venue?.full_address, // Use full address if available
      venue?.city,
      venue?.state,
      venue?.country
    ].filter(Boolean); // Filter out null/undefined/empty strings
    const location = Array.from(new Set(locationParts)).join(', ').trim() || 'Location not specified';

    // --- Date & Time ---
    const rawDate = rawEvent.start_time_utc || rawEvent.start_time || rawEvent.date_human_readable;
    let date = 'Date TBA';
    let time = 'Time TBA';
    let eventDateObj: Date | null = null;
    if (rawDate) {
      try {
        eventDateObj = new Date(rawDate);
        if (!isNaN(eventDateObj.getTime())) {
          date = eventDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
          time = eventDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else {
          date = rawEvent.date_human_readable || 'Date TBA'; // Fallback
        }
      } catch (e) {
        console.warn(`[TRANSFORM] Error parsing date ${rawDate}:`, e);
        date = rawEvent.date_human_readable || 'Date TBA';
      }
    }

    // --- Coordinates ---
    let coordinates: [number, number] | undefined = undefined;
    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;
    if (venue?.latitude !== undefined && venue?.longitude !== undefined) {
      const lat = parseFloat(String(venue.latitude));
      const lng = parseFloat(String(venue.longitude));
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        coordinates = [lng, lat]; // GeoJSON format [longitude, latitude]
      }
    }

    // --- Description ---
    let description = rawEvent.description || '';
    // Combine description with venue name for better party detection context
    const enhancedDescription = `${description} ${venueName}`.trim();

    // --- Category & Party Detection ---
    const title = rawEvent.name || 'Unnamed Event';

    // Enhanced party detection with expanded keywords
    const partyKeywords = [
      'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
      'festival', 'celebration', 'gala', 'social', 'mixer', 'nightclub',
      'disco', 'bash', 'soiree', 'fiesta', 'shindig', 'get-together',
      'brunch', 'day party', 'pool party', 'rooftop', 'concert', 'live music',
      'edm', 'hip hop', 'techno', 'house music', 'afterparty', 'after party',
      'vip', 'bottle service'
    ];

    const titleLower = title.toLowerCase();
    const descLower = enhancedDescription.toLowerCase();

    const isParty =
      partyKeywords.some(keyword => titleLower.includes(keyword)) ||
      partyKeywords.some(keyword => descLower.includes(keyword));

    const category = isParty ? 'party' : 'event'; // Simple categorization

    // Determine party subcategory
    let partySubcategory: string | undefined = undefined;

    if (isParty) {
      if (titleLower.includes('festival') || descLower.includes('festival')) {
        partySubcategory = 'immersive';
      } else if (titleLower.includes('brunch') || descLower.includes('brunch')) {
        partySubcategory = 'brunch';
      } else if ((titleLower.includes('day') && titleLower.includes('party')) ||
                (descLower.includes('day') && descLower.includes('party')) ||
                (time && time.length >= 5 && parseInt(time.substring(0, 2)) < 18 && parseInt(time.substring(0, 2)) > 8)) {
        partySubcategory = 'day-party';
      } else if (titleLower.includes('club') || descLower.includes('club') ||
                titleLower.includes('nightlife') || descLower.includes('nightlife') ||
                (time && time.length >= 5 && (parseInt(time.substring(0, 2)) >= 21 || parseInt(time.substring(0, 2)) < 4))) {
        partySubcategory = 'club';
      } else if (titleLower.includes('network') || descLower.includes('network') ||
                titleLower.includes('mixer') || descLower.includes('mixer') ||
                titleLower.includes('mingle') || descLower.includes('mingle')) {
        partySubcategory = 'networking';
      } else if (titleLower.includes('rooftop') || descLower.includes('rooftop')) {
        partySubcategory = 'rooftop';
      } else if (titleLower.includes('celebration') || descLower.includes('celebration') ||
                titleLower.includes('birthday') || descLower.includes('birthday') ||
                titleLower.includes('anniversary') || descLower.includes('anniversary')) {
        partySubcategory = 'celebration';
      } else {
        partySubcategory = 'general';
      }
    }

    // --- Image ---
    const image = rawEvent.thumbnail || 'https://placehold.co/600x400?text=No+Image';

    // --- Links ---
    const eventUrl = rawEvent.link || '';
    let ticketUrl = eventUrl; // Default to event link
    if (rawEvent.ticket_links && rawEvent.ticket_links.length > 0) {
      // Prioritize specific providers or just take the first link
      const tmLink = rawEvent.ticket_links.find((l: any) => l.source?.toLowerCase().includes('ticketmaster'));
      const ebLink = rawEvent.ticket_links.find((l: any) => l.source?.toLowerCase().includes('eventbrite'));
      const sgLink = rawEvent.ticket_links.find((l: any) => l.source?.toLowerCase().includes('seatgeek'));
      ticketUrl = ebLink?.link || tmLink?.link || sgLink?.link || rawEvent.ticket_links[0].link || ticketUrl;
    }

    // --- Price ---
    let price: string | undefined = undefined;
    if (rawEvent.ticket_info?.price) {
      price = String(rawEvent.ticket_info.price); // Assuming price is a string like "$25-$50"
    } else if (rawEvent.is_free === true) {
      price = 'Free';
    }

    // --- Tags ---
    let tags: string[] = [];
    if (rawEvent.tags && Array.isArray(rawEvent.tags)) {
      tags = rawEvent.tags;
    } else if (rawEvent.categories && Array.isArray(rawEvent.categories)) {
      tags = rawEvent.categories;
    }

    const normalizedEvent: Event = {
      id: `rapidapi_${rawEvent.event_id}`,
      source: 'rapidapi',
      title: title,
      description: description || undefined,
      date: date,
      time: time,
      location: location,
      venue: venueName || undefined,
      category: category,
      partySubcategory: partySubcategory,
      image: image,
      imageAlt: `${title} event image`,
      coordinates: coordinates,
      latitude: latitude,
      longitude: longitude,
      url: eventUrl || undefined,
      price: price,
      rawDate: rawDate || undefined,
      isPartyEvent: isParty,
      ticketInfo: {
        price: price || 'Check website for prices',
        minPrice: undefined,
        maxPrice: undefined,
        currency: 'USD',
        availability: 'available',
        purchaseUrl: ticketUrl || eventUrl,
        provider: 'RapidAPI'
      },
      websites: {
        tickets: ticketUrl || undefined,
        official: eventUrl !== ticketUrl ? eventUrl : undefined,
        venue: venue?.website || undefined
      },
      tags: tags
    };

    return normalizedEvent;

  } catch (error) {
    console.error(`[TRANSFORM] Error transforming event ID ${rawEvent?.event_id}:`, error);
    return null; // Return null for events that fail transformation
  }
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
  // Add validation for input parameters
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error('Invalid coordinates provided for distance calculation');
  }
  // Add validation for input parameters
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error('Invalid coordinates provided for distance calculation');
  }
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
