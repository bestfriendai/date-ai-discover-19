import { Event, SearchParams } from "./types.ts";

interface EventWithTimestamp {
  event: Event;
  timestamp: number;
}

// Precompile regex patterns for better performance
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function normalizeAndFilterEvents(events: Event[], params: SearchParams): Event[] {
  // Start time for performance tracking
  const startTime = performance.now();
  
  // Create a Set of excluded IDs for O(1) lookup instead of O(n) array includes
  const excludedIdsSet = new Set(params.excludeIds || []);
  
  // Use a single pass through the array for both filtering and mapping
  const result = [];
  
  for (const event of events) {
    // Filter out events with missing required fields
    if (!event.id || !event.title || !event.date) {
      continue;
    }

    // Filter out excluded IDs - using Set for O(1) lookup
    if (excludedIdsSet.has(event.id)) {
      continue;
    }
    
    // Create a new object for the normalized event
    const normalizedEvent: Event = {
      ...event,
      description: event.description || 'No description available',
      venue: event.venue || 'Venue information not available',
      category: event.category || 'Uncategorized',
      source: event.source || 'Unknown'
    };
    
    // Ensure coordinates are in the correct format
    if (event.latitude && event.longitude && !event.coordinates) {
      normalizedEvent.coordinates = [Number(event.longitude), Number(event.latitude)];
    }

    // Normalize date format - only if needed
    if (event.date && !event.rawDate && !ISO_DATE_REGEX.test(event.date)) {
      normalizedEvent.rawDate = event.date;
      try {
        const date = new Date(event.date);
        normalizedEvent.date = date.toISOString();
      } catch (e) {
        // Keep the original date if parsing fails
      }
    }

    result.push(normalizedEvent);
  }
  
  // Log performance metrics only in development or if there are many events
  if (events.length > 1000) {
    const processingTime = performance.now() - startTime;
    console.log(`[PROCESSING] Normalized ${result.length}/${events.length} events in ${processingTime.toFixed(2)}ms`);
  }
  
  return result;
}

// Optimized date sorting with memoization
const timestampCache = new Map<string, number>();

export function sortEventsByDate(events: Event[]): Event[] {
  const startTime = performance.now();
  
  // Prepare events with timestamps
  const eventsWithTimestamps: EventWithTimestamp[] = [];
  
  for (const event of events) {
    // Use cached timestamp if available
    const cacheKey = `${event.id}-${event.date}-${event.time || ''}`;
    let timestamp: number;
    
    if (timestampCache.has(cacheKey)) {
      timestamp = timestampCache.get(cacheKey)!;
    } else {
      try {
        if (event.rawDate) {
          timestamp = new Date(event.rawDate).getTime();
        } else {
          const dateStr = event.date.split('T')[0];
          const timeStr = event.time || '00:00';
          timestamp = new Date(`${dateStr}T${timeStr}`).getTime();
        }
        
        // Cache the timestamp for future use
        timestampCache.set(cacheKey, timestamp);
      } catch (e) {
        timestamp = Number.MAX_SAFE_INTEGER; // Put invalid dates at the end
      }
    }
    
    eventsWithTimestamps.push({ event, timestamp });
  }

  // Sort by timestamp and map back to events
  const result = eventsWithTimestamps
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => item.event);
  
  // Clean up cache if it gets too large
  if (timestampCache.size > 10000) {
    // Keep only the most recent 5000 entries
    const entries = Array.from(timestampCache.entries());
    const recentEntries = entries.slice(-5000);
    timestampCache.clear();
    for (const [key, value] of recentEntries) {
      timestampCache.set(key, value);
    }
  }
  
  // Log performance for large datasets
  if (events.length > 1000) {
    const processingTime = performance.now() - startTime;
    console.log(`[PROCESSING] Sorted ${events.length} events in ${processingTime.toFixed(2)}ms`);
  }
  
  return result;
}

// Renamed from filterEventsByCoordinates to separateEventsByCoordinates for clarity
export function separateEventsByCoordinates(events: Event[]): {
  eventsWithCoords: Event[];
  eventsWithoutCoords: Event[];
} {
  const eventsWithCoords = events.filter(event => {
    return (
      (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) ||
      (event.latitude !== undefined && event.longitude !== undefined)
    );
  });

  const eventsWithoutCoords = events.filter(event => {
    return (
      (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) &&
      (event.latitude === undefined || event.longitude === undefined)
    );
  });

  return { eventsWithCoords, eventsWithoutCoords };
}

// Precomputed values for distance calculation
const EARTH_RADIUS = 6371; // Radius of the Earth in kilometers
const DEG_TO_RAD = Math.PI / 180;

// Optimized distance calculation with memoization
const distanceCache = new Map<string, number>();

// Helper function to calculate distance between two coordinates in kilometers using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Create a cache key
  const cacheKey = `${lat1.toFixed(4)},${lon1.toFixed(4)}-${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  
  // Check if we have a cached result
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }
  
  // Precompute trigonometric values
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  
  // Optimized Haversine formula
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const cosLat1 = Math.cos(lat1Rad);
  const cosLat2 = Math.cos(lat2Rad);
  
  const a = sinDLat * sinDLat + cosLat1 * cosLat2 * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS * c; // Distance in kilometers
  
  // Cache the result
  distanceCache.set(cacheKey, distance);
  
  // Clean up cache if it gets too large
  if (distanceCache.size > 10000) {
    // Keep only the most recent 5000 entries
    const entries = Array.from(distanceCache.entries());
    const recentEntries = entries.slice(-5000);
    distanceCache.clear();
    for (const [key, value] of recentEntries) {
      distanceCache.set(key, value);
    }
  }
  
  return distance;
}

// Optimized function to filter events by distance from a given point
export function filterEventsByDistance(events: Event[], latitude: number, longitude: number, radius: number): Event[] {
  const startTime = performance.now();
  
  // Validate inputs
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof radius !== 'number') {
    return events; // Return all events if location/radius is not valid
  }

  // Quick check if we have any events to process
  if (events.length === 0) {
    return [];
  }
  
  // Separate events with and without coordinates for better performance
  const eventsWithValidCoords: Event[] = [];
  const eventsWithoutValidCoords: Event[] = [];
  
  // First pass: separate events with and without valid coordinates
  for (const event of events) {
    if (
      event.coordinates &&
      Array.isArray(event.coordinates) &&
      event.coordinates.length === 2 &&
      typeof event.coordinates[0] === 'number' &&
      typeof event.coordinates[1] === 'number' &&
      !isNaN(event.coordinates[0]) &&
      !isNaN(event.coordinates[1])
    ) {
      eventsWithValidCoords.push(event);
    } else {
      eventsWithoutValidCoords.push(event);
    }
  }
  
  // Second pass: filter events with valid coordinates by distance
  const filteredEvents: Event[] = [];
  
  // Process events with valid coordinates
  for (const event of eventsWithValidCoords) {
    const eventLat = event.coordinates![1];
    const eventLon = event.coordinates![0];
    
    const distance = calculateDistance(latitude, longitude, eventLat, eventLon);
    
    if (distance <= radius) {
      filteredEvents.push(event);
    }
  }
  
  // Add all events without valid coordinates
  const result = [...filteredEvents, ...eventsWithoutValidCoords];
  
  // Log performance metrics for large datasets
  if (events.length > 1000) {
    const processingTime = performance.now() - startTime;
    console.log(`[PROCESSING] Distance filtered ${events.length} events in ${processingTime.toFixed(2)}ms`);
    console.log(`[PROCESSING] Events with coordinates: ${eventsWithValidCoords.length}, without: ${eventsWithoutValidCoords.length}`);
    console.log(`[PROCESSING] Events within ${radius}km radius: ${filteredEvents.length}`);
  }
  
  return result;
}

// For backward compatibility
export const filterEventsByCoordinates = separateEventsByCoordinates;

export function generateSourceStats(
  ticketmasterCount: number,
  ticketmasterError: string | null,
  predicthqCount: number,
  predicthqError: string | null
) {
  return {
    ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
    eventbrite: { count: 0, error: 'API not implemented' },
    serpapi: { count: 0, error: 'API not implemented' },
    predicthq: { count: predicthqCount, error: predicthqError }
  };
}

export function generateMetadata(
  startTime: number,
  totalEvents: number,
  eventsWithCoordinates: number,
  ticketmasterStats: any,
  predicthqStats: any | null
) {
  return {
    executionTime: Date.now() - startTime,
    totalEvents,
    eventsWithCoordinates,
    timestamp: new Date().toISOString(),
    keyUsage: {
      ticketmaster: ticketmasterStats,
      predicthq: predicthqStats
    }
  };
}