/**
 * SeatGeek API integration for fetching events
 * Documentation: https://platform.seatgeek.com/
 */

import { Event, SearchParams } from './types.ts';

/**
 * Interface for SeatGeek API parameters
 */
export interface SeatGeekParams {
  client_id: string;
  lat?: number;
  lon?: number;
  range?: string;
  'datetime_utc.gte'?: string;
  'datetime_utc.lte'?: string;
  q?: string;
  per_page?: number;
  page?: number;
  venue?: string;
  type?: string;
}

/**
 * Interface for SeatGeek event response
 */
interface SeatGeekEvent {
  id: number;
  type: string;
  title: string;
  description?: string;
  datetime_local: string;
  datetime_utc: string;
  venue: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    location?: {
      lat: number;
      lon: number;
    };
    display_location?: string;
  };
  performers?: Array<{
    name: string;
    image?: string;
    images?: {
      huge?: string;
      large?: string;
      medium?: string;
      small?: string;
    };
    genres?: Array<{name: string}>;
    type?: string;
    short_name?: string;
  }>;
  url?: string;
  stats?: {
    lowest_price?: number;
    highest_price?: number;
    average_price?: number;
  };
}

/**
 * Interface for SeatGeek API response
 */
interface SeatGeekResponse {
  events: SeatGeekEvent[];
  meta: {
    per_page: number;
    total: number;
    page: number;
  };
}

/**
 * Map SeatGeek event type to category
 */
function mapEventTypeToCategory(eventType: string): string {
  switch (eventType.toLowerCase()) {
    case 'concert':
      return 'music';
    case 'sports':
      return 'sports';
    case 'theater':
      return 'arts';
    case 'comedy':
      return 'comedy';
    case 'family':
      return 'family';
    case 'dance_performance_tour':
      return 'dance';
    case 'classical':
      return 'arts';
    case 'broadway_tickets_national':
      return 'arts';
    case 'classical_opera':
      return 'arts';
    case 'classical_orchestral_instrumental':
      return 'arts';
    case 'literary':
      return 'arts';
    case 'cirque_du_soleil':
      return 'family';
    default:
      return 'other';
  }
}

/**
 * Transform a SeatGeek event to our common Event interface
 */
function transformSeatGeekEvent(input: SeatGeekEvent): Event {
  // Get the first performer image or use a placeholder
  const performerImage = input.performers?.[0]?.image || 
                       input.performers?.[0]?.images?.large || 
                       'https://placehold.co/600x400?text=No+Image';
  
  // Extract datetime information
  const dateTime = new Date(input.datetime_local);
  const date = dateTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const time = dateTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });

  // Extract venue information
  const venue = input.venue.name;
  let location = input.venue.display_location || '';
  if (!location && input.venue.city) {
    location = [input.venue.city, input.venue.state, input.venue.country]
      .filter(Boolean)
      .join(', ');
  }

  // Determine category from event type or performers
  const categoryFromType = mapEventTypeToCategory(input.type);

  // Get price information
  const minPrice = input.stats?.lowest_price;
  const maxPrice = input.stats?.highest_price;
  let priceDisplay = 'Price unavailable';
  if (minPrice && maxPrice && minPrice !== maxPrice) {
    priceDisplay = `$${minPrice} - $${maxPrice}`;
  } else if (minPrice) {
    priceDisplay = `$${minPrice}`;
  } else if (maxPrice) {
    priceDisplay = `$${maxPrice}`;
  }

  // Create standardized event object
  return {
    id: `seatgeek_${input.id}`,
    source: 'seatgeek',
    title: input.title,
    description: input.description || '',
    date,
    time,
    location,
    venue,
    category: categoryFromType,
    image: performerImage,
    imageAlt: `${input.title} event image`,
    coordinates: input.venue.location ? [input.venue.location.lon, input.venue.location.lat] : undefined,
    longitude: input.venue.location?.lon,
    latitude: input.venue.location?.lat,
    url: input.url,
    price: priceDisplay,
    rawDate: input.datetime_utc,
    ticketInfo: {
      price: priceDisplay,
      minPrice: input.stats?.lowest_price,
      maxPrice: input.stats?.highest_price,
      currency: 'USD',
      availability: 'available',
      purchaseUrl: input.url,
      provider: 'SeatGeek'
    },
    websites: {
      tickets: input.url
    }
  };
}

/**
 * Extract SeatGeek-specific parameters from SearchParams
 */
function extractSeatGeekParams(params: SearchParams, apiKey: string): SeatGeekParams {
  // Convert radius from kilometers to miles (for SeatGeek API range parameter)
  // SeatGeek uses "range" in miles, format like "10mi"
  const rangeInMiles = Math.round(params.radius / 1.60934);
  
  const seatgeekParams: SeatGeekParams = {
    client_id: apiKey,
    per_page: params.limit || 50,
    page: params.page || 1,
  };

  // Add coordinates if available
  if (params.latitude && params.longitude) {
    seatgeekParams.lat = params.latitude;
    seatgeekParams.lon = params.longitude;
    seatgeekParams.range = `${rangeInMiles}mi`;
  } else if (params.lat && params.lng) {
    seatgeekParams.lat = params.lat;
    seatgeekParams.lon = params.lng;
    seatgeekParams.range = `${rangeInMiles}mi`;
  } else if (params.userLat && params.userLng) {
    seatgeekParams.lat = params.userLat;
    seatgeekParams.lon = params.userLng;
    seatgeekParams.range = `${rangeInMiles}mi`;
  }

  // Add search keyword
  if (params.keyword) {
    seatgeekParams.q = params.keyword;
  }

  // Add date range parameters
  if (params.startDate) {
    seatgeekParams['datetime_utc.gte'] = params.startDate;
  }

  if (params.endDate) {
    seatgeekParams['datetime_utc.lte'] = params.endDate;
  } else if (params.startDate) {
    // If only start date is provided, default end date to 3 months later
    const endDate = new Date(params.startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    seatgeekParams['datetime_utc.lte'] = endDate.toISOString().split('T')[0];
  }

  // Add event type filtering
  if (params.categories && params.categories.length > 0) {
    // Map categories to SeatGeek event types
    const typeMap: Record<string, string> = {
      'music': 'concert',
      'sports': 'sports',
      'arts': 'theater',
      'family': 'family_fun_kids',
      'comedy': 'comedy'
    };
    
    const mappedTypes = params.categories
      .map(cat => typeMap[cat])
      .filter(Boolean);
    
    if (mappedTypes.length > 0) {
      seatgeekParams.type = mappedTypes.join(',');
    }
  }

  return seatgeekParams;
}

/**
 * Search for events using the SeatGeek API
 */
export async function fetchSeatGeekEvents(params: SearchParams): Promise<{
  events: Event[];
  error: string | null;
  status: number;
}> {
  console.log('[SEATGEEK] Starting SeatGeek event search');
  
  try {
    // Get API key from environment variables
    // @ts-ignore: Deno is available at runtime
    const seatgeekKey = Deno.env.get('SEATGEEK_CLIENT_ID');
    
    // Verify API key is present before making request
    if (!seatgeekKey) {
      console.error('[SEATGEEK] No SeatGeek API key available');
      return {
        events: [],
        error: 'Missing SeatGeek API key',
        status: 401
      };
    }

    // Extract SeatGeek-specific parameters
    const seatgeekParams = extractSeatGeekParams(params, seatgeekKey);
    
    // Build URL with query parameters
    const baseUrl = 'https://api.seatgeek.com/2/events';
    const queryParams = new URLSearchParams();
    
    // Add all parameters to query string
    Object.entries(seatgeekParams).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const url = `${baseUrl}?${queryParams.toString()}`;
    console.log(`[SEATGEEK] Fetching events from: ${url}`);

    // Make request to SeatGeek API
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DateDiscovery/1.0'
      }
    });

    if (response.status === 429) {
      console.error('[SEATGEEK] Rate limit exceeded');
      return {
        events: [],
        error: 'Rate limit exceeded',
        status: 429
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SEATGEEK] API error: ${response.status} ${errorText}`);
      
      // Browser console log for tracking errors
      console.log('%c[SEATGEEK] API Error', 'color: #F44336; font-weight: bold', {
        status: response.status,
        error: errorText,
        requestParams: seatgeekParams
      });
      
      return {
        events: [],
        error: `API error: ${response.status} ${errorText}`,
        status: response.status
      };
    }

    const data = await response.json() as SeatGeekResponse;
    console.log(`[SEATGEEK] Found ${data.events.length} events`);
    
    // Log response summary
    console.log('[SEATGEEK] API response summary:', {
      totalEvents: data.meta?.total || 0,
      returnedEvents: data.events?.length || 0,
      page: data.meta?.page || 1,
      perPage: data.meta?.per_page || 0
    });
    
    // Browser console log for tracking
    console.log('%c[SEATGEEK] Response summary', 'color: #2196F3; font-weight: bold', {
      totalEvents: data.meta?.total || 0,
      returnedEvents: data.events?.length || 0,
      page: data.meta?.page || 1,
      perPage: data.meta?.per_page || 0
    });

    // Transform events to common Event interface
    const transformedEvents = data.events.map(transformSeatGeekEvent);
    
    // Browser console log for tracking successful events
    console.log('%c[SEATGEEK] Successfully fetched events', 'color: #4CAF50; font-weight: bold', {
      rawEventCount: data.events.length,
      transformedEventCount: transformedEvents.length,
      eventsWithImages: transformedEvents.filter(e => e.image && e.image !== 'https://placehold.co/600x400?text=No+Image').length,
      eventsWithUrls: transformedEvents.filter(e => e.url).length,
      categories: transformedEvents.reduce((acc, event) => {
        if (event.category) {
          acc[event.category] = (acc[event.category] || 0) + 1;
        }
        return acc;
      }, {}),
      executionTime: Date.now() - startTime
    });
    
    return {
      events: transformedEvents,
      error: null,
      status: 200
    };

  } catch (error) {
    console.error('[SEATGEEK] Error searching events:', error);
    return {
      events: [],
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}