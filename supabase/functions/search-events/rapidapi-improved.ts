/**
 * Enhanced RapidAPI integration for search-events function
 * This file provides improved error handling, parameter validation, and
 * more reliable coordinate handling for RapidAPI event searches.
 */

import { Event, SearchParams } from './types.ts';
import { calculateDistance } from './processing.ts';
import { detectPartyEvent } from './partyUtils.ts';

// Default values for search parameters
const DEFAULT_VALUES = {
  RADIUS: 25,         // Default radius in miles
  MAX_RADIUS: 500,    // Maximum allowed radius
  MIN_RADIUS: 1,      // Minimum allowed radius
  LIMIT: 100,         // Default result limit
  MAX_LIMIT: 500      // Maximum allowed limit
};

// Special categories that require custom handling
const SPECIAL_CATEGORIES = {
  PARTY: 'party'
};

// API response interface for better type safety
interface RapidAPIResponse {
  events: Event[];
  error: string | null;
  status: number;
  searchQueryUsed?: string;
}

/**
 * Transform a RapidAPI event into our standard Event format
 * @param event The RapidAPI event object
 * @returns A transformed Event object or null if invalid
 */
export function transformRapidAPIEvent(event: any): Event | null {
  try {
    // Skip events with missing critical data
    if (!event || !event.name) {
      console.debug('[TRANSFORM] Skipping event: Missing name');
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
    
    // Check if this is a party event using our detection function
    const isPartyEvent = detectPartyEvent(title, description);
    
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
      isPartyEvent: isPartyEvent
    };
  } catch (error) {
    console.error(`[TRANSFORM] Error transforming event: ${error instanceof Error ? error.message : String(error)}`);
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
  apiKey?: string
): Promise<RapidAPIResponse> {
  // Create a new URLSearchParams for query building
  const queryParams = new URLSearchParams();
  // Flag to track if we're using coordinates for filtering
  let usingCoordinates = false;
  
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
          queryString = `events ${partyTerms.join(' ')} near ${lat.toFixed(4)},${lng.toFixed(4)}`;
          usingCoordinates = true;
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
      
      console.log(`[PARTY_SEARCH] Using enhanced party search: "${queryString}"`);
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
          } else {
            // Add general terms for better results
            queryString += ' popular featured local';
          }
          
          usingCoordinates = true;
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
    
    // Set final query parameter
    queryParams.append('query', queryString);
    const finalQuerySent = queryString;
    console.log(`[RAPIDAPI] Constructed query: "${finalQuerySent}"`);
    
    // -- Configure API Parameters --
    
    // Date Parameter - Use 'all' for maximum results
    queryParams.append('date', 'all');
    
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
          status: response.status,
          searchQueryUsed: finalQuerySent
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
      
      // -- Post-Fetch Filtering by RADIUS --
      if (params.radius !== undefined) {
        const initialCount = transformedEvents.length;
        let userLat: number | undefined = undefined;
        let userLng: number | undefined = undefined;
        let radiusMiles: number = DEFAULT_VALUES.RADIUS;
        
        // Validate and normalize input parameters
        if (params.latitude !== undefined && params.longitude !== undefined) {
          userLat = Number(params.latitude);
          userLng = Number(params.longitude);
          radiusMiles = Math.max(
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
            console.warn(`[RAPIDAPI_FILTER] Invalid user coordinates: ${params.latitude}, ${params.longitude}`);
            userLat = undefined;
            userLng = undefined;
          }
        } else if (params.radius) {
          // If we have a radius but no coordinates, normalize radius value
          radiusMiles = Math.max(
            DEFAULT_VALUES.MIN_RADIUS,
            Math.min(
              DEFAULT_VALUES.MAX_RADIUS,
              Number(params.radius) || DEFAULT_VALUES.RADIUS
            )
          );
          console.log(`[RAPIDAPI_FILTER] Using radius ${