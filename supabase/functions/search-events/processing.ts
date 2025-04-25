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

// Helper function to calculate distance between two coordinates in kilometers using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// New function to filter events by distance from a given point
export function filterEventsByDistance(events: Event[], latitude: number, longitude: number, radius: number): Event[] {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof radius !== 'number') {
    console.warn('[PROCESSING] filterEventsByDistance called without valid location or radius. Returning all events.');
    return events; // Return all events if location/radius is not valid instead of empty array
  }

  console.log(`[PROCESSING] Filtering events within ${radius} km of ${latitude}, ${longitude}`);
  console.log(`[PROCESSING] Total events before filtering: ${events.length}`);

  // Count events with and without coordinates
  const eventsWithCoords = events.filter(event =>
    event.coordinates &&
    Array.isArray(event.coordinates) &&
    event.coordinates.length === 2 &&
    typeof event.coordinates[0] === 'number' &&
    typeof event.coordinates[1] === 'number' &&
    !isNaN(event.coordinates[0]) &&
    !isNaN(event.coordinates[1])
  );

  console.log(`[PROCESSING] Events with valid coordinates: ${eventsWithCoords.length}/${events.length}`);

  const filteredEvents = events.filter(event => {
    // If event doesn't have coordinates, include it anyway
    // This ensures we don't lose events just because they're missing coordinates
    if (!event.coordinates || event.coordinates.length !== 2) {
      console.log(`[PROCESSING] Including event without valid coordinates: ${event.id} - ${event.title}`);
      return true;
    }

    const eventLat = event.coordinates[1];
    const eventLon = event.coordinates[0];

    // Validate event coordinates before calculating distance
    if (typeof eventLat !== 'number' || typeof eventLon !== 'number' || isNaN(eventLat) || isNaN(eventLon)) {
        console.warn('[PROCESSING] Including event with invalid coordinates:', event.id, event.coordinates);
        return true; // Include events with invalid coordinates instead of excluding them
    }

    const distance = calculateDistance(latitude, longitude, eventLat, eventLon);

    // Only log distance for a sample of events to avoid excessive logging
    if (Math.random() < 0.1) { // Log approximately 10% of events
      console.log(`[PROCESSING] Event ${event.id} at ${eventLat}, ${eventLon} is ${distance.toFixed(2)} km away. Within radius: ${distance <= radius}`);
    }

    return distance <= radius;
  });

  console.log(`[PROCESSING] Events after distance filtering: ${filteredEvents.length}/${events.length}`);
  return filteredEvents;
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