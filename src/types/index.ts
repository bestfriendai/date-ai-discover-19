// Party subcategory types
// Re-export PartySubcategory type
export type PartySubcategory =
  | 'day-party'
  | 'social'
  | 'brunch'
  | 'club'
  | 'networking'
  | 'celebration'
  | 'immersive'
  | 'popup'
  | 'silent'
  | 'rooftop'
  | 'general';

// Event types
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
  rawDate?: string; // Original date string for sorting/filtering
  isPartyEvent?: boolean; // Explicitly mark party events
  // Ticket information
  ticketInfo?: {
    price?: string;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    availability?: string;
    purchaseUrl?: string;
    provider?: string;
  };
  // Website links
  websites?: {
    tickets?: string;
    official?: string;
    venue?: string;
  };
  // PredictHQ specific fields
  rank?: number; // Event impact score (1-100)
  localRelevance?: number; // Local impact score (1-100)
  attendance?: {
    forecast?: number; // Predicted attendance
    actual?: number; // Actual attendance if available
  };
  demandSurge?: boolean; // Indicates if event is causing unusual demand
  isRealTime?: boolean; // Indicates if event is real-time/unscheduled
  predictHQCategories?: string[]; // Additional categories from PredictHQ
  tags?: string[]; // Event tags/keywords
}

// Itinerary types
export interface ItineraryItem {
  id: string;
  eventId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  coordinates?: [number, number];
  notes?: string;
  type: 'EVENT' | 'CUSTOM';
  order: number;
}

export interface Itinerary {
  id: string;
  name: string;
  description?: string;
  date: string;
  items: ItineraryItem[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  favorites: string[]; // Array of event IDs
  itineraries: string[]; // Array of itinerary IDs
  preferences?: {
    defaultLocation?: string;
    preferredCategories?: string[];
  };
}
