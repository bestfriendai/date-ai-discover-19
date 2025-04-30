
export interface Event {
  id: string;
  source?: string;
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  venue?: string;
  category?: string;
  image?: string;
  imageAlt?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  url?: string;
  isPartyEvent?: boolean;
  partySubcategory?: string;
  rawDate?: string;
  price?: string;
  latitude?: number;
  longitude?: number;
}

// Add any other types you need...
