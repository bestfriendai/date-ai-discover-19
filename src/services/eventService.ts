import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { normalizeTicketmasterEvent, normalizeSerpApiEvent } from '@/utils/eventNormalizers';

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
}

// Fetch events from multiple sources
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  totalEvents?: number;
  pageSize?: number;
  page?: number;
}> {
  try {
    // Prepare parameters for API calls
    const searchParams = {
      keyword: params.keyword || '',
      lat: params.latitude,
      lng: params.longitude,
      location: params.location,
      radius: params.radius || 30,
      startDate: params.startDate,
      endDate: params.endDate,
      categories: params.categories,
      limit: params.limit || 200, // Fetch up to 200 events
      page: params.page || 1,
      excludeIds: params.excludeIds || [],
      fields: params.fields || []
    };

    // --- Patch: Ensure PredictHQ always gets a valid location ---
    // Only for PredictHQ, if location is missing but lat/lng exist, synthesize a location string for PredictHQ
    // This must NOT interfere with other APIs that use 'location' differently.
    // So, add a new field for PredictHQ-specific location if needed.
    let predictHQLocation = params.location;
    if (params.latitude && params.longitude) {
      // PredictHQ expects coordinates in a specific format for the 'within' parameter
      // Format: {radius}km@{lat},{lng}
      const radius = params.radius || 30;
      const isLatValid = typeof params.latitude === 'number' && params.latitude >= -90 && params.latitude <= 90;
      const isLngValid = typeof params.longitude === 'number' && params.longitude >= -180 && params.longitude <= 180;
      if (isLatValid && isLngValid) {
        const radiusKm = Math.round(radius * 1.60934); // Convert miles to km
        predictHQLocation = `${radiusKm}km@${params.latitude},${params.longitude}`;
        console.log('[DEBUG] Created PredictHQ location string:', predictHQLocation);
      } else {
        console.warn('[WARNING] Invalid latitude or longitude provided for PredictHQ:', params.latitude, params.longitude);
        predictHQLocation = params.location || '';
      }
    } else if (predictHQLocation) {
      // If a location string is provided, use it
      console.log('[DEBUG] Using provided location for PredictHQ:', predictHQLocation);
    } else {
      // No valid location, fallback to empty string
      predictHQLocation = '';
      console.warn('[WARNING] No valid location or coordinates for PredictHQ. Will fallback to default on backend.');
    }
    // Add a dedicated field so only the backend PredictHQ handler uses it
    searchParams['predicthqLocation'] = predictHQLocation;

    console.log('[DEBUG] Sending search params to simple-events function:', searchParams);

    try {
      // Call Supabase function to fetch events from multiple sources
      console.log('[DEBUG] About to call supabase.functions.invoke("simple-events")');

      // Log the Supabase function URL
      console.log('[DEBUG] Supabase function URL:', {
        functionName: 'simple-events',
        hasClient: !!supabase
      });

      // Add timeout handling for the function call
      const timeoutMs = 30000; // 30 seconds timeout
      const functionPromise = supabase.functions.invoke('simple-events', { // Use simple-events function
        body: searchParams,
        headers: { 'Content-Type': 'application/json' }
      });

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Function invocation timed out')), timeoutMs);
      });

      // Race the function call against the timeout
      const { data, error } = await Promise.race([
        functionPromise,
        timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout exceeded', status: 408 } }))
      ]) as any;

      if (error) {
        console.error('[ERROR] Supabase function error:', error);
        // Return a structured error response instead of throwing
        return {
          events: [],
          sourceStats: {
            ticketmaster: { count: 0, error: error.message || String(error) },
            eventbrite: { count: 0 },
            serpapi: { count: 0 },
            error: { message: error.message || String(error), status: error.status || 500 }
          },
          totalEvents: 0,
          pageSize: params.limit || 200,
          page: params.page || 1
        };
      }

      console.log('[DEBUG] Supabase function response:', data);

      if (data?.sourceStats) {
        console.log(
          `[Events] Ticketmaster: ${data.sourceStats.ticketmaster.count} ${data.sourceStats.ticketmaster.error ? `(Error: ${data.sourceStats.ticketmaster.error})` : ''}`
        );
        console.log(
          `[Events] Eventbrite: ${data.sourceStats.eventbrite.count} ${data.sourceStats.eventbrite.error ? `(Error: ${data.sourceStats.eventbrite.error})` : ''}`
        );
        console.log(
          `[Events] Serpapi: ${data.sourceStats.serpapi.count} ${data.sourceStats.serpapi.error ? `(Error: ${data.sourceStats.serpapi.error})` : ''}`
        );
        console.log(
          `[Events] PredictHQ: ${data.sourceStats.predicthq.count} ${data.sourceStats.predicthq.error ? `(Error: ${data.sourceStats.predicthq.error})` : ''}`
        );

        // Add detailed PredictHQ debugging
        if (data.sourceStats.predicthq) {
          console.log('[PREDICTHQ_DEBUG] PredictHQ source stats:', data.sourceStats.predicthq);

          if (data.sourceStats.predicthq.error) {
            console.error('[PREDICTHQ_ERROR] PredictHQ API error:', data.sourceStats.predicthq.error);
          }

          if (data.sourceStats.predicthq.warnings) {
            console.warn('[PREDICTHQ_WARN] PredictHQ API warnings:', data.sourceStats.predicthq.warnings);
          }

          if (data.sourceStats.predicthq.details) {
            console.log('[PREDICTHQ_DEBUG] PredictHQ API details:', data.sourceStats.predicthq.details);
          }

          // Check if any events came from PredictHQ
          const predicthqEvents = data.events?.filter((event: any) => event.source === 'predicthq') || [];
          console.log(`[PREDICTHQ_DEBUG] Found ${predicthqEvents.length} events from PredictHQ`);

          if (predicthqEvents.length > 0) {
            console.log('[PREDICTHQ_DEBUG] First PredictHQ event:', predicthqEvents[0]);
          }
        }
      }

      // Check if we have events before returning
      if (!data?.events || data.events.length === 0) {
        console.log('[DEBUG] No events returned from API');

        // Check for specific errors in the source stats
        if (data?.sourceStats?.predicthq?.error) {
          console.error('[ERROR] PredictHQ API error:', data.sourceStats.predicthq.error);

          // If there's a specific error with PredictHQ, show it in the console
          if (data.sourceStats.predicthq.error.includes('within')) {
            console.error('[ERROR] PredictHQ location format error. Check the format of predicthqLocation.');
          }
        }

        // Return empty array instead of mock data
        return {
          events: [],
          sourceStats: data?.sourceStats || { ticketmaster: { count: 0 }, eventbrite: { count: 0 }, serpapi: { count: 0 } },
          totalEvents: 0,
          pageSize: params.limit || 200,
          page: params.page || 1
        };
      }

      // --- FILTER EVENTS: Only include those with image and description ---
      // Modified to be less strict - only require image OR description, not both
      const filteredEvents = (data.events || []).filter(
        (ev: any) =>
          // Require valid coordinates
          ev.coordinates &&
          Array.isArray(ev.coordinates) &&
          ev.coordinates.length === 2 &&
          // Require either image OR description
          (
            (!!ev.image && typeof ev.image === 'string' && ev.image.trim().length > 0) ||
            (!!ev.description && typeof ev.description === 'string' && ev.description.trim().length > 0)
          )
      );

      return {
        events: filteredEvents,
        sourceStats: data?.sourceStats,
        totalEvents: filteredEvents.length,
        pageSize: params.limit || 200,
        page: params.page || 1
      };
    } catch (error) {
      console.error('[ERROR] Error calling Supabase function:', error);
      // Return empty array with structured error information
      return {
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: String(error) },
          eventbrite: { count: 0 },
          serpapi: { count: 0 },
          error: { message: String(error), status: 500 }
        },
        totalEvents: 0,
        pageSize: params.limit || 200,
        page: params.page || 1
      };
    }
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
}

// Helper function to get mock data around the provided coordinates
// This function is kept for reference but not used in production
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getMockEvents(params: any): {
  events: Event[];
  sourceStats?: any;
  totalEvents?: number;
  pageSize?: number;
  page?: number;
} {
  console.log('[DEBUG] Generating mock events around', params.lat, params.lng);

  // Generate mock events around the specified coordinates
  const centerLat = params.lat || 40.7128;
  const centerLng = params.lng || -74.0060;
  const mockEvents: Event[] = [];

  // Generate events in a grid around the center
  for (let i = 0; i < 100; i++) { // Increased from 10 to 100
    // Create a variation from the center point (about 0.01 degrees is roughly 1 km)
    const latOffset = (Math.random() - 0.5) * 0.1; // Increased spread slightly
    const lngOffset = (Math.random() - 0.5) * 0.1; // Increased spread slightly

    mockEvents.push({
      id: `mock-${i}`,
      title: `Mock Event ${i}`,
      date: 'Sat, May 17',
      time: '07:00 PM',
      location: 'Mock Location',
      category: ['music', 'sports', 'arts & theatre', 'family', 'food'][i % 5],
      image: '/lovable-uploads/hamilton.jpg',
      coordinates: [centerLng + lngOffset, centerLat + latOffset],
      price: `$${Math.floor(Math.random() * 100)}.00`,
      description: 'This is a mock event for testing purposes'
    });
  }

  return {
    events: mockEvents,
    sourceStats: {
      mock: { count: mockEvents.length, error: null }
    },
    totalEvents: mockEvents.length, // Report the actual number of mock events
    pageSize: params.limit || 100,
    page: params.page || 1
  };
}

// Get event details by ID
export async function getEventById(id: string): Promise<Event | null> {
  try {
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

      return {
        id: localEvent.external_id,
        source: localEvent.source,
        title: localEvent.title,
        description: localEvent.description,
        date: new Date(localEvent.date_start).toISOString().split('T')[0],
        time: new Date(localEvent.date_start).toTimeString().slice(0, 5),
        location: localEvent.location_name,
        venue: localEvent.venue_name,
        category: localEvent.category,
        image: localEvent.image_url,
        url: localEvent.url,
        coordinates,
        price
      };
    }

    // If not in local database, fetch from API with timeout handling
    const timeoutMs = 20000; // 20 seconds timeout
    const functionPromise = supabase.functions.invoke('get-event', {
      body: { id }, // Use object directly instead of JSON.stringify
      headers: { 'Content-Type': 'application/json' }
    });

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function invocation timed out')), timeoutMs);
    });

    // Race the function call against the timeout
    const { data, error } = await Promise.race([
      functionPromise,
      timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout exceeded', status: 408 } }))
    ]) as any;

    if (error) {
      console.error('[ERROR] Error fetching event by ID:', error);
      return null;
    }

    if (!data?.event) return null;

    return data.event;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}
