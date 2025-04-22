// Import party subcategory type
import { PartySubcategory } from '../utils/eventNormalizers';

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
  partySubcategory?: PartySubcategory; // Added for party event subcategorization
  image: string;
  coordinates?: [number, number]; // [longitude, latitude]
  url?: string;
  price?: string;
  favorited?: boolean;
  // Internal fields for favorite/reminder functionality
  _favoriteId?: string;
  _remindersEnabled?: boolean;
  _isFavorite?: boolean;
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
  remindersEnabled?: boolean;
  reminderSentAt?: string | null;
  event?: Event; // Reference to the full event object if this is an EVENT type
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
