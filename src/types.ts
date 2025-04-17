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
