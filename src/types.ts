
import { DateRange } from 'react-day-picker';

/**
 * Consolidated PartySubcategory type - single source of truth
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
  | 'day party' 
  | 'social' 
  | 'club' 
  | 'networking' 
  | 'celebration' 
  | 'general' 
  | 'rooftop' 
  | 'immersive' 
  | 'popup'
  | 'brunch';

/**
 * Event interface representing an event from any source
 */
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
  partySubcategory?: PartySubcategory;
  image?: string;
  url?: string;
  source?: string;
  isSelected?: boolean;
  latitude?: number;
  longitude?: number;

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
  priceRange?: [number, number];
  distance?: number;
  sortBy?: 'date' | 'distance' | 'price';
  keyword?: string;
  location?: string;
  limit?: number;
}

// Export the updated EventFilters from MapControls
export { EventFilters as MapControlsEventFilters } from './components/map/components/MapControls';

/**
 * Map style options
 */
export type MapStyle = 'streets' | 'outdoors' | 'light' | 'dark' | 'satellite';

/**
 * Represents a single item in an itinerary
 */
export interface ItineraryItem {
  id: string;
  eventId?: string;
  title: string;
  description?: string;
  location?: string;
  location_name?: string;
  coordinates?: [number, number] | unknown;
  location_coordinates?: [number, number] | unknown;
  startTime: string;
  endTime: string;
  notes?: string;
  type: 'EVENT' | 'CUSTOM';
  order: number;
  event?: Event;
}

/**
 * Represents a user's itinerary
 */
export interface Itinerary {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  date: string;
  items: ItineraryItem[];
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
