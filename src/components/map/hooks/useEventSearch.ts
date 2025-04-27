import { useState, useCallback, useRef, useEffect } from 'react';
import { Event } from '@/types';
import { searchEvents } from '@/services/eventService';
import { formatISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { EventFilters } from '../components/MapControls';

// Define the source stats type
interface SourceStats {
  count: number;
  error: string | null;
}

// Cache structure to store events by location
interface EventCache {
  [key: string]: {
    timestamp: number;
    events: Event[];
    params: any;
  };
}

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Generate a cache key from search parameters
const generateCacheKey = (params: any): string => {
  const { latitude, longitude, radius } = params;
  // Round coordinates to reduce cache fragmentation
  const lat = Math.round(latitude * 100) / 100;
  const lng = Math.round(longitude * 100) / 100;
  return `${lat},${lng},${radius}`;
};

// Global event cache shared across hook instances
const globalEventCache: EventCache = {};

export const useEventSearch = () => {
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [lastSearchParams, setLastSearchParams] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [filters, setFilters] = useState<EventFilters>({});
  const [sourceStats, setSourceStats] = useState<{
    ticketmaster?: SourceStats;
    eventbrite?: SourceStats;
    serpapi?: SourceStats;
    predicthq?: SourceStats;
  } | null>(null);

  // Reference to the event cache
  const eventCacheRef = useRef<EventCache>(globalEventCache);

  // Clear the cache when it's expired
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    Object.keys(eventCacheRef.current).forEach(key => {
      if (now - eventCacheRef.current[key].timestamp > CACHE_EXPIRATION) {
        delete eventCacheRef.current[key];
      }
    });
  }, []);

  // Effect to periodically clean up the cache
  useEffect(() => {
    const interval = setInterval(clearExpiredCache, CACHE_EXPIRATION / 2);
    return () => clearInterval(interval);
  }, [clearExpiredCache]);

  // Load more events (pagination)
  const loadMoreEvents = useCallback(async () => {
    if (!lastSearchParams || !hasMore || isEventsLoading) return;

    const nextPage = page + 1;
    setPage(nextPage);

    try {
      setIsEventsLoading(true);
      const result = await searchEvents({
        ...lastSearchParams,
        page: nextPage
      });

      if (result && result.events && result.events.length > 0) {
        // Process new events to ensure they have valid coordinates
        const processedNewEvents = result.events.map(event => {
          // If event already has valid coordinates, use them
          if (event.coordinates &&
              Array.isArray(event.coordinates) &&
              event.coordinates.length === 2 &&
              !isNaN(event.coordinates[0]) &&
              !isNaN(event.coordinates[1])) {
            return event;
          }

          // Otherwise, assign coordinates near the search location with a random offset
          const randomLngOffset = (Math.random() * 0.05) - 0.025;
          const randomLatOffset = (Math.random() * 0.05) - 0.025;

          return {
            ...event,
            coordinates: [
              lastSearchParams.longitude + randomLngOffset,
              lastSearchParams.latitude + randomLatOffset
            ] as [number, number]
          };
        });

        // Append new events to existing ones
        setRawEvents(prev => [...prev, ...processedNewEvents]);
        setEvents(prev => [...prev, ...processedNewEvents]);

        // Update hasMore based on whether we received a full page
        setHasMore(result.events.length === result.pageSize);
        setTotalEvents(result.totalEvents || 0);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('[EVENTS] Error loading more events:', error);
      toast({
        title: "Failed to load more events",
        description: "An error occurred while loading additional events.",
        variant: "destructive",
      });
    } finally {
      setIsEventsLoading(false);
    }
  }, [lastSearchParams, page, hasMore, isEventsLoading]);

  const fetchEvents = useCallback(async (
    filters: EventFilters,
    centerCoords?: { latitude: number; longitude: number },
    radiusOverride?: number,
    useCache: boolean = true
  ) => {
    if (isEventsLoading) {
      console.log('[EVENTS] Already loading events, skipping fetch request');
      return;
    }

    setIsEventsLoading(true);
    console.log('[EVENTS] Starting event fetch with coordinates:', centerCoords);

    try {
      if (!centerCoords) {
        console.warn('[EVENTS] Cannot fetch events: No location coordinates available.');
        toast({
          title: "Location Unavailable",
          description: "Could not determine location to fetch events. Please allow location access or search for a location.",
          variant: "default",
        });
        setRawEvents([]);
        setEvents([]);
        return;
      }

      console.log('[EVENTS] Fetching events for:', centerCoords,
        'radius:', radiusOverride || filters.distance);

      const searchParams = {
        latitude: centerCoords.latitude,
        longitude: centerCoords.longitude,
        radius: radiusOverride !== undefined ? radiusOverride : filters.distance,
        startDate: filters.dateRange?.from ? formatISO(filters.dateRange.from, { representation: 'date' }) : undefined,
        endDate: filters.dateRange?.to ? formatISO(filters.dateRange.to, { representation: 'date' }) : undefined,
        categories: filters.categories || [],
        keyword: filters.keyword,
        location: filters.location,
      };

      // Ensure 'party' is included in categories if it's selected in filters
      if (filters.categories && filters.categories.includes('party')) {
        console.log('[EVENTS] Party category selected, ensuring it is included in API request');
        // Make sure we're sending the party category to the API
        if (!searchParams.categories.includes('party')) {
          searchParams.categories.push('party');
        }
      }

      console.log('[EVENTS] Search params:', searchParams);
      setLastSearchParams(searchParams);

      // Reset pagination state
      setPage(1);

      // Check cache first if useCache is true
      const cacheKey = generateCacheKey(searchParams);
      if (useCache && eventCacheRef.current[cacheKey]) {
        const cachedData = eventCacheRef.current[cacheKey];
        const now = Date.now();

        // Use cache if it's not expired
        if (now - cachedData.timestamp < CACHE_EXPIRATION) {
          console.log('[EVENTS] Using cached events for', cacheKey);
          setRawEvents(cachedData.events);
          setEvents(cachedData.events);
          setIsEventsLoading(false);
          return;
        }
      }

      // Add page parameter for pagination
      const searchParamsWithPage = {
        ...searchParams,
        page: 1,
        limit: 50 // Adjust limit as needed
      };

      const result = await searchEvents(searchParamsWithPage);

      if (!result || !result.events) {
        throw new Error('Invalid API response');
      }

      console.log('[EVENTS] Received', result.events.length, 'events from API');

      // Log and store source stats if available
      if (result.sourceStats) {
        console.log('[EVENTS] Source stats:', result.sourceStats);

        // Log individual source stats
        if (result.sourceStats.ticketmaster) {
          console.log(
            `[EVENTS] Ticketmaster: ${result.sourceStats.ticketmaster.count} ${result.sourceStats.ticketmaster.error ? `(Error: ${result.sourceStats.ticketmaster.error})` : ''}`
          );
        }

        if (result.sourceStats.eventbrite) {
          console.log(
            `[EVENTS] Eventbrite: ${result.sourceStats.eventbrite.count} ${result.sourceStats.eventbrite.error ? `(Error: ${result.sourceStats.eventbrite.error})` : ''}`
          );
        }

        if (result.sourceStats.serpapi) {
          console.log(
            `[EVENTS] Serpapi: ${result.sourceStats.serpapi.count} ${result.sourceStats.serpapi.error ? `(Error: ${result.sourceStats.serpapi.error})` : ''}`
          );
        }

        if (result.sourceStats.predicthq) {
          console.log(
            `[EVENTS] PredictHQ: ${result.sourceStats.predicthq.count} ${result.sourceStats.predicthq.error ? `(Error: ${result.sourceStats.predicthq.error})` : ''}`
          );
        }

        // Store the source stats
        setSourceStats(result.sourceStats);
      } else {
        console.log('[EVENTS] No source stats available in API response');
        setSourceStats(null);
      }

      if (result.events.length === 0) {
        toast({
          title: "No events found",
          description: "Try adjusting your search criteria or location.",
          variant: "default",
        });
      } else {
        toast({
          title: "Events loaded",
          description: `Found ${result.events.length} events in this area.`,
          variant: "default",
        });
      }

      // Process events to ensure they have valid coordinates --- FIX 4 ---
      console.log('[EVENTS] Processing events to ensure coordinates...');
      const processedEvents = (result.events || []).map(event => {
        // If event already has valid coordinates, use them
        if (event.coordinates &&
            Array.isArray(event.coordinates) &&
            event.coordinates.length === 2 &&
            typeof event.coordinates[0] === 'number' &&
            typeof event.coordinates[1] === 'number' &&
            !isNaN(event.coordinates[0]) &&
            !isNaN(event.coordinates[1])) {
          // console.log(`[EVENTS] Event ${event.id} already has valid coordinates:`, event.coordinates);
          return event;
        }

        // Otherwise, assign coordinates near the search location with a random offset
        // This ensures events without coordinates still appear on the map
        const fallbackCoords = [
          centerCoords.longitude + (Math.random() - 0.5) * 0.1, // ±0.05 degrees (~5 miles)
          centerCoords.latitude + (Math.random() - 0.5) * 0.1
        ] as [number, number];

        // console.warn(`[EVENTS] Event ${event.id} missing or invalid coordinates. Assigning fallback coordinates:`, fallbackCoords);

        return {
          ...event,
          coordinates: fallbackCoords
        };
      });

      console.log('[EVENTS] Processed events with coordinates:', processedEvents.length);
      // ... rest of fetchEvents ...

      // Update cache
      eventCacheRef.current[cacheKey] = {
        timestamp: Date.now(),
        events: processedEvents,
        params: searchParams
      };

      setRawEvents(processedEvents);
      setEvents(processedEvents);

      // Update pagination state
      setHasMore(result.events.length === result.pageSize);
      setTotalEvents(result.totalEvents || 0);

    } catch (error) {
      console.error('[EVENTS] Error fetching events:', error);
      toast({
        title: "Failed to load events",
        description: "An error occurred while loading events. Please try again.",
        variant: "destructive",
      });
      setRawEvents([]);
      setEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, [isEventsLoading]); // Removed centerCoords from dependencies since it's a function parameter

  // --- FILTER EVENTS LOCALLY BASED ON UI FILTERS (category, date, etc.) ---
  const applyLocalFilters = useCallback((events: Event[], filters: EventFilters) => {
    // Apply category filter
    let filtered = events;
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(ev =>
        filters.categories!.some(cat => ev.category?.toLowerCase() === cat.toLowerCase())
      );
    }
    // Apply datePreset filter
    if (filters.datePreset) {
      const now = new Date();
      let from: Date, to: Date;
      if (filters.datePreset === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (filters.datePreset === 'week') {
        const dayOfWeek = now.getDay();
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);
      } else if (filters.datePreset === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      filtered = filtered.filter(ev => {
        if (!ev.date) return false;
        const evDate = new Date(ev.date);
        return evDate >= from && evDate <= to;
      });
    }
    return filtered;
  }, []);

  // Watch for filter changes and apply local filtering
  useEffect(() => {
    setEvents(applyLocalFilters(rawEvents, filters));
  }, [rawEvents, filters, applyLocalFilters]);

  return {
    events,
    rawEvents,
    isEventsLoading,
    fetchEvents,
    setEvents,
    lastSearchParams,
    loadMoreEvents,
    hasMore,
    page,
    totalEvents,
    filters,
    setFilters,
    sourceStats
  };
};
