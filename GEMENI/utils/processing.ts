// GEMENI/utils/processing.ts
import { Event } from "../integrations/rapidapi/types";

interface EventWithTimestamp {
  event: Event;
  timestamp: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Sort events by date in ascending order
 * @param events Array of events to sort
 * @returns Sorted array of events
 */
export function sortEventsByDate(events: Event[]): Event[] {
  const eventsWithTimestamps: EventWithTimestamp[] = events.map(event => {
    let timestamp: number;
    try {
      // Use rawDate if available, otherwise parse formatted date/time
      const dateStr = event.rawDate || event.date;
      // Handle cases where date might be just YYYY-MM-DD or similar
      const timeStr = event.time && event.time !== 'Time TBA' ? event.time : '00:00:00'; // Default time if missing/invalid

      // Attempt to create a Date object from rawDate first if it looks like a full timestamp
      let dateObj: Date | null = null;
      if (event.rawDate && event.rawDate.includes('T')) { // Check if rawDate looks like ISO
          dateObj = new Date(event.rawDate);
      }

      // If rawDate parsing failed or wasn't attempted, try combining date and time
      if (!dateObj || isNaN(dateObj.getTime())) {
          dateObj = new Date(`${dateStr} ${timeStr}`);
      }

      // Check if parsing was successful
      if (isNaN(dateObj.getTime())) {
        // Fallback for simpler date formats like "YYYY-MM-DD" or just date string
         const fallbackDate = new Date(dateStr);
         if (!isNaN(fallbackDate.getTime())) {
             timestamp = fallbackDate.getTime();
         } else {
            console.warn(`[SORT] Could not parse date for event ${event.id}: Raw='${event.rawDate}', Parsed='${dateStr} ${timeStr}'`);
            timestamp = Number.MAX_SAFE_INTEGER; // Put unparseable dates last
         }
      } else {
         timestamp = dateObj.getTime();
      }

    } catch (e) {
      console.warn(`[SORT] Error parsing date for event ${event.id}:`, e);
      timestamp = Number.MAX_SAFE_INTEGER;
    }
    return { event, timestamp };
  });

  return eventsWithTimestamps
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => item.event);
}

/**
 * Filter events by coordinates
 * @param events Array of events to filter
 * @returns Object containing events with and without coordinates
 */
export function filterEventsByCoordinates(events: Event[]): {
  eventsWithCoords: Event[];
  eventsWithoutCoords: Event[];
} {
  const eventsWithCoords = events.filter(event =>
    event.latitude !== undefined && event.longitude !== undefined &&
    event.latitude !== null && event.longitude !== null &&
    !isNaN(Number(event.latitude)) && !isNaN(Number(event.longitude))
  );
  const eventsWithoutCoords = events.filter(event =>
    event.latitude === undefined || event.longitude === undefined ||
    event.latitude === null || event.longitude === null ||
    isNaN(Number(event.latitude)) || isNaN(Number(event.longitude))
  );
  return { eventsWithCoords, eventsWithoutCoords };
}

/**
 * Generate metadata for search results
 * @param startTime Start time of the search
 * @param totalEvents Total number of events
 * @param eventsWithCoordinates Number of events with coordinates
 * @param searchQueryUsed Search query used
 * @param page Page number
 * @param limit Limit per page
 * @param hasMore Whether there are more results
 * @returns Metadata object
 */
export function generateMetadata(
  startTime: number,
  totalEvents: number,
  eventsWithCoordinates: number,
  searchQueryUsed?: string,
  page?: number,
  limit?: number,
  hasMore?: boolean
) {
  return {
    executionTime: Date.now() - startTime,
    totalEvents,
    eventsWithCoordinates,
    timestamp: new Date().toISOString(),
    searchQueryUsed: searchQueryUsed || undefined,
    page: page,
    limit: limit,
    hasMore: hasMore
  };
}