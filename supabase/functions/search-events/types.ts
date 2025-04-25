export interface Event {
  id: string;
  title: string;
  description: string;
  start: string;
  end?: string;
  url: string;
  image?: string;
  venue?: Venue;
  category?: string;
  subcategories?: string[];
  source: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  coordinates?: [number, number];
  attendance?: number | { forecast: any; actual: any; };
  entities?: Entity[];
  relevance?: number;
  date?: string;
  time?: string;
  location?: string;
  partySubcategory?: string;
  rank?: number;
  price?: number;
  localRelevance?: number;
  demandSurge?: number;
}

export interface Venue {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: [number, number];
}

export interface Entity {
  name: string;
  type: string;
}

export interface SearchParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string[];
  text?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  timeout?: number;
}

export interface SourceStats {
  ticketmasterCount: number;
  ticketmasterError?: string;
  predicthqCount: number;
  predicthqError?: string;
}

export interface Metadata {
  startTime: number;
  totalEvents: number;
  eventsWithCoords: number;
  ticketmasterUsage?: ApiUsage;
  predicthqUsage?: ApiUsage;
}

export interface ApiUsage {
  calls: number;
  errors: number;
  latency: number;
}

export interface PredictHQParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string[];
  text?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  q?: string;
  location_around?: string;
  within?: string;
}
