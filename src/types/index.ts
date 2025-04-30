
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
  rank?: number;
  localRelevance?: number;
  attendance?: {
    forecast?: number;
  }
}

export type PartySubcategory = 'day-party' | 'social' | 'club' | 'networking' | 'celebration' | 'general';
