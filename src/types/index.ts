
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
  url?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  latitude?: number; // Added for convenience
  longitude?: number; // Added for convenience
  price?: string;
  rawDate?: string;
  isPartyEvent?: boolean;
  isSelected?: boolean; // Added for marker highlighting
  rank?: number;
  localRelevance?: number;
  attendance?: {
    forecast?: number;
  }
}

export type PartySubcategory = 
  | 'day-party' 
  | 'social' 
  | 'club' 
  | 'nightclub'
  | 'networking' 
  | 'celebration' 
  | 'general' 
  | 'festival'
  | 'day party' 
  | 'rooftop' 
  | 'immersive' 
  | 'popup'
  | 'brunch';

export interface SearchEventsParams {
  query?: string;
  location?: string;
  date?: string;
  limit?: number;
  category?: string;
  coordinates?: [number, number];
  radius?: number;
  excludeIds?: string[];
  fields?: string[];
  categories?: string[];
}
