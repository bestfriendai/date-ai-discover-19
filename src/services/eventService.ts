import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { normalizeTicketmasterEvent, normalizeSerpApiEvent } from '@/utils/eventNormalizers';
import { loadingManager } from '@/components/shared/GlobalLoadingIndicator';
import { measureExecutionTime } from '@/hooks/usePerformanceMonitor';

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class EventCache {
  private static instance: EventCache;
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.cache = new Map();
    
    // Clean expired cache entries every minute
    setInterval(() => this.cleanExpiredEntries(), 60 * 1000);
  }

  public static getInstance(): EventCache {
    if (!EventCache.instance) {
      EventCache.instance = new EventCache();
    }
    return EventCache.instance;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  public set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + ttl;
    
    this.cache.set(key, { data, timestamp, expiresAt });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  public getStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export the singleton instance
export const eventCache = EventCache.getInstance();

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
  totalPages?: number;
  hasMore?: boolean;
  meta?: any;
  cached?: boolean;
}> {
  // Generate a cache key based on the search parameters
  const cacheKey = `events:${JSON.stringify(params)}`;
  
  // Check if we have a cached result
  const cachedResult = eventCache.get<{
    events: Event[];
    sourceStats?: any;
    totalEvents?: number;
    pageSize?: number;
    page?: number;
    totalPages?: number;
    hasMore?: boolean;
    meta?: any;
  }>(cacheKey);
  
  if (cachedResult) {
    console.log('[CACHE] Using cached events data');
    return {
      ...cachedResult,
      cached: true
    };
  }
  
  // Show loading indicator
  const loadingId = `search-events-${Date.now()}`;
  loadingManager.startLoading(loadingId, 'Searching for events...');
  
  try {
    // Define a function to handle the actual search
    const performSearch = async () => {
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

      console.log('[DEBUG] Sending search params to search-events function:', searchParams);

      try {
        // Call Supabase function to fetch events from multiple sources
        console.log('[DEBUG] About to call supabase.functions.invoke("search-events")');

        // Log the Supabase function URL
        console.log('[DEBUG] Supabase function URL:', {
          functionName: 'search-events',
          hasClient: !!supabase
        });

        // Add timeout handling for the function call
        const timeoutMs = 30000; // 30 seconds timeout
        const functionPromise = supabase.functions.invoke('search-events', {
          body: JSON.stringify(searchParams), // Explicitly stringify the body
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

        // Log the result for debugging
        console.log('[DEBUG] Function result:', {
          hasData: !!data,
          hasError: !!error,
          eventCount: data?.events?.length || 0,
          meta: data?.meta
        });

        if (error) {
          console.error('[ERROR] Supabase function error:', error);

          // Check if it's a timeout error
          const isTimeout = error.message?.includes('timeout') || error.status === 408;
          const errorMessage = isTimeout
            ? 'The request took too long to complete. Please try again or refine your search criteria.'
            : error.message || String(error);

          // Return a structured error response with user-friendly message
          return {
            events: [],
            sourceStats: {
              ticketmaster: { count: 0, error: errorMessage },
              eventbrite: { count: 0 },
              serpapi: { count: 0 },
              error: {
                message: errorMessage,
                status: error.status || 500,
                isTimeout
              }
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

        console.log(`[DEBUG] Filtered ${filteredEvents.length} events with valid coordinates and content`);

        // Process the response with improved metadata handling
        const sourceStats = data.sourceStats || {};
        const meta = data.meta || {};

        // Use meta data if available, otherwise fallback to legacy format
        const totalEvents = meta.totalEvents || data.totalEvents || filteredEvents.length;
        const pageSize = meta.pageSize || data.pageSize || params.limit || 20;
        const page = meta.page || data.page || params.page || 1;
        const totalPages = meta.totalPages || Math.ceil(totalEvents / pageSize) || 1;
        const hasMore = meta.hasMore !== undefined ? meta.hasMore : (page * pageSize < totalEvents);

        console.log(`[DEBUG] Event metadata: page ${page}/${totalPages}, hasMore: ${hasMore}, total: ${totalEvents}`);

        // Enhance events with additional data if needed
        const enhancedEvents = filteredEvents.map((event: Event) => {
          // Create a copy of the event to avoid mutating the original
          const enhancedEvent = { ...event };

          // Make sure all events have a valid category
          if (!enhancedEvent.category) {
            enhancedEvent.category = 'other';
          }

          // Make sure all events have a valid date
          if (!enhancedEvent.date) {
            enhancedEvent.date = 'Date TBA';
          }

          // Make sure all events have a valid location
          if (!enhancedEvent.location) {
            enhancedEvent.location = 'Location TBA';
          }

          return enhancedEvent;
        });

        const result = {
          events: enhancedEvents,
          sourceStats,
          totalEvents,
          pageSize,
          page,
          totalPages,
          hasMore,
          meta
        };
        
        // Cache the result if we have events
        if (enhancedEvents.length > 0) {
          eventCache.set(cacheKey, result);
        }
        
        return result;
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
          pageSize: params.limit || 20,
          page: params.page || 1,
          totalPages: 0,
          hasMore: false,
          meta: {
            error: String(error),
            timestamp: new Date().toISOString()
          }
        };
      }
    };
  
    // Measure execution time and perform the search
    const result = await measureExecutionTime(performSearch, 'searchEvents');
    return result;
  } catch (error) {
    console.error('[ERROR] Error searching events:', error);
    
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
      pageSize: params.limit || 20,
      page: params.page || 1,
      totalPages: 0,
      hasMore: false,
      meta: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    };
  } finally {
    // Hide loading indicator
    loadingManager.stopLoading(loadingId);
  }
}

// Get event details by ID
export async function getEventById(id: string): Promise<Event | null> {
  // Generate a cache key
  const cacheKey = `event:${id}`;
  
  // Check if we have a cached result
  const cachedEvent = eventCache.get<Event>(cacheKey);
  if (cachedEvent) {
    console.log('[CACHE] Using cached event data for ID:', id);
    return cachedEvent;
  }
  
  // Show loading indicator
  const loadingId = `get-event-${id}`;
  loadingManager.startLoading(loadingId, 'Loading event details...');
  
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

    // Cache the event data
    eventCache.set(cacheKey, data.event);
    
    return data.event;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  } finally {
    // Hide loading indicator
    loadingManager.stopLoading(loadingId);
  }
}
