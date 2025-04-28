/**
 * Real-Time Events Search API integration for fetching events
 * Documentation: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-events-search
 */

import { Event, SearchParams } from './types.ts';
import { apiKeyManager } from './apiKeyManager.ts';

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
 * Interface for RapidAPI Events Search API parameters
 */
export interface RapidAPIParams {
  query?: string;
  date?: string;
  is_virtual?: boolean;
  start?: number;
  event_id?: string;
  allQueries?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/**
 * Interface for RapidAPI event response
 */
interface RapidAPIEvent {
  _id?: string;
  id: string;
  title: string;
  description?: string;
  image?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  timezone?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  performers?: Array<{
    name?: string;
    image?: string;
  }>;
  url?: string;
  price?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  category?: string;
}

/**
 * Interface for RapidAPI Events search response
 */
interface RapidAPISearchResponse {
  status: string;
  request_id: string;
  parameters: {
    query?: string;
    is_virtual: boolean;
    date: string;
    start: number;
  };
  data: RapidAPIEventNew[];
  events?: RapidAPIEvent[]; // For backward compatibility
  start?: number;
  total_events?: number;
  total_pages?: number;
}

/**
 * Interface for new RapidAPI event response format
 */
interface RapidAPIEventNew {
  event_id: string;
  name: string;
  link: string;
  description?: string;
  language?: string;
  date_human_readable?: string;
  start_time?: string;
  start_time_utc?: string;
  end_time?: string;
  end_time_utc?: string;
  is_virtual: boolean;
  thumbnail?: string;
  publisher?: string;
  publisher_domain?: string;
  ticket_links?: Array<{
    source?: string;
    link?: string;
    fav_icon?: string;
  }>;
  info_links?: Array<{
    source?: string;
    link?: string;
  }>;
  venue?: {
    google_id?: string;
    name?: string;
    phone_number?: string;
    website?: string;
    review_count?: number;
    rating?: number;
    subtype?: string;
    subtypes?: string[];
    full_address?: string;
    latitude?: number;
    longitude?: number;
    district?: string;
    street_number?: string;
    street?: string;
    city?: string;
    zipcode?: string;
    state?: string;
    country?: string;
    timezone?: string;
    google_mid?: string;
  };
}

/**
 * Interface for RapidAPI Event details response
 */
interface RapidAPIEventDetailsResponse {
  event: RapidAPIEvent;
}

/**
 * Map RapidAPI event category to standardized category
 */
function mapEventCategoryToCategory(category: string): string {
  if (!category) return 'other';

  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('concert') || lowerCategory.includes('music') || lowerCategory.includes('festival')) {
    return 'music';
  } else if (lowerCategory.includes('sport')) {
    return 'sports';
  } else if (lowerCategory.includes('art') || lowerCategory.includes('theater') || lowerCategory.includes('exhibition')) {
    return 'arts';
  } else if (lowerCategory.includes('comedy')) {
    return 'comedy';
  } else if (lowerCategory.includes('family')) {
    return 'family';
  } else if (lowerCategory.includes('food') || lowerCategory.includes('drink')) {
    return 'food';
  } else if (lowerCategory.includes('dance') && !lowerCategory.includes('party') && !lowerCategory.includes('club')) {
    return 'dance';
  } else if (
    lowerCategory.includes('party') ||
    lowerCategory.includes('nightlife') ||
    lowerCategory.includes('club') ||
    lowerCategory.includes('dj') ||
    lowerCategory.includes('lounge') ||
    lowerCategory.includes('rave') ||
    lowerCategory.includes('mixer') ||
    lowerCategory.includes('cocktail') ||
    lowerCategory.includes('gala')
  ) {
    // Consistently return 'party' instead of 'nightlife' for better category filtering
    console.log(`[RAPIDAPI] Mapped category '${category}' to 'party'`);
    return 'party';
  }

  return 'other';
}

/**
 * Transform a RapidAPI event to our common Event interface
 */
function transformRapidAPIEvent(input: RapidAPIEvent): Event {
  // Get the image or use a placeholder
  const eventImage = input.image ||
                      input.performers?.[0]?.image ||
                      'https://placehold.co/600x400?text=No+Image';

  // Extract datetime information
  let dateTime: Date | null = null;
  if (input.start_date && input.start_time) {
    dateTime = new Date(`${input.start_date}T${input.start_time}`);
  } else if (input.start_date) {
    dateTime = new Date(input.start_date);
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

  // Log party events for debugging
  if (isPartyEvent) {
    console.log(`[RAPIDAPI] Found party event: ${input.title}`);
    console.log(`[RAPIDAPI] Party event coordinates: ${coordinates ? 'Yes' : 'No'}`);
    if (coordinates) {
      console.log(`[RAPIDAPI] Party event coordinates: [${coordinates[0]}, ${coordinates[1]}]`);
    }
  }

  // Create standardized event object
  return {
    id: `rapidapi_${input.id || input._id}`,
    source: 'rapidapi',
    title: input.title,
    description: input.description || '',
    date,
    time,
    location,
    venue,
    category,
    image: eventImage,
    imageAlt: `${input.title} event image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: input.url,
    price: priceDisplay,
    rawDate: input.start_date,
    isPartyEvent, // Add flag for party events
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
  console.log(`[RAPIDAPI] Transforming event: ${input.name || 'Unnamed event'}`);

  // Get the image or use a placeholder
  const eventImage = input.thumbnail || 'https://placehold.co/600x400?text=No+Image';

  // Extract datetime information
  let dateTime: Date | null = null;
  if (input.start_time) {
    dateTime = new Date(input.start_time);
    console.log(`[RAPIDAPI] Parsed start_time: ${input.start_time} -> ${dateTime.toISOString()}`);
  } else if (input.start_time_utc) {
    dateTime = new Date(input.start_time_utc);
    console.log(`[RAPIDAPI] Parsed start_time_utc: ${input.start_time_utc} -> ${dateTime.toISOString()}`);
  } else {
    console.log(`[RAPIDAPI] No start time available for event: ${input.name}`);
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

    // Log venue details for debugging
    console.log(`[RAPIDAPI] Venue details:`, {
      name: input.venue.name || 'Not provided',
      address: input.venue.full_address || 'Not provided',
      city: input.venue.city || 'Not provided',
      state: input.venue.state || 'Not provided',
      country: input.venue.country || 'Not provided',
      hasCoordinates: !!(input.venue.latitude && input.venue.longitude)
    });
  } else {
    console.log(`[RAPIDAPI] No venue information for event: ${input.name}`);
  }

  // Determine category from venue subtype or default to 'other'
  let category = 'other';
  if (input.venue?.subtype) {
    category = mapEventCategoryToCategory(input.venue.subtype);
    console.log(`[RAPIDAPI] Mapped venue subtype "${input.venue.subtype}" to category "${category}"`);
  } else if (input.venue?.subtypes && input.venue.subtypes.length > 0) {
    category = mapEventCategoryToCategory(input.venue.subtypes[0]);
    console.log(`[RAPIDAPI] Mapped venue subtypes[0] "${input.venue.subtypes[0]}" to category "${category}"`);
  } else {
    console.log(`[RAPIDAPI] No venue subtype available, using default category "other"`);
  }

  // Get the best URL from ticket_links or info_links
  let eventUrl = input.link || '';
  let ticketUrl = '';

  // First try to get a ticket URL
  if (input.ticket_links && input.ticket_links.length > 0) {
    // Find the first valid ticket link
    const ticketLink = input.ticket_links.find(link => link && link.link);
    if (ticketLink) {
      ticketUrl = ticketLink.link || '';
      // If we don't have an event URL yet, use this as the main URL
      if (!eventUrl) {
        eventUrl = ticketUrl;
      }
      console.log(`[RAPIDAPI] Found ticket link: ${ticketUrl}`);
    }
  }

  // If we still don't have a URL, try info_links
  if (!eventUrl && input.info_links && input.info_links.length > 0) {
    const infoLink = input.info_links.find(link => link && link.link);
    if (infoLink) {
      eventUrl = infoLink.link || '';
      console.log(`[RAPIDAPI] Found info link: ${eventUrl}`);
    }
  }

  // Check if this is potentially a party event - enhanced detection
  const partyKeywords = [
    'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave',
    'nightclub', 'mixer', 'social', 'festival', 'celebration',
    'cocktail', 'happy hour', 'gala', 'bar crawl', 'rooftop'
  ];
  const nameLower = input.name?.toLowerCase() || '';
  const descriptionLower = input.description?.toLowerCase() || '';

  // Enhanced party detection with detailed logging
  let partyKeywordsFound: string[] = [];

  // Check title for party keywords
  partyKeywords.forEach(keyword => {
    if (nameLower.includes(keyword)) {
      partyKeywordsFound.push(`title:${keyword}`);
    }
  });

  // Check description for party keywords
  if (descriptionLower) {
    partyKeywords.forEach(keyword => {
      if (descriptionLower.includes(keyword)) {
        partyKeywordsFound.push(`description:${keyword}`);
      }
    });
  }

  // Check venue subtype for party-related terms
  if (input.venue?.subtype) {
    const subtypeLower = input.venue.subtype.toLowerCase();
    if (subtypeLower.includes('club') ||
        subtypeLower.includes('bar') ||
        subtypeLower.includes('lounge') ||
        subtypeLower.includes('nightlife')) {
      partyKeywordsFound.push(`venue:${input.venue.subtype}`);
    }
  }

  const isPartyEvent = (
    category === 'party' ||
    category === 'nightlife' ||
    partyKeywordsFound.length > 0
  );

  // Log party detection details
  if (partyKeywordsFound.length > 0 || category === 'party' || category === 'nightlife') {
    console.log(`[RAPIDAPI] Party event detection:`, {
      eventName: input.name,
      isPartyEvent,
      category,
      keywordsFound: partyKeywordsFound,
      keywordCount: partyKeywordsFound.length
    });
  }

  // For party events, make sure we have coordinates if possible
  let coordinates: [number, number] | undefined = undefined;
  let eventLongitude = input.venue?.longitude;
  let eventLatitude = input.venue?.latitude;

  // Enhanced coordinate validation with detailed logging
  if (eventLatitude !== undefined && eventLongitude !== undefined) {
    console.log(`[RAPIDAPI] Validating coordinates for event: ${input.name}`);
    console.log(`[RAPIDAPI] Raw coordinates: [${eventLongitude}, ${eventLatitude}]`);

    // Check for null values
    if (eventLatitude === null || eventLongitude === null) {
      console.log(`[RAPIDAPI] Coordinates contain null values`);
    }
    // Check for NaN values
    else if (isNaN(Number(eventLatitude)) || isNaN(Number(eventLongitude))) {
      console.log(`[RAPIDAPI] Coordinates contain NaN values`);
    }
    // Check for valid range
    else if (Math.abs(Number(eventLatitude)) > 90 || Math.abs(Number(eventLongitude)) > 180) {
      console.log(`[RAPIDAPI] Coordinates out of valid range`);
    }
    // Valid coordinates
    else {
      coordinates = [Number(eventLongitude), Number(eventLatitude)];
      console.log(`[RAPIDAPI] Valid coordinates: [${coordinates[0]}, ${coordinates[1]}]`);
    }
  } else {
    console.log(`[RAPIDAPI] No coordinates available for event: ${input.name}`);
  }

  // Special logging for party events
  if (isPartyEvent) {
    console.log(`[RAPIDAPI] Found party event (new format): ${input.name}`);
    console.log(`[RAPIDAPI] Party event coordinates: ${coordinates ? 'Yes' : 'No'}`);
    if (coordinates) {
      console.log(`[RAPIDAPI] Party event coordinates: [${coordinates[0]}, ${coordinates[1]}]`);
    } else {
      console.log(`[RAPIDAPI] WARNING: Party event without coordinates: ${input.name}`);
    }
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
    imageAlt: `${input.name} event image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: eventUrl,
    price: 'Check website for prices',
    rawDate: input.start_time || input.start_time_utc,
    isPartyEvent, // Add flag for party events
    ticketInfo: {
      price: 'Check website for prices',
      minPrice: undefined,
      maxPrice: undefined,
      currency: 'USD',
      availability: 'available',
      purchaseUrl: ticketUrl || eventUrl,
      provider: 'RapidAPI'
    },
    websites: {
      tickets: ticketUrl || eventUrl,
      official: eventUrl
    },
    // Additional data is handled in the frontend
  };
}

/**
 * Extract RapidAPI-specific parameters from SearchParams
 */
function extractRapidAPIParams(params: SearchParams): RapidAPIParams {
  console.log('[RAPIDAPI] extractRapidAPIParams called with params:', {
    keyword: params.keyword || 'not provided',
    location: params.location || 'not provided',
    latitude: params.latitude || 'not provided',
    longitude: params.longitude || 'not provided',
    lat: params.lat || 'not provided',
    lng: params.lng || 'not provided',
    userLat: params.userLat || 'not provided',
    userLng: params.userLng || 'not provided',
    radius: params.radius || 'not provided',
    categories: params.categories || [],
    startDate: params.startDate || 'not provided',
    endDate: params.endDate || 'not provided'
  });

  const apiParams: RapidAPIParams = {};

  // Add query parameter from keyword and/or location
  const queryParts: string[] = [];
  if (params.keyword) {
    queryParts.push(params.keyword);
    console.log(`[RAPIDAPI] Added keyword to query: "${params.keyword}"`);
  }

  // Enhanced location parameter handling
  // First check for any available coordinates in priority order
  const hasCoordinates = params.latitude !== undefined && params.longitude !== undefined;
  const hasLegacyCoordinates = params.lat !== undefined && params.lng !== undefined;
  const hasUserCoordinates = params.userLat !== undefined && params.userLng !== undefined;

  // Log all available location parameters for debugging
  console.log('[RAPIDAPI] Available location parameters:', {
    coordinates: hasCoordinates ? `${params.latitude},${params.longitude}` : 'not provided',
    legacyCoordinates: hasLegacyCoordinates ? `${params.lat},${params.lng}` : 'not provided',
    userCoordinates: hasUserCoordinates ? `${params.userLat},${params.userLng}` : 'not provided',
    locationName: params.location || 'not provided'
  });

  // Use coordinates in priority order
  // Add event type keywords to improve results - especially for party events
  const eventTypeKeywords = ['events', 'concerts', 'festivals', 'parties', 'nightlife', 'entertainment'];

  // Check if we're looking for party events specifically
  const isPartySearch = params.categories &&
    (params.categories.includes('party') ||
     params.categories.includes('nightlife') ||
     params.categories.includes('music'));

  // Make party search even more explicit when it's the primary category
  const isPrimaryPartySearch = isPartySearch &&
    params.categories &&
    params.categories[0] === 'party';

  // Special party-related keywords - enhanced with more specific terms
  const partyKeywords = [
    // High priority party terms (used first)
    'nightclub events', 'dance clubs', 'club events', 'party events', 'nightlife events',
    'EDM events', 'DJ events', 'rave events', 'dance party', 'nightclub party',
    'night clubs', 'clubbing events', 'weekend parties', 'top nightclubs',

    // Medium priority terms
    'parties', 'nightlife', 'nightclub', 'club night', 'dance clubs',
    'bottle service', 'VIP tables', 'DJ party', 'dance party', 'club parties',
    'nightlife hotspots', 'popular clubs', 'best clubs', 'nightclub scene', 'party venues',

    // More general terms
    'music festival', 'rave', 'DJ', 'live music', 'rooftop party',
    'pool party', 'bar crawl', 'happy hour', 'social events', 'lounge',
    'celebration', 'party scene', 'entertainment venues', 'disco', 'electronic music'
  ];

  // Special cocktail/club/bar related terms for party searches
  const venueKeywords = [
    'nightclub', 'dance club', 'lounge', 'cocktail bar', 'rooftop bar',
    'club', 'dance venue', 'bar', 'party venue', 'entertainment venue',
    'dance floor', 'disco', 'night spot', 'bottle service club', 'VIP nightclub',
    'DJ venue', 'popular nightclub', 'top-rated club', 'mixology bar', 'speakeasy'
  ];

  if (params.location) {
    console.log(`[RAPIDAPI] Using location name: ${params.location}`);

    // Use multiple queries to increase chances of finding events
    eventTypeKeywords.forEach(keyword => {
      queryParts.push(`${keyword} in ${params.location}`);
    });

    // If we're looking for party events, add more specific queries
    if (isPartySearch) {
      console.log('[RAPIDAPI] Party category detected, adding party-specific queries');

      // For primary party searches, prioritize the most relevant terms first
      if (isPrimaryPartySearch) {
        console.log('[RAPIDAPI] Primary party category detected, using priority party terms');
        // Add party + venue combinations for better results
        partyKeywords.slice(0, 10).forEach(keyword => {
          queryParts.push(`${keyword} in ${params.location}`);
        });

        // Add venue-specific searches
        venueKeywords.slice(0, 8).forEach(venue => {
          queryParts.push(`${venue} in ${params.location}`);
        });
      } else {
        // Not primary but still party-related, use a smaller subset
        partyKeywords.slice(0, 5).forEach(keyword => {
          queryParts.push(`${keyword} in ${params.location}`);
        });
      }
    }
  }
  // If we have geographic coordinates, use "nearby" queries
  else if ((hasCoordinates || hasLegacyCoordinates || hasUserCoordinates) && !params.location) {
    // Without specific city, use "nearby" search terms to find local events
    console.log('[RAPIDAPI] Using coordinates-based "nearby" search');

    // Basic nearby searches
    queryParts.push("events nearby");
    queryParts.push("concerts nearby");
    queryParts.push("festivals nearby");

    // If we're looking for party events, add more specific queries
    if (isPartySearch) {
      console.log('[RAPIDAPI] Party category with coordinates, adding nearby party queries');

      // For primary party searches with coordinates
      if (isPrimaryPartySearch) {
        console.log('[RAPIDAPI] Primary party category with coordinates, using priority party terms');
        // Add nearby party searches
        partyKeywords.slice(0, 8).forEach(keyword => {
          queryParts.push(`${keyword} nearby`);
        });

        // Add venue-specific searches
        venueKeywords.slice(0, 5).forEach(venue => {
          queryParts.push(`${venue} nearby`);
        });
      } else {
        // Not primary but still party-related
        partyKeywords.slice(0, 3).forEach(keyword => {
          queryParts.push(`${keyword} nearby`);
        });
      }
    }
  }
  // Fallback for no location or coordinates
  else {
    console.log('[RAPIDAPI] No location or coordinates provided, using generic queries');

    // Generic fallback queries
    queryParts.push("popular events");
    queryParts.push("upcoming events");

    // If we're looking for party events, add generic party queries
    if (isPartySearch) {
      console.log('[RAPIDAPI] Party category without location, adding generic party queries');

      // For primary party searches without location
      if (isPrimaryPartySearch) {
        console.log('[RAPIDAPI] Primary party category without location, using priority party terms');
        // Add generic party searches
        partyKeywords.slice(0, 8).forEach(keyword => {
          queryParts.push(keyword);
        });

        // Add venue-specific searches
        venueKeywords.slice(0, 5).forEach(venue => {
          queryParts.push(venue);
        });
      } else {
        // Not primary but still party-related
        partyKeywords.slice(0, 3).forEach(keyword => {
          queryParts.push(keyword);
        });
      }
    }
  }

  // Add keyword as standalone query if provided
  if (params.keyword) {
    const keywordQuery = params.keyword;
    if (!queryParts.includes(keywordQuery)) {
      queryParts.push(keywordQuery);
      console.log(`[RAPIDAPI] Added standalone keyword: "${keywordQuery}"`);
    }

    // Add category-specific combinations with keyword
    if (params.categories && params.categories.length > 0) {
      const categoryTerms = {
        'music': ['concert', 'festival', 'live music'],
        'sports': ['game', 'match', 'sporting event'],
        'arts': ['performance', 'show', 'exhibition'],
        'party': ['party', 'nightlife', 'club'],
        'nightlife': ['nightclub', 'bar', 'lounge'],
        'food': ['food festival', 'tasting', 'culinary event'],
        'family': ['family event', 'kids', 'family-friendly']
      };

      // Check if we have any matching categories
      params.categories.forEach(category => {
        const terms = categoryTerms[category as keyof typeof categoryTerms];
        if (terms) {
          terms.forEach(term => {
            const combinedQuery = `${keywordQuery} ${term}`;
            if (!queryParts.includes(combinedQuery)) {
              queryParts.push(combinedQuery);
              console.log(`[RAPIDAPI] Added category-specific query: "${combinedQuery}"`);
            }
          });
        }
      });
    }
  }

  // Prioritize queries with higher relevance for party searches
  if (isPrimaryPartySearch && queryParts.length > 5) {
    console.log('[RAPIDAPI] Prioritizing party-specific queries');
    // Move high-priority party queries to the front
    queryParts.sort((a, b) => {
      // Check if each query contains high-priority party terms
      const aHasPriorityTerm = a.includes('nightclub') || a.includes('DJ') ||
                              a.includes('dance club') || a.includes('party events');
      const bHasPriorityTerm = b.includes('nightclub') || b.includes('DJ') ||
                              b.includes('dance club') || b.includes('party events');

      if (aHasPriorityTerm && !bHasPriorityTerm) return -1;
      if (!aHasPriorityTerm && bHasPriorityTerm) return 1;
      return 0;
    });
  }

  // Log the queries for debugging
  console.log(`[RAPIDAPI] Primary query: ${queryParts[0]}`);
  console.log(`[RAPIDAPI] All queries (${queryParts.length}):`, queryParts);

  // Set date parameter - valid values: all, today, tomorrow, week, weekend, next_week, month, next_month
  let dateParam = 'month'; // Default to month for wider range

  if (params.startDate) {
    // If we have a specific start date, check how far in the future it is
    const now = new Date();
    const start = new Date(params.startDate);
    const daysDiff = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Choose appropriate date range based on how far in the future the start date is
    if (daysDiff <= 1) dateParam = 'today';
    else if (daysDiff <= 2) dateParam = 'tomorrow';
    else if (daysDiff <= 7) dateParam = 'week';
    else if (daysDiff <= 14) dateParam = 'next_week';
    else if (daysDiff <= 30) dateParam = 'month';
    else dateParam = 'next_month';

    console.log(`[RAPIDAPI] Date parameter set to "${dateParam}" based on startDate (${daysDiff} days from now)`);
  } else {
    console.log(`[RAPIDAPI] Using default date parameter: "${dateParam}"`);
  }

  apiParams.date = dateParam;

  // Add the first query as the primary query
  apiParams.query = queryParts[0] || '';

  // Store all queries for multiple API calls
  apiParams.allQueries = queryParts;

  // Default to non-virtual events only
  apiParams.is_virtual = params.isVirtual || false;

  // Default start position of the API pagination - start from the first result
  apiParams.start = 0;

  // Add latitude and longitude if available
  if (params.latitude !== undefined) apiParams.latitude = params.latitude;
  if (params.longitude !== undefined) apiParams.longitude = params.longitude;
  if (params.radius !== undefined) apiParams.radius = params.radius;

  return apiParams;
}

/**
 * Fetch events from the RapidAPI Events Search API
 */
export async function searchRapidAPIEvents(params: SearchParams): Promise<Event[]> {
  try {
    const apiKey = apiKeyManager.getActiveKey('rapidapi'); // Get API key from manager

    // Log API key status (without revealing the actual key)
    console.log('[RAPIDAPI] API key available:', !!apiKey);
    if (!apiKey) {
      console.error('[RAPIDAPI] No API key available! Check Supabase secrets.');
      throw new Error('RapidAPI key not available');
    }

    // Log the masked API key (first 4 chars only)
    const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`[RAPIDAPI] Using API key: ${maskedKey}`);

    // Log the original parameters for debugging
    console.log('[RAPIDAPI] Original search parameters:', {
      keyword: params.keyword || 'not provided',
      location: params.location || 'not provided',
      latitude: params.latitude || params.lat || params.userLat || 'not provided',
      longitude: params.longitude || params.lng || params.userLng || 'not provided',
      radius: params.radius || 'not provided',
      categories: params.categories || [],
      startDate: params.startDate || 'not provided',
      endDate: params.endDate || 'not provided'
    });

    const apiParams = extractRapidAPIParams(params);

    // Get all the queries we want to try
    const queriesToTry = apiParams.allQueries || [apiParams.query];

    // Limit the number of queries to avoid rate limiting (max 5 queries)
    const limitedQueries = queriesToTry.slice(0, 5);
    console.log(`[RAPIDAPI] Will try ${limitedQueries.length} different queries`);

    // Make multiple API calls for different queries
    const allResults: RapidAPISearchResponse[] = [];

    // Function to make a single API call
    const makeApiCall = async (query: string): Promise<RapidAPISearchResponse | null> => {
      // Build the query URL
      const queryParams = new URLSearchParams();

      if (query) {
        queryParams.append('query', query);
      }

      if (apiParams.date) {
        // Make sure we use a valid date parameter
        // Valid values: all, today, tomorrow, week, weekend, next_week, month, next_month
        const validDateParams = ['all', 'today', 'tomorrow', 'week', 'weekend', 'next_week', 'month', 'next_month'];
        const dateParam = validDateParams.includes(apiParams.date) ? apiParams.date : 'month';
        queryParams.append('date', dateParam);
      } else {
        // Default to 'month' for wider range of results
        queryParams.append('date', 'month');
      }

      // Always set is_virtual based on params or default to false
      const isVirtual = apiParams.is_virtual !== undefined ? apiParams.is_virtual : false;
      queryParams.append('is_virtual', isVirtual.toString());

      // Set start parameter (pagination)
      queryParams.append('start', apiParams.start?.toString() || '0');

      // Add limit parameter to get more results (up to 100)
      queryParams.append('limit', '100');

      // Use the correct API endpoint - the one from the user's reference
      const apiEndpoint = 'https://real-time-events-search.p.rapidapi.com/search-events';
      const url = `${apiEndpoint}?${queryParams.toString()}`;

      // Browser console log for tracking request
      console.log(`[RAPIDAPI] Making API call with query: "${query}"`);

      try {
        console.log(`[RAPIDAPI] Sending request to: ${url}`);
        console.log(`[RAPIDAPI] Request headers:`, {
          'x-rapidapi-key': 'MASKED',
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        });

        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
          }
        });
        const endTime = Date.now();

        console.log(`[RAPIDAPI] Response received in ${endTime - startTime}ms with status: ${response.status}`);

        if (!response.ok) {
          console.warn(`[RAPIDAPI] Request failed for query "${query}" with status: ${response.status}`);

          // Try to get more details about the error
          try {
            const errorText = await response.text();
            console.error(`[RAPIDAPI] Error details: ${errorText}`);
          } catch (textError) {
            console.error(`[RAPIDAPI] Could not get error details: ${textError}`);
          }

          return null;
        }

        const data = await response.json();
        console.log(`[RAPIDAPI] Response data for query "${query}":`, {
          status: data.status,
          request_id: data.request_id,
          data_length: data.data?.length || 0,
          events_length: data.events?.length || 0
        });

        return data;
      } catch (error) {
        console.error(`[RAPIDAPI] Error for query "${query}":`, error);
        return null;
      }
    };

    // Make API calls for each query (in parallel)
    const apiCallPromises = limitedQueries.map(query => makeApiCall(query || ''));
    const apiCallResults = await Promise.all(apiCallPromises);

    // Filter out null results and add to allResults
    apiCallResults.forEach(result => {
      if (result) {
        allResults.push(result);
      }
    });

    // If we didn't get any results, try a fallback query
    if (allResults.length === 0) {
      console.log('[RAPIDAPI] No results from initial queries, trying fallback query');

      // Try a very generic query as a last resort
      const fallbackQuery = 'popular events';
      try {
        const fallbackResult = await makeApiCall(fallbackQuery);
        if (fallbackResult) {
          console.log('[RAPIDAPI] Fallback query successful!');
          allResults.push(fallbackResult);
        } else {
          console.error('[RAPIDAPI] Fallback query also failed');
          throw new Error('No results from any RapidAPI queries, including fallback');
        }
      } catch (error) {
        console.error('[RAPIDAPI] Error with fallback query:', error);
        throw new Error('No results from any RapidAPI queries, including fallback');
      }
    }

    // Combine all results
    const data: RapidAPISearchResponse = {
      status: 'success',
      request_id: 'combined',
      parameters: {
        query: limitedQueries.join(', '),
        is_virtual: false,
        date: apiParams.date || 'month',
        start: apiParams.start || 0
      },
      data: [],
      events: []
    };

    // Combine all data arrays
    allResults.forEach(result => {
      if (result.data && Array.isArray(result.data)) {
        data.data = [...data.data, ...result.data];
      }
      if (result.events && Array.isArray(result.events)) {
        data.events = data.events ? [...data.events, ...result.events] : [...result.events];
      }
    });

    console.log(`[RAPIDAPI] Combined results: ${data.data.length} events in data array, ${data.events?.length || 0} events in events array`);

    // Check for the new response format (with data array)
    let transformedEvents: Event[] = [];

    if (data.data && Array.isArray(data.data)) {
      console.log('[SEARCH-EVENTS] Using new RapidAPI response format with data array');
      // Transform events using the new format
      transformedEvents = data.data.map(transformRapidAPIEventNew);
    }
    // Check for the old response format (with events array)
    else if (data.events && Array.isArray(data.events)) {
      console.log('[SEARCH-EVENTS] Using old RapidAPI response format with events array');
      // Transform events using the old format
      transformedEvents = data.events.map(transformRapidAPIEvent);
    }
    else {
      // If we get here, the response format is invalid
      console.error('[SEARCH-EVENTS] Invalid RapidAPI response format:', data);
      throw new Error('Invalid response format from RapidAPI');
    }

    // Before filtering, ensure all events have proper coordinates if possible
    transformedEvents.forEach(event => {
      // Check for venue information in description to help with coordinates
      if ((!event.coordinates || !event.latitude || !event.longitude) &&
          event.description && event.description.length > 0) {

        // Log for debugging
        console.log(`[RAPIDAPI] Event without coordinates: ${event.title}`);

        // Check if event is a party event based on category or title
        const isPartyEvent = event.category === 'party' ||
                            event.category === 'nightlife' ||
                            /party|club|dance|dj|rave|nightlife/i.test(event.title);

        if (isPartyEvent) {
          console.log(`[RAPIDAPI] Found party event without coordinates: ${event.title}`);
        }
      }
    });

    // Filter events by distance if we have coordinates
    if (transformedEvents.length > 0 && (
        (params.latitude !== undefined && params.longitude !== undefined) ||
        (params.lat !== undefined && params.lng !== undefined) ||
        (params.userLat !== undefined && params.userLng !== undefined)
    )) {

      // Get the user's coordinates
      const userLat = params.latitude || params.lat || params.userLat;
      const userLng = params.longitude || params.lng || params.userLng;
      const radius = params.radius || 30; // Default to 30 miles

      console.log(`[RAPIDAPI] Filtering events by distance: ${radius} miles from ${userLat},${userLng}`);

      // Count events with coordinates before filtering
      const eventsWithCoordinates = transformedEvents.filter(event =>
        (event.coordinates || (event.latitude && event.longitude)));
      console.log(`[RAPIDAPI] Events with coordinates before filtering: ${eventsWithCoordinates.length} of ${transformedEvents.length}`);

      // Log events without coordinates
      const eventsWithoutCoordinates = transformedEvents.filter(event =>
        !event.coordinates && (!event.latitude || !event.longitude));
      console.log(`[RAPIDAPI] Events without coordinates: ${eventsWithoutCoordinates.length} of ${transformedEvents.length}`);

      // Log party events without coordinates
      const partyEventsWithoutCoordinates = eventsWithoutCoordinates.filter(event =>
        event.category === 'party' || event.category === 'nightlife' || (event as any).isPartyEvent);
      if (partyEventsWithoutCoordinates.length > 0) {
        console.log(`[RAPIDAPI] Party events without coordinates: ${partyEventsWithoutCoordinates.length}`);
        partyEventsWithoutCoordinates.forEach(event => {
          console.log(`[RAPIDAPI] Party event without coordinates: "${event.title}" (${event.venue || 'No venue'})`);
        });
      }

      // Filter events that have coordinates and are within the radius
      const filteredEvents = transformedEvents.filter(event => {
        // Special handling for party events - we want to prioritize these
        const isEventParty = event.category === 'party' ||
                            event.category === 'nightlife' ||
                            event.isPartyEvent;

        // Skip events without coordinates
        if (!event.coordinates && (!event.latitude || !event.longitude)) {
          if (isEventParty) {
            console.log(`[RAPIDAPI] Skipping party event without coordinates: ${event.title}`);
          }
          return false;
        }

        // Get event coordinates - handle both storage formats
        let eventLat: number | undefined;
        let eventLng: number | undefined;

        if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length >= 2) {
          // Coordinates array format is [longitude, latitude]
          eventLng = event.coordinates[0];
          eventLat = event.coordinates[1];
        } else {
          // Direct latitude/longitude properties
          eventLat = event.latitude;
          eventLng = event.longitude;
        }

        // Skip events with invalid coordinates
        if (eventLat === null || eventLng === null ||
            eventLat === undefined || eventLng === undefined ||
            isNaN(Number(eventLat)) || isNaN(Number(eventLng))) {
          if (isEventParty) {
            console.log(`[RAPIDAPI] Skipping party event with invalid coordinates: ${event.title}`);
          }
          return false;
        }

        // Calculate distance using the Haversine formula
        const distance = calculateDistance(
          Number(userLat),
          Number(userLng),
          Number(eventLat),
          Number(eventLng)
        );

        // Log distance for party events
        const isEventPartyType = event.category === 'party' ||
                            event.category === 'nightlife' ||
                            (event as any).isPartyEvent;
        if (isEventPartyType) {
          console.log(`[RAPIDAPI] Party event "${event.title}" distance: ${distance.toFixed(2)} miles (radius: ${radius} miles)`);
          console.log(`[RAPIDAPI] Party event within radius: ${distance <= radius ? 'YES' : 'NO'}`);
        }

        // Return true if the event is within the radius
        return distance <= radius;
      });

      // Count events by category after filtering
      const categoryCounts = {};
      filteredEvents.forEach(event => {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
      });
      console.log(`[RAPIDAPI] Events by category after filtering:`, categoryCounts);

      // Log filtering results by category
      console.log(`[RAPIDAPI] Filtered ${transformedEvents.length} events down to ${filteredEvents.length} within ${radius} miles`);

      // Count party events before and after filtering
      const partyEventsBefore = transformedEvents.filter(event =>
        event.category === 'party' || event.category === 'nightlife' || (event as any).isPartyEvent).length;
      const partyEventsAfter = filteredEvents.filter(event =>
        event.category === 'party' || event.category === 'nightlife' || (event as any).isPartyEvent).length;

      console.log(`[RAPIDAPI] Party events before filtering: ${partyEventsBefore}, after filtering: ${partyEventsAfter}`);
      console.log(`[RAPIDAPI] Party events retention rate: ${partyEventsBefore > 0 ? Math.round((partyEventsAfter / partyEventsBefore) * 100) : 0}%`);

      return filteredEvents;
    }

    return transformedEvents;
  } catch (error) {
    console.error(`Error fetching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Fetch event details from the RapidAPI Events Search API
 */
export async function getRapidAPIEventDetails(eventId: string): Promise<Event | null> {
  try {
    const apiKey = apiKeyManager.getActiveKey('rapidapi'); // Get API key from manager

    // Build the query URL
    const url = `https://real-time-events-search.p.rapidapi.com/event-details?event_id=${encodeURIComponent(eventId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI event details request failed with status: ${response.status}`);
    }

    const data: RapidAPIEventDetailsResponse = await response.json();

    if (!data.event) {
      throw new Error('Invalid event details response format from RapidAPI');
    }

    // Transform event to common format
    return transformRapidAPIEvent(data.event);
  } catch (error) {
    console.error(`Error fetching RapidAPI event details: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}