
import { DateRange } from 'react-day-picker';

/**
 * Event interface representing an event from any source
 */
// Import PartySubcategory type from eventNormalizers
import { PartySubcategory } from './utils/eventNormalizers';

export interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  venue?: string;
  location?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  price?: number | string;
  category?: string;
  partySubcategory?: PartySubcategory; // Added for party events
  image?: string;
  url?: string;
  source?: string;
  isSelected?: boolean; // For marker selection state
  latitude?: number; // Additional coordinate property
  longitude?: number; // Additional coordinate property

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
 * Event filters interface
 */
export interface EventFilters {
  dateRange?: DateRange;
  categories?: string[];
  priceRange?: [number, number]; // [min, max] in USD
  distance?: number; // in miles
  sortBy?: 'date' | 'distance' | 'price'; // Sort options
  keyword?: string; // Search keyword
  location?: string; // Location search
  limit?: number; // Maximum number of events to return
}

// Export the updated EventFilters from MapControls
export { EventFilters as MapControlsEventFilters } from './components/map/components/MapControls';

/**
 * Map style options
 */
export type MapStyle = 'streets' | 'outdoors' | 'light' | 'dark' | 'satellite';

/**
 * Expanded PartySubcategory type to include all needed values
 */
export type PartySubcategory = 
  | 'nightclub' 
  | 'festival'
  | 'concert'
  | 'bar'
  | 'lounge'
  | 'mixer'
  | 'gala'
  | 'costume'
  | 'day-party' 
  | 'social' 
  | 'club' 
  | 'networking' 
  | 'celebration' 
  | 'general' 
  | 'day party' 
  | 'rooftop' 
  | 'immersive' 
  | 'popup'
  | 'brunch';

/**
 * Represents a single item in an itinerary (e.g., an event or activity)
 */
export interface ItineraryItem {
  id: string;
  eventId?: string; // Reference to Event.id
  title: string;
  description?: string;
  location?: string;
  location_name?: string; // For DB compatibility
  coordinates?: [number, number] | unknown;
  location_coordinates?: [number, number] | unknown; // For DB compatibility
  startTime: string; // ISO string
  endTime: string; // ISO string
  notes?: string;
  type: 'EVENT' | 'CUSTOM';
  order: number;
  event?: Event; // Optionally embed the event details
}

/**
 * Represents a user's itinerary (a plan for a date or trip)
 */
export interface Itinerary {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  date: string; // ISO date string
  items: ItineraryItem[];
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
