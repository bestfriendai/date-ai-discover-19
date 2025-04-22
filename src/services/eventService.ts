import { supabase, isSupabaseAvailable } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { normalizeTicketmasterEvent, normalizeSerpApiEvent } from '@/utils/eventNormalizers';
import { toast } from '@/hooks/use-toast';

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
  // Advanced filtering options
  priceRange?: [number, number];
  sortBy?: 'distance' | 'date' | 'price' | 'popularity';
  sortDirection?: 'asc' | 'desc';
  showFavoritesOnly?: boolean;
  // Personalization options
  userId?: string;
  preferredCategories?: string[];
  favoriteEventIds?: string[];
}

// Error class for event service errors
class EventServiceError extends Error {
  code?: string;
  status?: number;
  source?: string;

  constructor(message: string, options?: { code?: string; status?: number; source?: string }) {
    super(message);
    this.name = 'EventServiceError';
    this.code = options?.code;
    this.status = options?.status;
    this.source = options?.source;
  }
}

// Fetch events from multiple sources with improved error handling
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  totalEvents?: number;
  pageSize?: number;
  page?: number;
}> {
  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the event service. Please try again later.',
      variant: 'destructive'
    });

    throw new EventServiceError('Supabase connection is not available', {
      code: 'connection_error',
      status: 503,
      source: 'supabase'
    });
  }

  try {
    // Prepare parameters for API calls with validation
    const searchParams = {
      keyword: params.keyword || '',
      lat: params.latitude,
      lng: params.longitude,
      location: params.location,
      radius: Math.min(params.radius || 30, 100), // Limit radius to 100 miles max
      startDate: params.startDate,
      endDate: params.endDate,
      categories: params.categories,
      limit: Math.min(params.limit || 200, 500), // Limit to 500 events max
      page: Math.max(params.page || 1, 1), // Ensure page is at least 1
      excludeIds: params.excludeIds || [],
      fields: params.fields || [],
      // Advanced filtering options
      priceRange: params.priceRange,
      sortBy: ['distance', 'date', 'price', 'popularity'].includes(params.sortBy || '')
        ? params.sortBy
        : 'distance',
      sortDirection: ['asc', 'desc'].includes(params.sortDirection || '')
        ? params.sortDirection
        : 'asc',
      showFavoritesOnly: params.showFavoritesOnly || false,
      // Personalization options
      userId: params.userId,
      preferredCategories: params.preferredCategories || [],
      favoriteEventIds: params.favoriteEventIds || []
    };

    // --- Patch: Ensure PredictHQ always gets a valid location ---
    // Only for PredictHQ, if location is missing but lat/lng exist, synthesize a location string for PredictHQ
    // This must NOT interfere with other APIs that use 'location' differently.
    // So, add a new field for PredictHQ-specific location if needed.
    let predictHQLocation = params.location;
    if (params.latitude && params.longitude) {
      // PredictHQ expects coordinates in a specific format for the 'within' parameter
      // Format: {radius}km@{lat},{lng}
      const radiusKm = Math.round((params.radius || 30) * 1.60934); // Convert miles to km
      predictHQLocation = `${radiusKm}km@${params.latitude},${params.longitude}`;
      console.log('[DEBUG] Created PredictHQ location string:', predictHQLocation);
    } else if (predictHQLocation) {
      console.log('[DEBUG] Using provided location for PredictHQ:', predictHQLocation);
    }
    // Add a dedicated field so only the backend PredictHQ handler uses it
    searchParams['predicthqLocation'] = predictHQLocation;

    console.log('[DEBUG] Sending search params to search-events function:', searchParams);

    try {
      // Set timeout for the function call
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });

      // Call Supabase function to fetch events from multiple sources
      console.log('[DEBUG] About to call supabase.functions.invoke("search-events")');
      const fetchPromise = supabase.functions.invoke('search-events', {
        body: searchParams
      });

      // Race the fetch against the timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = result as Awaited<typeof fetchPromise>;

      if (error) {
        console.error('[ERROR] Supabase function error:', error);
        throw new EventServiceError(error.message || 'Error fetching events', {
          code: 'function_error',
          status: error.status || 500,
          source: 'search-events'
        });
      }

      console.log('[DEBUG] Supabase function response:', data);

      // Log source statistics
      if (data?.sourceStats) {
        console.log(
          `[Events] Ticketmaster: ${data.sourceStats.ticketmaster?.count || 0} ${data.sourceStats.ticketmaster?.error ? `(Error: ${data.sourceStats.ticketmaster.error})` : ''}`
        );
        console.log(
          `[Events] Eventbrite: ${data.sourceStats.eventbrite?.count || 0} ${data.sourceStats.eventbrite?.error ? `(Error: ${data.sourceStats.eventbrite.error})` : ''}`
        );
        console.log(
          `[Events] Serpapi: ${data.sourceStats.serpapi?.count || 0} ${data.sourceStats.serpapi?.error ? `(Error: ${data.sourceStats.serpapi.error})` : ''}`
        );
        console.log(
          `[Events] PredictHQ: ${data.sourceStats.predicthq?.count || 0} ${data.sourceStats.predicthq?.error ? `(Error: ${data.sourceStats.predicthq.error})` : ''}`
        );
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

        // Return empty array with source stats
        return {
          events: [],
          sourceStats: data?.sourceStats || {
            ticketmaster: { count: 0 },
            eventbrite: { count: 0 },
            serpapi: { count: 0 },
            predicthq: { count: 0 }
          },
          totalEvents: 0,
          pageSize: params.limit || 200,
          page: params.page || 1
        };
      }

      // --- FILTER EVENTS: Only include those with image and description ---
      const filteredEvents = (data.events || []).filter(
        (ev: any) =>
          !!ev.image &&
          typeof ev.image === 'string' &&
          ev.image.trim().length > 0 &&
          !!ev.description &&
          typeof ev.description === 'string' &&
          ev.description.trim().length > 0
      );

      return {
        events: filteredEvents,
        sourceStats: data?.sourceStats,
        totalEvents: filteredEvents.length,
        pageSize: params.limit || 200,
        page: params.page || 1
      };
    } catch (error: any) {
      console.error('[ERROR] Error calling Supabase function:', error);

      // Check for timeout error
      if (error.message === 'Request timeout') {
        toast({
          title: 'Request Timeout',
          description: 'The event search is taking too long. Please try again with more specific criteria.',
          variant: 'destructive'
        });
      }

      // Return empty array with error information
      return {
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: error.message || String(error) },
          eventbrite: { count: 0 },
          serpapi: { count: 0 },
          predicthq: { count: 0 }
        },
        totalEvents: 0,
        pageSize: params.limit || 200,
        page: params.page || 1
      };
    }
  } catch (error: any) {
    console.error('Error searching events:', error);

    // If it's already an EventServiceError, rethrow it
    if (error instanceof EventServiceError) {
      throw error;
    }

    // Otherwise, wrap it in an EventServiceError
    throw new EventServiceError(
      error.message || 'An unexpected error occurred while searching for events',
      {
        code: 'unexpected_error',
        status: error.status || 500,
        source: 'eventService'
      }
    );
  }
}

// Helper function to get mock data around the provided coordinates
function getMockEvents(params: any): {
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

// Get event details by ID with improved error handling
export async function getEventById(id: string): Promise<Event | null> {
  // Validate input
  if (!id) {
    throw new EventServiceError('Event ID is required', {
      code: 'invalid_input',
      status: 400,
      source: 'getEventById'
    });
  }

  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the event service. Please try again later.',
      variant: 'destructive'
    });

    throw new EventServiceError('Supabase connection is not available', {
      code: 'connection_error',
      status: 503,
      source: 'supabase'
    });
  }

  try {
    // First try to get the event from the local database
    const { data: localEvent, error: localError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (localError && localError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error('Database error fetching event:', localError);
      throw new EventServiceError(`Database error: ${localError.message}`, {
        code: localError.code,
        status: localError.code === 'PGRST116' ? 404 : 500,
        source: 'database'
      });
    }

    if (localEvent) {
      let coordinates: [number, number] | undefined;

      // Parse coordinates from the database format
      if (localEvent.location_coordinates) {
        try {
          // Handle different coordinate formats
          if (typeof localEvent.location_coordinates === 'string') {
            // Try to parse from string format like "(lng,lat)" or "lng,lat"
            const coordStr = localEvent.location_coordinates;
            const matches = coordStr.match(/\(([-\d.]+)\s+([-\d.]+)\)/) || coordStr.match(/([-\d.]+),([-\d.]+)/);
            if (matches) {
              coordinates = [parseFloat(matches[1]), parseFloat(matches[2])];
            }
          } else if (Array.isArray(localEvent.location_coordinates) && localEvent.location_coordinates.length === 2) {
            // Handle array format
            coordinates = [localEvent.location_coordinates[0], localEvent.location_coordinates[1]];
          } else if (typeof localEvent.location_coordinates === 'object') {
            // Handle object format with lng/lat properties
            const coords = localEvent.location_coordinates as any;
            if (coords.lng !== undefined && coords.lat !== undefined) {
              coordinates = [coords.lng, coords.lat];
            } else if (coords.longitude !== undefined && coords.latitude !== undefined) {
              coordinates = [coords.longitude, coords.latitude];
            }
          }
        } catch (error) {
          console.error('Error parsing coordinates:', error);
          // Don't throw, just continue without coordinates
        }
      }

      // Parse price from metadata
      let price: string | undefined;
      try {
        const metadata = localEvent.metadata || {};
        if (typeof metadata === 'object' && 'price' in metadata) {
          price = metadata.price as string;
        } else if (typeof metadata === 'string') {
          // Try to parse JSON string
          const parsedMetadata = JSON.parse(metadata);
          if (parsedMetadata && typeof parsedMetadata === 'object' && 'price' in parsedMetadata) {
            price = parsedMetadata.price as string;
          }
        }
      } catch (error) {
        console.error('Error parsing event metadata:', error);
        // Don't throw, just continue without price
      }

      // Format date and time
      let date = '';
      let time = '';
      try {
        const dateObj = new Date(localEvent.date_start);
        date = dateObj.toISOString().split('T')[0];
        time = dateObj.toTimeString().slice(0, 5);
      } catch (error) {
        console.error('Error parsing date:', error);
        // Use fallback date format
        date = localEvent.date_start?.split('T')[0] || '';
      }

      return {
        id: localEvent.external_id || localEvent.id,
        source: localEvent.source || 'database',
        title: localEvent.title || 'Untitled Event',
        description: localEvent.description || '',
        date,
        time,
        location: localEvent.location_name || localEvent.location_address || '',
        venue: localEvent.venue_name || '',
        category: localEvent.category || 'other',
        image: localEvent.image_url || '',
        url: localEvent.url || '',
        coordinates,
        price
      };
    }

    // If not in local database, fetch from API with timeout
    console.log('[DEBUG] Event not found in local database, fetching from API');

    try {
      // Set timeout for the function call
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
      });

      // Call Supabase function to fetch the event
      const fetchPromise = supabase.functions.invoke('get-event', {
        body: { id }
      });

      // Race the fetch against the timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = result as Awaited<typeof fetchPromise>;

      if (error) {
        console.error('[ERROR] Supabase function error:', error);
        throw new EventServiceError(`API error: ${error.message}`, {
          code: 'function_error',
          status: error.status || 500,
          source: 'get-event'
        });
      }

      if (!data?.event) {
        console.log('[DEBUG] Event not found in API');
        return null;
      }

      return data.event;
    } catch (error: any) {
      // Check for timeout error
      if (error.message === 'Request timeout') {
        toast({
          title: 'Request Timeout',
          description: 'The event details request timed out. Please try again later.',
          variant: 'destructive'
        });

        throw new EventServiceError('Request timed out while fetching event details', {
          code: 'timeout',
          status: 408,
          source: 'get-event'
        });
      }

      // Rethrow other errors
      throw error;
    }
  } catch (error: any) {
    console.error('Error getting event by ID:', error);

    // If it's already an EventServiceError, rethrow it
    if (error instanceof EventServiceError) {
      throw error;
    }

    // Otherwise, wrap it in an EventServiceError
    throw new EventServiceError(
      error.message || 'An unexpected error occurred while fetching event details',
      {
        code: 'unexpected_error',
        status: error.status || 500,
        source: 'getEventById'
      }
    );
  }
}
