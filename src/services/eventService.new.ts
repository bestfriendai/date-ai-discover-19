import { supabase } from '@/integrations/supabase/client';
import type { Event, SearchParams as EventSearchParams } from '@/types.new';
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
  timeout?: number;
}

interface SearchResponse {
  events: Event[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  sourceStats: {
    ticketmasterCount: number;
    ticketmasterError?: string;
    predicthqCount: number;
    predicthqError?: string;
  };
  meta: {
    processingTime: number;
    totalEvents: number;
    eventsWithCoords: number;
    ticketmasterCount: number;
    predicthqCount: number;
    requestId: string;
    timestamp: string;
  };
  cached?: boolean;
}

/**
 * Calculate a dynamic cache TTL based on event proximity
 * Events that are further in the future can be cached longer
 */
function calculateCacheTTL(events: Event[]): number {
  if (!events || events.length === 0) {
    return 5 * 60 * 1000; // Default 5 minutes
  }
  
  // Find the closest event by start date
  const now = new Date();
  const closestEvent = events.reduce((closest, event) => {
    const eventDate = new Date(event.start);
    const closestDate = new Date(closest.start);
    return eventDate < closestDate ? event : closest;
  }, events[0]);
  
  const eventDate = new Date(closestEvent.start);
  const daysDifference = Math.max(0, Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Scale cache TTL based on proximity
  if (daysDifference < 1) {
    return 5 * 60 * 1000; // 5 minutes for events today
  } else if (daysDifference < 3) {
    return 15 * 60 * 1000; // 15 minutes for events in next 3 days
  } else if (daysDifference < 7) {
    return 30 * 60 * 1000; // 30 minutes for events in next week
  } else {
    return 60 * 60 * 1000; // 1 hour for events further in future
  }
}

/**
 * Create a standardized error response
 */
function createErrorResponse(error: any): any {
  return {
    events: [],
    sourceStats: {
      ticketmasterCount: 0,
      ticketmasterError: error?.message || String(error),
      predicthqCount: 0,
      predicthqError: error?.message || String(error)
    },
    total: 0,
    offset: 0,
    limit: 20,
    hasMore: false,
    meta: {
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
      processingTime: 0,
      totalEvents: 0,
      eventsWithCoords: 0,
      ticketmasterCount: 0,
      predicthqCount: 0,
      requestId: `error-${Date.now()}`
    }
  };
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
  const cachedResult = eventCache.get<SearchResponse>(cacheKey);
  
  if (cachedResult) {
    console.log('[CACHE] Using cached events data');
    
    // Convert the new response format to the old format for backward compatibility
    return {
      events: cachedResult.events,
      sourceStats: cachedResult.sourceStats,
      totalEvents: cachedResult.total,
      pageSize: cachedResult.limit,
      page: Math.floor(cachedResult.offset / cachedResult.limit) + 1,
      totalPages: Math.ceil(cachedResult.total / cachedResult.limit),
      hasMore: cachedResult.hasMore,
      meta: cachedResult.meta,
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
        text: params.keyword || '',
        latitude: params.latitude,
        longitude: params.longitude,
        location: params.location,
        radius: params.radius || 30,
        start: params.startDate,
        end: params.endDate,
        categories: params.categories,
        limit: params.limit || 200, // Fetch up to 200 events
        offset: params.page ? (params.page - 1) * (params.limit || 20) : 0,
        timeout: params.timeout || 15000 // 15 seconds default timeout
      };

      try {
        // Call the Supabase function with the search parameters
        const { data, error } = await supabase.functions.invoke('search-events', {
          body: searchParams,
          headers: { 'Content-Type': 'application/json' }
        });

        if (error) {
          console.error('[ERROR] Supabase function error:', error);
          throw error;
        }

        if (!data) {
          console.error('[ERROR] No data returned from Supabase function');
          throw new Error('No data returned from Supabase function');
        }

        // Process the response
        const response = data as SearchResponse;
        
        // Cache the result with dynamic TTL based on event proximity
        const ttl = calculateCacheTTL(response.events);
        eventCache.set(cacheKey, response, ttl);
        
        // Convert the new response format to the old format for backward compatibility
        return {
          events: response.events,
          sourceStats: response.sourceStats,
          totalEvents: response.total,
          pageSize: response.limit,
          page: Math.floor(response.offset / response.limit) + 1,
          totalPages: Math.ceil(response.total / response.limit),
          hasMore: response.hasMore,
          meta: response.meta
        };
      } catch (error) {
        console.error('[ERROR] Error calling Supabase function:', error);
        
        // Return empty array with structured error information
        return {
          events: [],
          sourceStats: {
            ticketmaster: { count: 0, error: String(error) },
            predicthq: { count: 0, error: String(error) }
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
        predicthq: { count: 0, error: String(error) }
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
    // First try to get the event from the local database
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

        const matches = coordStr.match(/\(([\-\d.]+)\s+([\-\d.]+)\)/);
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
        description: localEvent.description || '',
        date: new Date(localEvent.date_start).toISOString().split('T')[0],
        time: new Date(localEvent.date_start).toTimeString().slice(0, 5),
        location: localEvent.location_name,
        venue: localEvent.venue_name,
        category: localEvent.category,
        image: localEvent.image_url,
        url: localEvent.url,
        coordinates,
        price,
        start: new Date(localEvent.date_start).toISOString()
      };
      
      // Cache the event data
      eventCache.set(cacheKey, event);
      
      return event;
    }

    // If not in local database, fetch from API with timeout handling
    const timeoutMs = 20000; // 20 seconds timeout
    
    try {
      const { data, error } = await supabase.functions.invoke('get-event', {
        body: { id },
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) {
        console.error('[ERROR] Error fetching event by ID:', error);
        return null;
      }

      if (!data?.event) return null;

      // Cache the event data
      eventCache.set(cacheKey, data.event);
      
      return data.event;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[ERROR] Function invocation timed out');
      } else {
        console.error('[ERROR] Error fetching event by ID:', error);
      }
      return null;
    }
  } catch (error) {
    console.error('Error getting event by ID:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  } finally {
    // Hide loading indicator
    loadingManager.stopLoading(loadingId);
  }
}
