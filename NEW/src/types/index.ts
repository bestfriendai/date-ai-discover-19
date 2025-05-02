// Event type definition
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
  partySubcategory?: PartySubcategory;
  image: string;
  imageAlt?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  latitude?: number; // Added for convenience
  longitude?: number; // Added for convenience
  url?: string;
  price?: string;
  rawDate?: string;
  isPartyEvent?: boolean;
  tags?: string[];
  rank?: number;
  localRelevance?: number;
  attendance?: {
    forecast?: number;
  }
}

// Party subcategory types
export type PartySubcategory = 
  | 'day-party'
  | 'social'
  | 'club'
  | 'networking'
  | 'celebration'
  | 'general'
  | 'nightclub'
  | 'festival'
  | 'brunch'
  | 'rooftop'
  | 'immersive'
  | 'popup';

// Event filter types
export interface EventFilters {
  categories?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  location?: string;
  radius?: number;
  keyword?: string;
  page?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
}

// Coordinate type
export interface Coordinate {
  latitude: number;
  longitude: number;
}
