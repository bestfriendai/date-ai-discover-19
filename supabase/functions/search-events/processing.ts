import { Event, SearchParams } from "./types.ts";

interface EventWithTimestamp {
  event: Event;
  timestamp: number;
}

export function normalizeAndFilterEvents(events: Event[], params: SearchParams): Event[] {
  return events
    .filter(event => {
      // Filter out events with missing required fields
      if (!event.id || !event.title || !event.date) {
        console.warn('[PROCESSING] Filtering out event with missing required fields:', {
          id: event.id,
          title: event.title,
          date: event.date
        });
        return false;
      }

      // Filter out excluded IDs
      if (params.excludeIds?.includes(event.id)) {
        console.log('[PROCESSING] Filtering out excluded event:', event.id);
        return false;
      }

      return true;
    })
    .map(event => {
      // Ensure coordinates are in the correct format
      if (event.latitude && event.longitude && !event.coordinates) {
        event.coordinates = [Number(event.longitude), Number(event.latitude)];
      }

      // Normalize date format
      if (event.date && !event.rawDate) {
        event.rawDate = event.date;
        try {
          const date = new Date(event.date);
          event.date = date.toISOString();
        } catch (e) {
          console.warn('[PROCESSING] Error normalizing date for event:', event.id, e);
        }
      }

      // Ensure all required fields have default values
      return {
        ...event,
        description: event.description || 'No description available',
        venue: event.venue || 'Venue information not available',
        category: event.category || 'Uncategorized',
        source: event.source || 'Unknown'
      };
    });
}

export function sortEventsByDate(events: Event[]): Event[] {
  const eventsWithTimestamps: EventWithTimestamp[] = events.map(event => {
    let timestamp: number;
    try {
      if (event.rawDate) {
        timestamp = new Date(event.rawDate).getTime();
      } else {
        const dateStr = event.date.split('T')[0];
        const timeStr = event.time || '00:00';
        timestamp = new Date(`${dateStr}T${timeStr}`).getTime();
      }
    } catch (e) {
      console.warn('[PROCESSING] Error parsing date for event:', event.id, e);
      timestamp = Number.MAX_SAFE_INTEGER; // Put invalid dates at the end
    }
    return { event, timestamp };
  });

  // Sort by timestamp and map back to events
  return eventsWithTimestamps
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => item.event);
}

export function filterEventsByCoordinates(events: Event[]): {
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

export function generateSourceStats(
  ticketmasterCount: number,
  ticketmasterError: string | null,
  predicthqCount: number,
  predicthqError: string | null
) {
  return {
    ticketmaster: { count: ticketmasterCount, error: ticketmasterError },
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