/**
 * Type definitions for the search-events function
 */

// Import PartySubcategory if needed for party detection logic
import { PartySubcategory } from './partyUtils.ts'; // Assuming this file exists and is correct

export { PartySubcategory }; // Re-export

export interface Event {
  id: string;
  source?: string; // Will always be 'rapidapi' now
  title: string;
  description?: string;
  date: string; // Formatted date string
  time: string; // Formatted time string
  location: string; // Formatted location string
  venue?: string;
  category: string;
  partySubcategory?: PartySubcategory;
  image: string;
  imageAlt?: string;
  additionalImages?: string[]; // Additional images for the event when available
  coordinates?: [number, number]; // [longitude, latitude] - May be missing from API
  latitude?: number; // Added for convenience/consistency
  longitude?: number; // Added for convenience/consistency
  url?: string;
  price?: string; // Basic price info if available
  rawDate?: string; // Store original date string for sorting/filtering
  isPartyEvent?: boolean;
  tags?: string[]; // Event tags from RapidAPI

  // Optional detailed info (might not be available from RapidAPI)
  ticketInfo?: {
    price?: string;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    availability?: string;
    purchaseUrl?: string;
    provider?: string;
  };
  websites?: {
    official?: string;
    tickets?: string;
    venue?: string;
    social?: string[]; // Social media links
  };

  // Enhanced venue details
  venueDetails?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    rating?: number;
    reviewCount?: number;
    type?: string;
    phone?: string;
  };
}

export interface SearchParams {
  keyword?: string;
  location?: string;         // e.g., "New York"
  latitude?: number;        // User's latitude
  longitude?: number;       // User's longitude
  radius: number;           // Search radius in miles (now required number after validation)
  startDate?: string;       // YYYY-MM-DD
  endDate?: string;         // YYYY-MM-DD
  categories?: string[];    // e.g., ['party', 'music']
  limit?: number;           // Max events per page
  page?: number;            // Pagination page number
  excludeIds?: string[];
  predicthqLocation?: string; // Format: "24km@38.89,-76.94"
}

export interface SourceStats {
  count: number;
  error: string | null;
}

export interface SearchEventsResponse {
  events: Event[];
  sourceStats: {
    rapidapi: SourceStats; // Only RapidAPI stats
  };
  meta: {
    executionTime: number;
    totalEvents: number; // Total *before* pagination, *after* radius filtering
    eventsWithCoordinates: number;
    timestamp: string;
    page?: number;
    limit?: number;
    hasMore?: boolean; // Indicate if more pages might exist
    searchQueryUsed?: string; // Debug: Show the query sent to RapidAPI
  };
  error?: string;
  errorType?: string;
  details?: any;
}
