import { DateRange } from 'react-day-picker';

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
  image?: string;
  url?: string;
  source?: string;
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
}

/**
 * Map style options
 */
export type MapStyle = 'streets' | 'outdoors' | 'light' | 'dark' | 'satellite';
/**
 * Represents a single item in an itinerary (e.g., an event or activity)
 */
export interface ItineraryItem {
  id: string;
  eventId?: string; // Reference to Event.id
  title: string;
  description?: string;
  location?: string;
  coordinates?: [number, number] | unknown;
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

