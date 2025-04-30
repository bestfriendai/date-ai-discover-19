
/**
 * Enhanced RapidAPI integration for search-events function
 * Optimized for location-based searches and real event data
 */

import { Event, SearchParams } from './types.ts';
import { calculateDistance } from './processing.ts';
import { logError, ErrorSeverity } from './errorHandling.ts';

// Default values for search parameters
const DEFAULT_VALUES = {
  RADIUS: 25,         // Default radius in miles
  MAX_RADIUS: 100,    // Maximum allowed radius
  MIN_RADIUS: 1,      // Minimum allowed radius
  LIMIT: 100,         // Default result limit
  MAX_LIMIT: 200      // Maximum allowed limit
};

// Special categories that require custom handling
const SPECIAL_CATEGORIES = {
  PARTY: 'party'
};

// Set of party keywords for detection
const PARTY_KEYWORDS = [
  'party', 'club', 'nightlife', 'dance', 'dj', 
  'festival', 'celebration', 'gala', 'mixer', 'nightclub',
  'disco', 'bash', 'soiree', 'fiesta', 'get-together'
];

/**
 * Transform a RapidAPI event into our standard Event format
 * @param event The RapidAPI event object
 * @returns A transformed Event object or null if invalid
 */
function transformRapidAPIEvent(event: any): Event | null {
  try {
    // Skip events with missing critical data
    if (!event || !event.name) {
      return null;
    }
    
    // Extract venue information with proper validation
    const venue = event.venue?.name || '';
    let location = '';
    
    if (event.venue) {
      // Process location with multiple fallback options
      if (event.venue.full_address) {
        location = event.venue.full_address;
      } else {
        // Construct from parts with validation
        const venueParts = [
          event.venue.city,
          event.venue.state,
          event.venue.country
        ].filter(Boolean);
        
        location = venueParts.join(', ');
      }
    }
    
    // Get coordinates with proper validation
    let coordinates: [number, number] | undefined = undefined;
    let eventLongitude = event.venue?.longitude;
    let eventLatitude = event.venue?.latitude;
    
    // Validate and normalize coordinates
    const hasValidCoordinates = 
      eventLatitude !== undefined && eventLongitude !== undefined &&
      eventLatitude !== null && eventLongitude !== null &&
      !isNaN(Number(eventLatitude)) && !isNaN(Number(eventLongitude));
      
    if (hasValidCoordinates) {
      // Convert to numbers to ensure consistent type
      eventLatitude = Number(eventLatitude);
      eventLongitude = Number(eventLongitude);
      coordinates = [eventLongitude, eventLatitude];
    }
    
    // Extract title and description with fallbacks
    const title = event.name || 'Event';
    const description = event.description || '';
    
    // Check if this is a party event using keywords
    const nameLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    const venueLower = venue.toLowerCase();
    
    const isPartyEvent = 
      PARTY_KEYWORDS.some(kw => nameLower.includes(kw)) || 
      PARTY_KEYWORDS.some(kw => descLower.includes(kw)) ||
      (event.category && event.category.toLowerCase().includes('party')) ||
      (venueLower.includes('club') || venueLower.includes('lounge'));
    
    // Determine party subcategory
    let partySubcategory: string | undefined = undefined;
    if (isPartyEvent) {
      if (nameLower.includes('brunch') || descLower.includes('brunch')) {
        partySubcategory = 'brunch';
      } else if ((nameLower.includes('day') && nameLower.includes('party')) ||
                 (descLower.includes('day') && descLower.includes('party'))) {
        partySubcategory = 'day-party';
      } else if (nameLower.includes('club') || descLower.includes('club') ||
                 venueLower.includes('club')) {
        partySubcategory = 'club';
      } else {
        partySubcategory = 'general';
      }
    }
    
    // Return standardized event
    return {
      id: `rapidapi_${event.event_id || Math.random().toString(36).substring(2, 10)}`,
      source: 'rapidapi',
      title: title,
      description: description,
      date: event.date_human_readable || '',
      time: event.time || '',
      location: location,
      venue: venue,
      category: isPartyEvent ? 'party' : 'other',
      image: event.thumbnail || '',
      coordinates: coordinates,
      longitude: hasValidCoordinates ? eventLongitude : undefined,
      latitude: hasValidCoordinates ? eventLatitude : undefined,
      url: event.link || '',
      rawDate: event.date || event.date_utc || event.date_human_readable || '',
      isPartyEvent: isPartyEvent,
      partySubcategory: partySubcategory
    };
  } catch (error) {
    logError(error, ErrorSeverity.LOW, 'EVENT_TRANSFORM');
    return null;
  }
}

/**
 * Search for events using RapidAPI with improved handling
 * @param params Search parameters
 * @param apiKey RapidAPI key
 * @returns Search results
 */
export async function searchRapidAPIEvents(
  params: SearchParams,
  apiKey: string
): Promise<{ events: Event[], error: string | null, searchQueryUsed?: string }> {
  try {
    // Validate API key
    if (!apiKey) {
      throw new Error('No RapidAPI key provided');
    }
    
    console.log('[RAPIDAPI] Starting search with parameters:', 
      JSON.stringify({
        ...params,
        // Don't log possibly sensitive location info
        location: params.location ? '[LOCATION PROVIDED]' : undefined
      }));
    
    // -- Build Query String --
    let queryString = '';
    let cleanKeyword = params.keyword?.trim() || '';
    
    // Handle party search differently for better results
    const isPartySearch = params.categories?.includes(SPECIAL_CATEGORIES.PARTY);
    
    if (isPartySearch) {
      // -- Party Search Optimization --
      let partyTerms = ['party', 'nightlife', 'nightclub'];
      
      // If we have a specific party subcategory, optimize terms for it
      if (cleanKeyword) {
        if (cleanKeyword.toLowerCase().includes('club')) {
          partyTerms = ['nightclub', 'club night', 'dance club', ...partyTerms];
        } else if (cleanKeyword.toLowerCase().includes('day')) {
          partyTerms = ['day party', 'daytime event', 'afternoon party', ...partyTerms];
        } else if (cleanKeyword.toLowerCase().includes('brunch')) {
          partyTerms = ['brunch party', 'brunch event', 'sunday brunch', ...partyTerms];
        }
      }
      
      // Construct search query with party terms
      if (params.latitude !== undefined && params.longitude !== undefined) {
        // Validate coordinates before using them
        const lat = Number(params.latitude);
        const lng = Number(params.longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[RAPIDAPI] Invalid coordinates provided, using general search');
          queryString = `${partyTerms.join(' ')} events`;
        } else {
          // Use coordinates with party terms
          queryString = `${partyTerms.join(' ')} events near ${lat.toFixed(4)},${lng.toFixed(4)}`;
        }
      } else if (params.location) {
        queryString = `${partyTerms.join(' ')} events in ${params.location}`;
      } else {
        queryString = `${partyTerms.join(' ')} events`; // Fallback
      }
      
      // Add additional keyword if it's not already covered by party terms
      if (cleanKeyword && !partyTerms.some(term => cleanKeyword.toLowerCase().includes(term))) {
        queryString += ` ${cleanKeyword}`;
      }
    } else {
      // -- Standard Search Construction --
      if (params.latitude !== undefined && params.longitude !== undefined) {
        // Validate coordinates
        const lat = Number(params.latitude);
        const lng = Number(params.longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[RAPIDAPI] Invalid coordinates provided, using general search');
          queryString = 'popular events';
        } else {
          // Build query with coordinates
          queryString = `events near ${lat.toFixed(4)},${lng.toFixed(4)}`;
          
          // Add category-specific keywords if available
          if (params.categories && params.categories.length > 0) {
            const validCategories = params.categories.filter(c => c !== SPECIAL_CATEGORIES.PARTY);
            if (validCategories.length > 0) {
              queryString += ` ${validCategories.join(' ')}`;
            }
          }
        }
      } else if (params.location) {
        queryString = `events in ${params.location}`;
        
        // Add category-specific terms
        if (params.categories && params.categories.length > 0) {
          const validCategories = params.categories.filter(c => c !== SPECIAL_CATEGORIES.PARTY);
          if (validCategories.length > 0) {
            queryString = `${validCategories.join(' ')} ${queryString}`;
          }
        }
      } else {
        // Fallback search with no location
        if (params.categories && params.categories.length > 0) {
          const validCategories = params.categories.filter(c => c !== SPECIAL_CATEGORIES.PARTY);
          if (validCategories.length > 0) {
            queryString = `${validCategories.join(' ')} events`;
          } else {
            queryString = `popular events`;
          }
        } else {
          queryString = `popular events`;
        }
      }
      
      // Add keyword if provided
      if (cleanKeyword) {
        queryString += ` ${cleanKeyword}`;
      }
    }
    
    console.log(`[RAPIDAPI] Constructed query: "${queryString}"`);
    
    // -- Build API Request --
    const queryParams = new URLSearchParams();
    
    // Set query parameter
    queryParams.append('query', queryString);
    
    // Date Parameter - Use 'month' for a good amount of upcoming events
    queryParams.append('date', 'month');
    
    // Virtual events setting - only physical events
    queryParams.append('is_virtual', 'false');
    
    // Request maximum limit for post-filtering
    const apiLimit = Math.min(DEFAULT_VALUES.MAX_LIMIT, params.limit ? params.limit * 2 : DEFAULT_VALUES.LIMIT);
    queryParams.append('limit', apiLimit.toString());
    queryParams.append('start', '0');
    
    // -- Make API Request --
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    console.log(`[RAPIDAPI] Sending request to: ${url.substring(0, 100)}...`);
    
    // Setting timeout for the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        },
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeout);
      
      console.log(`[RAPIDAPI] Response status: ${response.status}`);
      
      if (!response.ok) {
        // Handle different HTTP error codes appropriately
        let errorMessage = `RapidAPI request failed: ${response.status}`;
        
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'API key is invalid or unauthorized';
        } else if (response.status === 429) {
          errorMessage = 'API rate limit exceeded';
        } else if (response.status >= 500) {
          errorMessage = 'RapidAPI server error';
        }
        
        // Try to get more details from the error response
        const errorText = await response.text();
        console.error(`[RAPIDAPI] Request failed: ${response.status}`, errorText.substring(0, 200));
        
        return {
          events: [],
          error: errorMessage,
          searchQueryUsed: queryString
        };
      }
      
      const data = await response.json();
      const rawEvents = data.data || [];
      console.log(`[RAPIDAPI] Received ${rawEvents.length} raw events.`);
      
      // -- Transform Events --
      let transformedEvents = rawEvents
        .map(transformRapidAPIEvent)
        .filter((event): event is Event => event !== null);
      
      console.log(`[RAPIDAPI] Transformed ${transformedEvents.length} events successfully.`);
      
      // -- Filter Events by Radius --
      if (params.radius !== undefined && params.latitude !== undefined && params.longitude !== undefined) {
        const initialCount = transformedEvents.length;
        const userLat = Number(params.latitude);
        const userLng = Number(params.longitude);
        const radiusMiles = Math.max(
          DEFAULT_VALUES.MIN_RADIUS,
          Math.min(
            DEFAULT_VALUES.MAX_RADIUS,
            Number(params.radius) || DEFAULT_VALUES.RADIUS
          )
        );
        
        // Validate coordinates
        if (isNaN(userLat) || isNaN(userLng) ||
            userLat < -90 || userLat > 90 ||
            userLng < -180 || userLng > 180) {
          console.warn(`[RAPIDAPI] Invalid user coordinates: ${params.latitude}, ${params.longitude}`);
        } else {
          // Filter events by distance
          transformedEvents = transformedEvents.filter(event => {
            // Skip events without coordinates
            if (!event.latitude || !event.longitude) {
              return false;
            }
            
            try {
              const distance = calculateDistance(
                userLat,
                userLng,
                Number(event.latitude),
                Number(event.longitude)
              );
              
              return distance <= radiusMiles;
            } catch (e) {
              return false; // Skip events with invalid coordinates
            }
          });
          
          console.log(`[RAPIDAPI] Filtered by radius: ${initialCount} -> ${transformedEvents.length}`);
        }
      }
      
      // -- Filter Past Events --
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      
      const initialCountBeforeDateFilter = transformedEvents.length;
      transformedEvents = transformedEvents.filter(event => {
        if (!event.rawDate) return true; // Keep events with no date
        
        try {
          const eventDate = new Date(event.rawDate);
          return !isNaN(eventDate.getTime()) && eventDate >= now;
        } catch (e) {
          return true; // Keep events with unparseable dates
        }
      });
      
      console.log(`[RAPIDAPI] Filtered past events: ${initialCountBeforeDateFilter} -> ${transformedEvents.length}`);
      
      // -- Apply Limit --
      if (params.limit && transformedEvents.length > params.limit) {
        transformedEvents = transformedEvents.slice(0, params.limit);
        console.log(`[RAPIDAPI] Limited to ${transformedEvents.length} events`);
      }
      
      return {
        events: transformedEvents,
        error: null,
        searchQueryUsed: queryString
      };
    } catch (error) {
      clearTimeout(timeout);
      
      const errorMessage = error instanceof Error 
        ? error.message
        : error instanceof DOMException && error.name === 'AbortError'
          ? 'Request timed out'
          : String(error);
          
      console.error(`[RAPIDAPI] Request failed: ${errorMessage}`);
      
      return {
        events: [],
        error: `RapidAPI request failed: ${errorMessage}`,
        searchQueryUsed: queryString
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[RAPIDAPI] Error in searchRapidAPIEvents: ${errorMessage}`);
    
    return {
      events: [],
      error: errorMessage,
      searchQueryUsed: 'Error occurred before query construction'
    };
  }
}
