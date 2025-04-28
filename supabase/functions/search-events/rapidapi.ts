// @ts-ignore: Deno types
import { apiKeyManager } from './apiKeyManager.ts';
import { Event, SearchParams } from './types.ts';

/**
 * Interface for RapidAPI search response
 */
interface RapidAPISearchResponse {
  status?: string;
  request_id?: string;
  parameters?: {
    query?: string;
    is_virtual?: boolean;
    date?: string;
    start?: number;
  };
  data?: RapidAPIEventNew[];
  events?: RapidAPIEvent[];
  total_count?: number;
}

/**
 * Interface for raw event from RapidAPI in "events" format
 */
interface RapidAPIEvent {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  category?: string;
  start_time?: string;
  start_date?: string;
  venue?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  image?: string;
  url?: string;
  performers?: Array<{
    name?: string;
    image?: string;
  }>;
  price?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

/**
 * Interface for RapidAPI parameters
 */
interface RapidAPIParams {
  query?: string;
  allQueries?: string[];
  date?: string;
  is_virtual?: boolean;
  start?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/**
 * Interface for raw event from RapidAPI in "data" format
 */
interface RapidAPIEventNew {
  event_id: string;
  name: string;
  description?: string;
  category?: string;
  date?: string;
  date_human_readable?: string;
  link?: string;
  start_time?: string;
  start_time_utc?: string;
  thumbnail?: string;
  venue?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    full_address?: string;
    latitude?: number;
    longitude?: number;
    subtype?: string;
    subtypes?: string[];
  };
  ticket_links?: Array<{
    link: string;
    provider?: string;
  }>;
  info_links?: Array<{
    link: string;
    provider?: string;
  }>;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Convert latitude and longitude from degrees to radians
  const radLat1 = (Math.PI * lat1) / 180;
  const radLon1 = (Math.PI * lon1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;
  const radLon2 = (Math.PI * lon2) / 180;

  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Earth's radius in miles
  const earthRadius = 3958.8;

  // Calculate the distance
  return earthRadius * c;
}

/**
 * Map event category to standardized category
 */
function mapEventCategoryToCategory(category: string): string {
  const lowerCategory = category.toLowerCase();

  if (
    lowerCategory.includes('music') ||
    lowerCategory.includes('concert') ||
    lowerCategory.includes('festival')
  ) {
    return 'music';
  }

  if (
    lowerCategory.includes('sport') ||
    lowerCategory.includes('game') ||
    lowerCategory.includes('match')
  ) {
    return 'sports';
  }

  if (
    lowerCategory.includes('art') ||
    lowerCategory.includes('museum') ||
    lowerCategory.includes('gallery') ||
    lowerCategory.includes('theatre') ||
    lowerCategory.includes('theater') ||
    lowerCategory.includes('performance')
  ) {
    return 'arts';
  }

  if (
    lowerCategory.includes('family') ||
    lowerCategory.includes('kid') ||
    lowerCategory.includes('children')
  ) {
    return 'family';
  }

  if (
    lowerCategory.includes('food') ||
    lowerCategory.includes('drink') ||
    lowerCategory.includes('dining') ||
    lowerCategory.includes('tasting')
  ) {
    return 'food';
  }

  if (
    lowerCategory.includes('party') ||
    lowerCategory.includes('nightlife') ||
    lowerCategory.includes('club') ||
    lowerCategory.includes('bar') ||
    lowerCategory.includes('lounge') ||
    lowerCategory.includes('dj') ||
    lowerCategory.includes('dance') ||
    lowerCategory.includes('rave') ||
    lowerCategory.includes('nightclub') ||
    lowerCategory.includes('disco') ||
    lowerCategory.includes('social') ||
    lowerCategory.includes('mixer') ||
    lowerCategory.includes('gala')
  ) {
    // Consistently return 'party' instead of 'nightlife' for better category filtering
    console.log(`[RAPIDAPI] Mapped category '${category}' to 'party'`);
    return 'party';
  }

  return 'other';
}

/**
 * Transform a RapidAPI event to our common Event interface (old format)
 */
function transformRapidAPIEvent(input: RapidAPIEvent): Event {
  // Get the image or use a placeholder
  const eventImage = input.image ||
                      input.performers?.[0]?.image ||
                      'https://placehold.co/600x400?text=No+Image';

  // Extract datetime information
  let dateTime: Date | null = null;
  if (input.start_date && input.start_time) {
    try {
      dateTime = new Date(`${input.start_date}T${input.start_time}`);
    } catch (err) {
      console.error(`[RAPIDAPI] Error parsing date: ${input.start_date}T${input.start_time}`, err);
    }
  } else if (input.start_date) {
    try {
      dateTime = new Date(input.start_date);
    } catch (err) {
      console.error(`[RAPIDAPI] Error parsing date: ${input.start_date}`, err);
    }
  }

  const date = dateTime ? dateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : 'Date unavailable';

  const time = dateTime ? dateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : 'Time unavailable';

  // Extract venue information
  const venue = input.venue?.name || '';
  let location = '';

  if (input.venue) {
    const venueParts = [
      input.venue.city,
      input.venue.state,
      input.venue.country
    ].filter(Boolean);

    location = venueParts.join(', ');
  }

  // Determine category
  const category = input.category ? mapEventCategoryToCategory(input.category) : 'other';

  // Get price information
  const minPrice = input.price?.min;
  const maxPrice = input.price?.max;
  const currency = input.price?.currency || 'USD';

  let priceDisplay = 'Price unavailable';
  if (minPrice !== undefined && maxPrice !== undefined && minPrice !== maxPrice) {
    priceDisplay = `${currency === 'USD' ? '$' : currency}${minPrice} - ${currency === 'USD' ? '$' : currency}${maxPrice}`;
  } else if (minPrice !== undefined) {
    priceDisplay = `${currency === 'USD' ? '$' : currency}${minPrice}`;
  } else if (maxPrice !== undefined) {
    priceDisplay = `${currency === 'USD' ? '$' : currency}${maxPrice}`;
  }

  // Check if this is potentially a party event - enhanced detection
  const partyKeywords = ['party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave', 'nightclub', 'mixer', 'social'];
  const titleLower = input.title?.toLowerCase() || '';
  const descriptionLower = input.description?.toLowerCase() || '';

  const isPartyEvent = (
    category === 'party' ||
    category === 'nightlife' ||
    partyKeywords.some(keyword => titleLower.includes(keyword)) ||
    (descriptionLower && partyKeywords.some(keyword => descriptionLower.includes(keyword)))
  );

  // For party events, make sure we have coordinates if possible
  let coordinates = undefined;
  let eventLongitude = input.venue?.location?.lng;
  let eventLatitude = input.venue?.location?.lat;

  // Only set coordinates if we have both latitude and longitude
  if (eventLatitude !== undefined && eventLongitude !== undefined &&
      eventLatitude !== null && eventLongitude !== null &&
      !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude))) {
    coordinates = [Number(eventLongitude), Number(eventLatitude)];
  }

  // Create standardized event object
  return {
    id: `rapidapi_${input.id || input._id}`,
    source: 'rapidapi',
    title: input.title || 'Untitled Event',
    description: input.description || '',
    date,
    time,
    location,
    venue,
    category,
    image: eventImage,
    imageAlt: `${input.title || 'Event'} image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: input.url,
    price: priceDisplay,
    rawDate: input.start_date,
    isPartyEvent, 
    ticketInfo: {
      price: priceDisplay,
      minPrice: input.price?.min,
      maxPrice: input.price?.max,
      currency,
      availability: 'available',
      purchaseUrl: input.url,
      provider: 'RapidAPI'
    },
    websites: {
      tickets: input.url
    }
  };
}

/**
 * Transform a new format RapidAPI event to our common Event interface
 */
function transformRapidAPIEventNew(input: RapidAPIEventNew): Event {
  // Get the image or use a placeholder
  const eventImage = input.thumbnail || 'https://placehold.co/600x400?text=No+Image';

  // Extract datetime information
  let dateTime: Date | null = null;
  if (input.start_time) {
    try {
      dateTime = new Date(input.start_time);
    } catch (err) {
      console.error(`[RAPIDAPI] Error parsing start_time: ${input.start_time}`, err);
    }
  } else if (input.start_time_utc) {
    try {
      dateTime = new Date(input.start_time_utc);
    } catch (err) {
      console.error(`[RAPIDAPI] Error parsing start_time_utc: ${input.start_time_utc}`, err);
    }
  } 

  // Use date_human_readable if available, otherwise format the date
  const date = input.date_human_readable ?
    input.date_human_readable.split('–')[0].trim() :
    (dateTime ? dateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) : 'Date unavailable');

  // Format the time if we have a valid date object
  const time = dateTime ? dateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : 'Time unavailable';

  // Extract venue information
  const venue = input.venue?.name || '';
  let location = '';

  if (input.venue) {
    // Use full_address if available
    if (input.venue.full_address) {
      location = input.venue.full_address;
    } else {
      // Otherwise construct from parts
      const venueParts = [
        input.venue.city,
        input.venue.state,
        input.venue.country
      ].filter(Boolean);

      location = venueParts.join(', ');
    }
  }

  // Determine category from venue subtype or default to 'other'
  let category = 'other';
  if (input.venue?.subtype) {
    category = mapEventCategoryToCategory(input.venue.subtype);
  } else if (input.venue?.subtypes && input.venue.subtypes.length > 0) {
    category = mapEventCategoryToCategory(input.venue.subtypes[0]);
  }

  // Get the best URL from ticket_links or info_links
  let eventUrl = input.link || '';
  let ticketUrl = '';

  // First try to get a ticket link
  if (input.ticket_links && input.ticket_links.length > 0) {
    ticketUrl = input.ticket_links[0].link;
  }
  
  // If no ticket link is available, try info links
  if (!ticketUrl && input.info_links && input.info_links.length > 0) {
    ticketUrl = input.info_links[0].link;
  }

  // Fallback to the general link
  const finalUrl = ticketUrl || eventUrl;

  // Check if this is potentially a party event
  const partyKeywords = ['party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave', 'nightclub', 'mixer', 'social'];
  const nameLower = input.name.toLowerCase();
  const descriptionLower = input.description?.toLowerCase() || '';

  const isPartyEvent = (
    category === 'party' ||
    partyKeywords.some(keyword => nameLower.includes(keyword)) ||
    (descriptionLower && partyKeywords.some(keyword => descriptionLower.includes(keyword)))
  );

  // Extract coordinates from venue if available
  let coordinates = undefined;
  let eventLongitude = input.venue?.longitude;
  let eventLatitude = input.venue?.latitude;

  // Only set coordinates if we have both latitude and longitude
  if (eventLatitude !== undefined && eventLongitude !== undefined &&
      eventLatitude !== null && eventLongitude !== null &&
      !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude))) {
    coordinates = [Number(eventLongitude), Number(eventLatitude)];
  }

  // Create standardized event object
  return {
    id: `rapidapi_${input.event_id}`,
    source: 'rapidapi',
    title: input.name,
    description: input.description || '',
    date,
    time,
    location,
    venue,
    category,
    image: eventImage,
    imageAlt: `${input.name} image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: finalUrl,
    price: 'Price unavailable', // RapidAPI new format doesn't provide price
    rawDate: input.start_time_utc || input.start_time,
    isPartyEvent,
    ticketInfo: {
      price: 'Price unavailable',
      currency: 'USD',
      availability: 'available',
      purchaseUrl: ticketUrl || finalUrl,
      provider: 'RapidAPI'
    },
    websites: {
      tickets: ticketUrl || finalUrl,
      official: eventUrl
    }
  };
}

/**
 * Fetch events from RapidAPI
 * @param params Search parameters
 * @returns Promise with array of standardized events
 */
export async function fetchRapidApiEvents(params: SearchParams): Promise<Event[]> {
  console.log('[RAPIDAPI] Fetching events with params:', JSON.stringify(params));
  
  try {
    // Get API key
    const apiKey = await apiKeyManager.getApiKey('rapidapi');
    if (!apiKey) {
      console.error('[RAPIDAPI] No API key available');
      return [];
    }

    // Prepare RapidAPI parameters
    const apiParams: RapidAPIParams = {};
    
    // Handle location parameters
    if (params.latitude && params.longitude) {
      apiParams.latitude = params.latitude;
      apiParams.longitude = params.longitude;
      // Convert radius from miles to kilometers if provided
      if (params.radius) {
        apiParams.radius = Math.round(params.radius * 1.60934);
      }
    }

    // Handle date parameter (format: YYYY-MM-DD)
    if (params.startDate) {
      apiParams.date = params.startDate.split('T')[0];
    }

    // Handle keyword/query parameter
    if (params.keyword) {
      apiParams.query = params.keyword;
    }

    // Set virtual event parameter (default to false when location is specified)
    apiParams.is_virtual = false;
    
    // Build the query URL
    const baseUrl = 'https://events-api-production.up.railway.app';
    const url = new URL('/api/search', baseUrl);
    
    // Add parameters to the URL
    if (apiParams.query) url.searchParams.append('query', apiParams.query);
    if (apiParams.date) url.searchParams.append('date', apiParams.date);
    if (apiParams.is_virtual !== undefined) url.searchParams.append('is_virtual', apiParams.is_virtual.toString());
    if (apiParams.latitude !== undefined) url.searchParams.append('latitude', apiParams.latitude.toString());
    if (apiParams.longitude !== undefined) url.searchParams.append('longitude', apiParams.longitude.toString());
    if (apiParams.radius !== undefined) url.searchParams.append('radius', apiParams.radius.toString());

    // Set request options
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'events-api-production.up.railway.app'
      }
    };

    // Log the request (without showing the API key)
    console.log(`[RAPIDAPI] Fetching from: ${url.toString()}`);
    
    // Make the request
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      console.error(`[RAPIDAPI] Error: ${response.status} - ${response.statusText}`);
      return [];
    }
    
    // Parse the response
    const data: RapidAPISearchResponse = await response.json();
    
    // Check if we have events in the new format (data field) or old format (events field)
    const events: Event[] = [];
    
    // Process new-format events (from 'data' field)
    if (data.data && data.data.length > 0) {
      console.log(`[RAPIDAPI] Found ${data.data.length} events in new format`);
      data.data.forEach(event => {
        try {
          events.push(transformRapidAPIEventNew(event));
        } catch (err) {
          console.error('[RAPIDAPI] Error transforming new format event:', err);
        }
      });
    } 
    // Process old-format events (from 'events' field)
    else if (data.events && data.events.length > 0) {
      console.log(`[RAPIDAPI] Found ${data.events.length} events in old format`);
      data.events.forEach(event => {
        try {
          events.push(transformRapidAPIEvent(event));
        } catch (err) {
          console.error('[RAPIDAPI] Error transforming old format event:', err);
        }
      });
    } else {
      console.log('[RAPIDAPI] No events found in response');
    }
    
    // Filter out events without coordinates if location search was specified
    if (params.latitude && params.longitude && params.radius) {
      console.log('[RAPIDAPI] Filtering events by distance');
      const filteredEvents = events.filter(event => {
        // Skip events without coordinates
        if (!event.coordinates && (!event.latitude || !event.longitude)) {
          return false;
        }
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          params.latitude!,
          params.longitude!,
          event.latitude!,
          event.longitude!
        );
        
        // Keep events within the radius
        return distance <= params.radius!;
      });
      
      console.log(`[RAPIDAPI] ${filteredEvents.length} events within ${params.radius} miles radius`);
      return filteredEvents;
    }
    
    return events;
  } catch (error) {
    console.error('[RAPIDAPI] Error fetching events:', error);
    return [];
  }
}