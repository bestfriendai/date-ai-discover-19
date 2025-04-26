/**
 * Updated types for the search-events function
 * 
 * This file defines the TypeScript interfaces used throughout the function.
 */

/**
 * Event interface
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  date: string;
  time?: string;
  image?: string;
  url?: string;
  coordinates?: [number, number]; // [latitude, longitude]
  venue?: Venue;
  price?: string;
  source: string;
  start: string; // ISO date string
  raw?: any; // Original data from the source
  
  // Additional properties used internally
  rank?: number; // Used for sorting/relevance
  distance?: number; // Used for distance calculations
  partySubcategory?: string; // Used for party event categorization
}

/**
 * Venue interface
 */
export interface Venue {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: [number, number]; // [latitude, longitude]
  url?: string;
}

/**
 * Search parameters interface
 */
export interface SearchParams {
  query?: string;
  text?: string; // Legacy support for 'text' parameter
  location?: string;
  latitude?: number;
  lat?: number; // Alias for latitude
  longitude?: number;
  lng?: number; // Alias for longitude
  radius?: number;
  start?: string;
  startDate?: string; // Alias for start
  end?: string;
  endDate?: string; // Alias for end
  categories?: string[];
  category?: string; // Single category
  limit?: number;
  offset?: number;
  sort?: string;
  timeout?: number;
  excludeIds?: string[];
  withinParam?: string; // Added missing property
  keyword?: string; // Added missing property
}

/**
 * Source statistics interface
 */
export interface SourceStats {
  ticketmaster: {
    total: number;
    filtered: number;
    error?: string;
  };
  predictHQ: {
    total: number;
    filtered: number;
    error?: string;
  };
  deduplication?: {
    duplicatesRemoved: number;
  };
}

/**
 * Metadata interface
 */
export interface Metadata {
  requestId: string;
  processingTime: number;
  timestamp: string;
  apiUsage?: ApiUsage;
  cache?: {
    hit: boolean;
    ttl?: number;
  };
}

/**
 * API usage interface
 */
export interface ApiUsage {
  ticketmaster?: {
    remaining?: number;
    limit?: number;
    reset?: string;
  };
  predictHQ?: {
    remaining?: number;
    limit?: number;
    reset?: string;
  };
}

/**
 * PredictHQ specific parameters
 */
export interface PredictHQParams {
  q?: string;
  location_around?: string;
  category?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  active?: boolean;
}
