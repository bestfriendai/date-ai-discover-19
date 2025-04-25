/**
 * Event normalization utilities
 * 
 * This module provides functions to normalize event data from different sources
 * into a consistent format defined by the Event interface.
 */

import { Event, Venue, Entity } from './types.ts';

/**
 * Default values for required fields
 */
const DEFAULT_VALUES = {
  id: '',
  title: 'Untitled Event',
  description: 'No description available',
  start: new Date().toISOString(),
  url: '',
  source: 'unknown',
  date: new Date().toISOString().split('T')[0],
  time: '00:00',
  location: 'Location not specified',
  image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
};

/**
 * Category mapping from various sources to our standard categories
 */
const CATEGORY_MAPPING: Record<string, Record<string, string>> = {
  ticketmaster: {
    'music': 'music',
    'concert': 'music',
    'concerts': 'music',
    'festival': 'music',
    'festivals': 'music',
    'sports': 'sports',
    'sport': 'sports',
    'arts': 'arts',
    'theatre': 'arts',
    'theater': 'arts',
    'performing arts': 'arts',
    'performing-arts': 'arts',
    'family': 'family',
    'attraction': 'family',
    'attractions': 'family',
    'miscellaneous': 'other',
    'undefined': 'other',
    // Add more specific mappings for Ticketmaster
    'Music': 'music',
    'Sports': 'sports',
    'Arts & Theatre': 'arts',
    'Arts & Theater': 'arts',
    'Family': 'family',
    'Miscellaneous': 'other',
  },
  predicthq: {
    'concerts': 'music',
    'festivals': 'music',
    'sports': 'sports',
    'performing-arts': 'arts',
    'community': 'family',
    'expos': 'family',
    'conferences': 'other',
    'daylight-savings': 'other',
    'observances': 'other',
    'politics': 'other',
    'public-holidays': 'other',
    'school-holidays': 'other',
    'academic': 'other',
    'airport-delays': 'other',
    'severe-weather': 'other',
    'disasters': 'other',
    'health-warnings': 'other',
    'terror': 'other',
  }
};

/**
 * Default images by category
 */
const DEFAULT_IMAGES: Record<string, string> = {
  'music': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
  'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
  'arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
  'family': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
  'food': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop',
  'party': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
  'other': 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
};

/**
 * Normalize a date string to ISO format
 * @param dateStr Date string in any format
 * @returns ISO date string or undefined if invalid
 */
function normalizeDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString();
  } catch (e) {
    console.error(`[NORMALIZE] Error parsing date: ${dateStr}`, e);
    return undefined;
  }
}

/**
 * Extract date and time parts from an ISO date string
 * @param isoDate ISO date string
 * @returns Object with date and time parts
 */
function extractDateTimeParts(isoDate: string | undefined): { date: string, time: string } {
  if (!isoDate) {
    return {
      date: DEFAULT_VALUES.date,
      time: DEFAULT_VALUES.time
    };
  }
  
  try {
    const parts = isoDate.split('T');
    return {
      date: parts[0],
      time: parts[1]?.substring(0, 5) || DEFAULT_VALUES.time
    };
  } catch (e) {
    console.error(`[NORMALIZE] Error extracting date/time parts: ${isoDate}`, e);
    return {
      date: DEFAULT_VALUES.date,
      time: DEFAULT_VALUES.time
    };
  }
}

/**
 * Map a source-specific category to our standard categories
 * @param category Source category
 * @param source Source name (ticketmaster, predicthq, etc.)
 * @returns Mapped category or 'other' if not found
 */
function mapCategory(category: string | undefined, source: string): string {
  if (!category) return 'other';
  
  const lowerCategory = category.toLowerCase();
  const sourceMapping = CATEGORY_MAPPING[source] || {};
  
  return sourceMapping[lowerCategory] || 'other';
}

/**
 * Get a default image URL based on event category
 * @param category Event category
 * @returns Image URL
 */
function getDefaultImage(category: string): string {
  return DEFAULT_IMAGES[category] || DEFAULT_IMAGES.other;
}

/**
 * Normalize a PredictHQ event to our standard format
 * @param event Raw PredictHQ event
 * @returns Normalized event
 */
export function normalizePredictHQEvent(event: any): Event {
  try {
    // Validate event object
    if (!event || typeof event !== 'object') {
      console.error('[NORMALIZE_PREDICTHQ] Invalid event object:', event);
      throw new Error('Invalid event object');
    }

    // Generate a unique ID
    const id = `predicthq-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Extract start and end dates
    const start = event.start || DEFAULT_VALUES.start;
    const end = event.end;
    
    // Extract date and time parts
    const { date, time } = extractDateTimeParts(start);
    
    // Extract location with more detail
    let location = DEFAULT_VALUES.location;
    
    // Try to build a detailed location string
    const locationParts: string[] = [];
    
    // Add venue name if available from entities
    const venueEntity = event.entities?.find((e: any) => e.type === 'venue');
    const venueName = venueEntity?.name || event.phq_venue?.name;
    if (venueName) {
      locationParts.push(String(venueName));
    }
    
    // Add address if available
    if (venueEntity?.formatted_address) {
      locationParts.push(String(venueEntity.formatted_address));
    } else if (event.phq_venue?.address) {
      locationParts.push(String(event.phq_venue.address));
    }
    
    // Add location_name if available
    if (event.location_name) {
      locationParts.push(String(event.location_name));
    }
    
    // Add city/place name
    if (event.place?.name) {
      locationParts.push(String(event.place.name));
    }
    
    // Add state if available
    if (event.state) {
      locationParts.push(String(event.state));
    }
    
    // Add country if available
    if (event.country) {
      locationParts.push(String(event.country));
    }
    
    // Build final location string, removing duplicates and filtering empty strings
    if (locationParts.length > 0) {
      // Filter out empty strings and remove duplicates while preserving order
      const uniqueParts: string[] = [];
      for (const part of locationParts) {
        if (part && part.trim() !== '' && !uniqueParts.includes(part)) {
          uniqueParts.push(part);
        }
      }
      
      // If we have a venue and a city, we can simplify to "Venue, City, State"
      if (uniqueParts.length > 3) {
        // If we have venue name and city, we can simplify
        const hasVenue = venueName && uniqueParts.includes(String(venueName));
        const hasCity = event.place?.name && uniqueParts.includes(String(event.place.name));
        
        if (hasVenue && hasCity) {
          // Create a simplified location with just venue, city, state/country
          const simpleParts: string[] = [];
          
          // Add venue
          simpleParts.push(String(venueName));
          
          // Add city
          simpleParts.push(String(event.place.name));
          
          // Add state or country (not both)
          if (event.state) {
            simpleParts.push(String(event.state));
          } else if (event.country) {
            simpleParts.push(String(event.country));
          }
          
          location = simpleParts.join(', ');
        } else {
          // Use the full location string if we can't simplify
          location = uniqueParts.join(', ');
        }
      } else {
        // Use the full location string for simpler locations
        location = uniqueParts.join(', ');
      }
    }
    
    // Extract venue
    const venue = event.entities?.find((e: any) => e.type === 'venue')?.name || event.title;
    
    // Extract coordinates if available
    let coordinates: [number, number] | undefined = undefined;
    
    // First try to get coordinates from the event.location field (most accurate)
    if (event.location && Array.isArray(event.location) && event.location.length === 2 &&
        typeof event.location[0] === 'number' && typeof event.location[1] === 'number') {
      // PredictHQ returns [longitude, latitude] which matches our format
      coordinates = [event.location[0], event.location[1]];
    }
    
    // If no coordinates yet, try to get them from the geo field
    if (!coordinates && event.geo && event.geo.geometry &&
        event.geo.geometry.coordinates && Array.isArray(event.geo.geometry.coordinates) &&
        event.geo.geometry.coordinates.length === 2) {
      coordinates = [event.geo.geometry.coordinates[0], event.geo.geometry.coordinates[1]];
    }
    
    // If no coordinates yet, try to get them from the venue entity
    if (!coordinates && event.entities) {
      const venueEntity = event.entities.find((e: any) => e.type === 'venue');
      if (venueEntity && venueEntity.coordinates && Array.isArray(venueEntity.coordinates) &&
          venueEntity.coordinates.length === 2) {
        coordinates = [venueEntity.coordinates[0], venueEntity.coordinates[1]];
      }
    }
    
    // If no coordinates yet, try to get them from the place field
    if (!coordinates && event.place && event.place.location &&
        Array.isArray(event.place.location) && event.place.location.length === 2) {
      coordinates = [event.place.location[0], event.place.location[1]];
    }
    
    // Determine category
    let category = mapCategory(event.category, 'predicthq');
    
    // Check if it's a party event based on labels or other signals
    const partyLabels = [
      'nightlife', 'party', 'club', 'nightclub', 'dance-club', 'disco',
      'dance-party', 'dj-set', 'dj-night', 'dj-party', 'rave'
    ];
    
    const hasPartyLabels = event.labels && Array.isArray(event.labels) &&
      event.labels.some((label: string) => partyLabels.includes(label));
    
    if (hasPartyLabels) {
      category = 'party';
    }
    
    // Determine party subcategory if it's a party
    let partySubcategory: string | undefined = undefined;
    if (category === 'party') {
      const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
      
      if (eventText.match(/club|nightclub|dj|dance|disco/)) {
        partySubcategory = 'club';
      } else if (eventText.match(/day|afternoon|pool|rooftop|brunch/)) {
        partySubcategory = 'day-party';
      } else if (eventText.match(/festival|concert|live|performance/)) {
        partySubcategory = 'music';
      } else if (eventText.match(/social|mixer|networking|gathering/)) {
        partySubcategory = 'social';
      } else {
        partySubcategory = 'general';
      }
    }
    
    // Get the description and ensure it's clean
    let description = '';
    
    // Safely get description
    if (event.description && typeof event.description === 'string') {
      description = event.description;
    } else {
      // Create a fallback description
      description = `${event.title || DEFAULT_VALUES.title} in ${location}`;
    }
    
    // Remove any mention of predicthq anywhere in the text
    if (description) {
      description = description.replace(/\bpredicthq\b.*?(?=[.!?]|$)/gi, '').trim();
      description = description.replace(/\bpredicthq\.com\b.*?(?=[.!?]|$)/gi, '').trim();
      
      // Clean up any double spaces or trailing punctuation
      description = description.replace(/\s{2,}/g, ' ').trim();
      description = description.replace(/[.,;:\s]+$/, '').trim();
    }
    
    // Get image URL
    let imageUrl = getDefaultImage(category);
    
    // Try to get image from event
    if (event.images && Array.isArray(event.images) && event.images.length > 0) {
      imageUrl = event.images[0].url;
    }
    
    // Add rank and local impact data
    const rank = event.rank || 0;
    const localRelevance = event.local_rank || 0;
    const attendance = {
      forecast: event.phq_attendance || undefined,
      actual: event.actual_attendance || undefined
    };
    const demandSurge = event.labels?.includes('demand_surge') ? 1 : 0;
    
    // Extract price information if available
    let price: number | undefined = undefined;
    if (event.ticket_info?.price) {
      price = typeof event.ticket_info.price === 'number' 
        ? event.ticket_info.price 
        : parseFloat(event.ticket_info.price);
    }
    
    // Extract entities if available
    const entities: Entity[] = [];
    if (event.entities && Array.isArray(event.entities)) {
      event.entities.forEach((entity: any) => {
        if (entity && entity.name && entity.type) {
          entities.push({
            name: entity.name,
            type: entity.type
          });
        }
      });
    }
    
    // Create venue object if we have enough information
    let venueObj: Venue | undefined = undefined;
    if (venueName) {
      venueObj = {
        name: venueName,
        coordinates: coordinates
      };
      
      if (venueEntity?.formatted_address) {
        venueObj.address = venueEntity.formatted_address;
      }
      
      if (event.place?.name) {
        venueObj.city = event.place.name;
      }
      
      if (event.state) {
        venueObj.state = event.state;
      }
      
      if (event.country) {
        venueObj.country = event.country;
      }
    }
    
    // Build the normalized event
    return {
      id,
      source: 'predicthq',
      title: event.title || DEFAULT_VALUES.title,
      description: description || DEFAULT_VALUES.description,
      start,
      end,
      url: event.entities?.[0]?.url || event.websites?.[0]?.url || 'https://predicthq.com',
      date,
      time,
      location,
      venue: venueObj,
      category,
      partySubcategory,
      image: imageUrl,
      coordinates,
      price,
      rank,
      localRelevance,
      attendance,
      demandSurge,
      entities: entities.length > 0 ? entities : undefined
    };
  } catch (error) {
    console.error('[NORMALIZE_PREDICTHQ] Error normalizing event:', error);
    console.error('[NORMALIZE_PREDICTHQ] Problem event:', JSON.stringify(event, null, 2).substring(0, 500) + '...');
    
    // Instead of throwing, return a minimal valid event
    return createErrorEvent('predicthq', event?.title, event?.id);
  }
}

/**
 * Normalize a Ticketmaster event to our standard format
 * @param event Raw Ticketmaster event
 * @returns Normalized event
 */
export function normalizeTicketmasterEvent(event: any): Event {
  try {
    // Validate event object
    if (!event || typeof event !== 'object') {
      console.error('[NORMALIZE_TICKETMASTER] Invalid event object:', event);
      throw new Error('Invalid event object');
    }
    
    // Generate a unique ID
    const id = `ticketmaster-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Extract venue information
    const venue = event._embedded?.venues?.[0];
    const venueName = venue?.name || '';
    const venueCity = venue?.city?.name || '';
    const venueState = venue?.state?.stateCode || '';
    const venueCountry = venue?.country?.countryCode || '';
    const venueAddress = venue?.address?.line1 || '';
    
    // Build location string
    let location = venueName;
    if (venueCity) {
      location += location ? `, ${venueCity}` : venueCity;
    }
    if (venueState) {
      location += location ? `, ${venueState}` : venueState;
    }
    if (venueCountry && venueCountry !== 'US') {
      location += location ? `, ${venueCountry}` : venueCountry;
    }
    
    // Extract coordinates
    let coordinates: [number, number] | undefined = undefined;
    if (venue?.location?.longitude && venue?.location?.latitude) {
      coordinates = [
        parseFloat(venue.location.longitude),
        parseFloat(venue.location.latitude)
      ];
    }
    
    // Extract price information
    let priceMin: number | undefined = undefined;
    let priceMax: number | undefined = undefined;
    let currency: string | undefined = undefined;
    let price: string | undefined = undefined;
    
    if (event.priceRanges && event.priceRanges.length > 0) {
      const priceRange = event.priceRanges[0];
      priceMin = priceRange.min;
      priceMax = priceRange.max;
      currency = priceRange.currency;
      price = `${priceRange.min} - ${priceRange.max} ${priceRange.currency}`;
    }
    
    // Extract category information
    const rawCategory = event.classifications?.[0]?.segment?.name || 'event';
    let category = mapCategory(rawCategory, 'ticketmaster');
    
    // Check if it's a party event based on title or description
    const eventText = `${event.name || ''} ${event.description || ''} ${event.info || ''}`.toLowerCase();
    const partyKeywords = [
      'party', 'club', 'nightclub', 'dance', 'dj', 'disco', 'rave',
      'nightlife', 'mixer', 'social', 'celebration', 'gala'
    ];
    
    if (partyKeywords.some(keyword => eventText.includes(keyword))) {
      category = 'party';
    }
    
    // Add party subcategory if it's a party event
    let partySubcategory: string | undefined = undefined;
    if (category === 'party') {
      if (eventText.match(/club|nightclub|dj|dance|disco/)) {
        partySubcategory = 'club';
      } else if (eventText.match(/day|afternoon|pool|rooftop|brunch/)) {
        partySubcategory = 'day-party';
      } else if (eventText.match(/festival|concert|live|performance/)) {
        partySubcategory = 'music';
      } else if (eventText.match(/social|mixer|networking|gathering/)) {
        partySubcategory = 'social';
      } else {
        partySubcategory = 'general';
      }
    }
    
    // Extract subcategories
    const subcategories: string[] = [];
    if (event.classifications?.[0]?.genre?.name) {
      subcategories.push(event.classifications[0].genre.name);
    }
    if (event.classifications?.[0]?.subGenre?.name) {
      subcategories.push(event.classifications[0].subGenre.name);
    }
    
    // Extract image
    let image = '';
    if (event.images && event.images.length > 0) {
      // Prefer 16:9 ratio images with width > 500
      image = event.images.find((img: any) => img.ratio === '16_9' && img.width > 500)?.url || 
              event.images[0].url;
    }
    
    if (!image) {
      image = getDefaultImage(category);
    }
    
    // Extract date and time
    const localDate = event.dates?.start?.localDate || '';
    const localTime = event.dates?.start?.localTime || '';
    
    // Create ISO date string
    let start = '';
    if (localDate) {
      start = localTime ? `${localDate}T${localTime}` : `${localDate}T00:00:00`;
    } else {
      start = DEFAULT_VALUES.start;
    }
    
    // Extract end date/time if available
    let end: string | undefined = undefined;
    if (event.dates?.end?.localDate) {
      end = event.dates.end.localTime 
        ? `${event.dates.end.localDate}T${event.dates.end.localTime}` 
        : `${event.dates.end.localDate}T23:59:59`;
    }
    
    // Create venue object
    let venueObj: Venue | undefined = undefined;
    if (venueName) {
      venueObj = {
        name: venueName,
        address: venueAddress,
        city: venueCity,
        state: venueState,
        country: venueCountry,
        postalCode: venue?.postalCode,
        coordinates
      };
    }
    
    // Create entities array
    const entities: Entity[] = [];
    if (venueName) {
      entities.push({
        name: venueName,
        type: 'venue'
      });
    }
    if (event.promoter?.name) {
      entities.push({
        name: event.promoter.name,
        type: 'promoter'
      });
    }
    if (event.attractions && Array.isArray(event.attractions)) {
      event.attractions.forEach((attraction: any) => {
        if (attraction?.name) {
          entities.push({
            name: attraction.name,
            type: 'attraction'
          });
        }
      });
    }
    
    // Build the normalized event
    return {
      id,
      source: 'ticketmaster',
      title: event.name || DEFAULT_VALUES.title,
      description: event.description || event.info || DEFAULT_VALUES.description,
      start,
      end,
      url: event.url || '',
      date: localDate,
      time: localTime,
      location: location || DEFAULT_VALUES.location,
      venue: venueObj,
      category,
      partySubcategory,
      subcategories: subcategories.length > 0 ? subcategories : undefined,
      image,
      coordinates,
      priceMin,
      priceMax,
      currency,
      price: priceMin,
      entities: entities.length > 0 ? entities : undefined
    };
  } catch (error) {
    console.error('[NORMALIZE_TICKETMASTER] Error normalizing event:', error);
    console.error('[NORMALIZE_TICKETMASTER] Problem event:', JSON.stringify(event, null, 2).substring(0, 500) + '...');
    
    // Instead of throwing, return a minimal valid event
    return createErrorEvent('ticketmaster', event?.name, event?.id);
  }
}

/**
 * Create a minimal valid event for error cases
 * @param source Source name
 * @param title Event title if available
 * @param eventId Original event ID if available
 * @returns Minimal valid event
 */
function createErrorEvent(source: string, title?: string, eventId?: string): Event {
  const id = `${source}-error-${eventId || Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    id,
    source,
    title: title || 'Unknown Event',
    description: 'Error processing event details',
    start: DEFAULT_VALUES.start,
    end: DEFAULT_VALUES.start,
    url: '',
    date: DEFAULT_VALUES.date,
    time: DEFAULT_VALUES.time,
    location: DEFAULT_VALUES.location,
    category: 'other',
    image: DEFAULT_VALUES.image
  };
}

/**
 * Normalize an event from any supported source
 * @param event Raw event data
 * @param source Source name
 * @returns Normalized event
 */
export function normalizeEvent(event: any, source: string): Event {
  try {
    switch (source.toLowerCase()) {
      case 'predicthq':
        return normalizePredictHQEvent(event);
      case 'ticketmaster':
        return normalizeTicketmasterEvent(event);
      default:
        console.error(`[NORMALIZE] Unknown event source: ${source}`);
        return createErrorEvent(source, event?.title || event?.name);
    }
  } catch (error) {
    console.error(`[NORMALIZE] Error normalizing ${source} event:`, error);
    return createErrorEvent(source);
  }
}