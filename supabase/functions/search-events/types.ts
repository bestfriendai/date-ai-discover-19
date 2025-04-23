/**
 * Type definitions for the search-events function
 */

import { PartySubcategory } from './partyUtils.ts';

// Re-export PartySubcategory type
export { PartySubcategory };

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
  partySubcategory?: PartySubcategory; // Added for party event subcategorization
  image: string;
  coordinates?: [number, number]; // [longitude, latitude]
  url?: string;
  price?: string;

  // PredictHQ specific fields
  rank?: number;
  localRelevance?: number;
  attendance?: {
    forecast?: number;
    actual?: number;
  };
  demandSurge?: number;
}

/**
 * Search parameters for event APIs
 */
export interface SearchParams {
  keyword?: string;
  lat?: number; // Added for lat/lng support
  lng?: number; // Added for lat/lng support
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate: string; // Made required
  endDate?: string;
  categories?: string[];
  location?: string;
  eventType?: string; // Added for SerpApi htichips
  serpDate?: string; // Added for SerpApi htichips
  limit?: number;
  page?: number; // Added for pagination
  excludeIds?: string[];
  predicthqLocation?: string; // Added for specific PredictHQ location
  segmentName?: string; // Added for Ticketmaster segment filtering
  classificationName?: string; // Added for Ticketmaster classification filtering
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
    eventbrite: SourceStats;
    serpapi: SourceStats;
    predicthq: SourceStats;
  };
  meta: {
    executionTime: number;
    totalEvents: number;
    eventsWithCoordinates: number;
    timestamp: string;
  };
}
