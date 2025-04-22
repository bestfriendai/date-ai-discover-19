/**
 * Type definitions for the search-events function
 */

import { PartySubcategory } from './partyUtils.ts';

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
}

/**
 * Search parameters for event APIs
 */
export interface SearchParams {
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  location?: string;
  limit?: number;
  excludeIds?: string[];
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
