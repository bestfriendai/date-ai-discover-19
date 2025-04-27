
export interface SearchParams {
  keyword?: string;
  location?: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number | string;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  limit?: number;
  page?: number;
  excludeIds?: string[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  category?: string;
  image?: string;
  coordinates?: [number, number];
  latitude?: number;
  longitude?: number;
  venue?: string;
  url?: string;
  source: string;
  price?: string;
  partySubcategory?: string;
}

export interface APIResponse {
  events: Event[];
  error?: string;
  warning?: string;
}
