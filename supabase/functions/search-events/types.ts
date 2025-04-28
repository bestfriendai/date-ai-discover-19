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
  imageAlt?: string; // Alt text for the main image
  additionalImages?: string[]; // Additional event images
  coordinates?: [number, number]; // [longitude, latitude]
  latitude?: number; // Added for backward compatibility
  longitude?: number; // Added for backward compatibility
  url?: string; // Event URL (official website or ticket page)
  price?: string; // Basic price information
  rawDate?: string; // Added for storing original date format

  // Enhanced ticket information
  ticketInfo?: {
    price?: string; // Formatted price string
    minPrice?: number; // Minimum price (numeric)
    maxPrice?: number; // Maximum price (numeric)
    currency?: string; // Currency code (USD, EUR, etc.)
    availability?: string; // Availability status (available, limited, sold_out)
    purchaseUrl?: string; // Direct URL to purchase tickets
    provider?: string; // Ticket provider name
  };

  // Enhanced website information
  websites?: {
    official?: string; // Official event website
    tickets?: string; // Ticket purchase website
    venue?: string; // Venue website
  };

  // PredictHQ specific fields
  rank?: number;
  localRelevance?: number;
  attendance?: {
    forecast?: number;
    actual?: number;
  };
  demandSurge?: number;

  // Party event flag
  isPartyEvent?: boolean;
}

/**
 * Base parameters for all API calls
 */
export interface BaseApiParams {
  apiKey: string;
  latitude?: number;
  longitude?: number;
  radius: number; // Now strictly a number after validation
  startDate?: string;
  endDate?: string;
  keyword?: string;
  limit?: number;
}

/**
 * Ticketmaster specific parameters
 */
export interface TicketmasterParams extends BaseApiParams {
  segmentName?: string;
  classificationName?: string;
  size?: number;
}

/**
 * PredictHQ specific parameters
 */
export interface PredictHQParams extends BaseApiParams {
  categories?: string[];
  location?: string;
  withinParam?: string;
}

/**
 * Search parameters for event APIs
 */
export interface SearchParams {
  keyword?: string;
  lat?: number; // Added for lat/lng support
  lng?: number; // Added for lat/lng support
  userLat?: number; // Added for backward compatibility
  userLng?: number; // Added for backward compatibility
  latitude?: number;
  longitude?: number;
  radius: number; // Now strictly a number after validation
  startDate?: string;
  endDate?: string;
  categories?: string[];
  location?: string;
  eventType?: string;
  serpDate?: string;
  limit?: number;
  page?: number;
  excludeIds?: string[];
  predicthqLocation?: string;
  segmentName?: string;
  classificationName?: string;
  isVirtual?: boolean;
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
    keyUsage?: {
      ticketmaster: any;
      predicthq: any | null;
    };
  };
  error?: string;
  errorType?: string;
  details?: any;
}
