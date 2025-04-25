/**
 * Type definitions for the search-events-unified function
 */

/**
 * Event interface matching the frontend type
 */
export interface Event {
  id: string;
  source?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  venue?: string;
  category: string;
  image: string;
  coordinates?: [number, number]; // [longitude, latitude]
  latitude?: number; // Added for backward compatibility
  longitude?: number; // Added for backward compatibility
  url?: string;
  price?: string;
}

/**
 * Search parameters for event APIs
 */
export interface SearchParams {
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radius?: number | string;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  location?: string;
  limit?: number;
  page?: number;
  excludeIds?: string[];
}

/**
 * Source statistics for event APIs
 */
export interface SourceStats {
  count: number;
  error: string | null;
}

/**
 * Response format for the search-events function
 */
export interface SearchEventsResponse {
  events: Event[];
  sourceStats: {
    ticketmaster: SourceStats;
    predicthq: SourceStats;
  };
  meta: {
    executionTime: number;
    totalEvents: number;
    eventsWithCoordinates: number;
    timestamp: string;
  };
}
