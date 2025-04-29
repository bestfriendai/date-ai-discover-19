/**
 * Enhanced RapidAPI integration for search-events function
 * Optimized for location-based searches and real event data
 */

import { Event, SearchParams } from './types.ts';
import { calculateDistance } from './processing.ts';
import { logError, tryCatch, validateDefined, ErrorSeverity } from './errorHandling.ts';

/**
 * Transform a RapidAPI event to our standardized format
 * @param rawEvent The raw event data from RapidAPI
 * @returns Transformed event or null if transformation fails
 */
function transformRapidAPIEvent(rawEvent: any): Event | null {
  try {
    if (!rawEvent || !rawEvent.name || !rawEvent.id) {
      return null;
    }

    // Extract venue information
    const venue = rawEvent.venue?.name || rawEvent.location?.name || 'Venue TBA';
    
    // Extract location information
    let location = '';
    if (rawEvent.location) {
      const city = rawEvent.location.city || '';
      const state = rawEvent.location.state || '';
      const country = rawEvent.location.country || '';
      location = [city, state, country].filter(Boolean).join(', ');
    } else {
      location = venue; // Fallback to venue if no location
    }

    // Extract coordinates
    let coordinates: [number, number] | undefined = undefined;
    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;

    if (rawEvent.location?.geo) {
      // RapidAPI sometimes provides coordinates in different formats
      if (Array.isArray(rawEvent.location.geo)) {
        // Format: [longitude, latitude]
        coordinates = rawEvent.location.geo as [number, number];
        longitude = coordinates[0];
        latitude = coordinates[1];
      } else if (typeof rawEvent.location.geo === 'object') {
        // Format: {latitude: number, longitude: number}
        latitude = rawEvent.location.geo.latitude;
        longitude = rawEvent.location.geo.longitude;
        if (latitude !== undefined && longitude !== undefined) {
          coordinates = [longitude, latitude];
        }
      }
    }

    // Determine if this is a party event based on keywords
    const partyKeywords = ['party', 'club', 'nightlife', 'dj', 'dance', 'festival', 'celebration'];
    const isPartyEvent = (
      (rawEvent.name && partyKeywords.some(keyword => rawEvent.name.toLowerCase().includes(keyword))) ||
      (rawEvent.description && partyKeywords.some(keyword => rawEvent.description.toLowerCase().includes(keyword))) ||
      (rawEvent.category && partyKeywords.some(keyword => rawEvent.category.toLowerCase().includes(keyword)))
    );

    // Extract category
    let category = 'event';
    if (rawEvent.category) {
      category = rawEvent.category.toLowerCase();
    } else if (isPartyEvent) {
      category = 'party';
    }

    // Extract image URL
    const image = rawEvent.image || rawEvent.images?.[0]?.url || 'https://via.placeholder.com/400x200?text=Event';

    // Extract date and time
    let date = 'Date TBA';
    let time = 'Time TBA';
    let rawDate: string | undefined = undefined;

    if (rawEvent.date) {
      if (typeof rawEvent.date === 'string') {
        rawDate = rawEvent.date;
        // Try to format the date string
        try {
          const dateObj = new Date(rawEvent.date);
          if (!isNaN(dateObj.getTime())) {
            date = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          }
        } catch (e) {
          // Keep default values if parsing fails
        }
      } else if (typeof rawEvent.date === 'object') {
        // Handle object format with start and end dates
        if (rawEvent.date.start) {
          rawDate = rawEvent.date.start;
          try {
            const dateObj = new Date(rawEvent.date.start);
            if (!isNaN(dateObj.getTime())) {
              date = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              time = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            }
          } catch (e) {
            // Keep default values if parsing fails
          }
        }
      }
    }

    // Extract price information
    let price = 'Price TBA';
    if (rawEvent.price) {
      if (typeof rawEvent.price === 'string') {
        price = rawEvent.price;
      } else if (typeof rawEvent.price === 'number') {
        price = `$${rawEvent.price}`;
      } else if (typeof rawEvent.price === 'object') {
        if (rawEvent.price.min && rawEvent.price.max) {
          price = `$${rawEvent.price.min} - $${rawEvent.price.max}`;
        } else if (rawEvent.price.min) {
          price = `$${rawEvent.price.min}+`;
        } else if (rawEvent.price.max) {
          price = `Up to $${rawEvent.price.max}`;
        }
      }
    }

    // Extract tags
    const tags = rawEvent.tags || [];

    return {
      id: rawEvent.id,
      source: 'rapidapi',
      title: rawEvent.name,
      description: rawEvent.description || '',
      date,
      time,
      location,
      venue,
      category,
      image,
      imageAlt: rawEvent.name,
      coordinates,
      latitude,
      longitude,
      url: rawEvent.url || '',
      price,
      rawDate,
      isPartyEvent,
      tags
    };
  } catch (error) {
    logError(error, ErrorSeverity.LOW, 'EVENT_TRANSFORM', { eventId: rawEvent?.id || 'unknown' });
    return null;
  }
}

/**
 * Search for events using RapidAPI with enhanced location handling
 * @param params Search parameters
 * @param apiKey RapidAPI key
 * @returns Events and error information
 */
export async function searchRapidAPIEvents(
  params: SearchParams,
  apiKey: string
): Promise<{ events: Event[], error: string | null, status?: number, searchQueryUsed?: string }> {
  // Store query params for error reporting
  const queryParams = new URLSearchParams();
  
  try {
    // Validate API key
    validateDefined(apiKey, 'RapidAPI key is required');
    
    // Check if this is a party search
    const isPartySearch = params.categories?.includes('party');
    
    // Build optimized query string for location-based searches
    let queryString = '';
    let usingCoordinates = false;
    
    // Clean and normalize keyword
    const cleanKeyword = params.keyword?.trim().replace(/\s+/g, ' ') || '';
    
    // Optimize location-based query construction
    if (params.latitude !== undefined && params.longitude !== undefined) {
      // Format coordinates with precision for better API results
      const lat = parseFloat(String(params.latitude)).toFixed(6);
      const lng = parseFloat(String(params.longitude)).toFixed(6);
      
      // Validate coordinates
      if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng)) ||
          parseFloat(lat) < -90 || parseFloat(lat) > 90 ||
          parseFloat(lng) < -180 || parseFloat(lng) > 180) {
        throw new Error('Invalid coordinates provided');
      }
      
      // Construct location-based query
      if (isPartySearch) {
        // Party-specific search with coordinates
        queryString = `parties events nightlife near ${lat},${lng}`;
      } else {
        // General event search with coordinates
        queryString = `events near ${lat},${lng}`;
      }
      
      // Add location name if available for better results
      if (params.location) {
        queryString = `${queryString} in ${params.location}`;
      }
      
      usingCoordinates = true;
      logError(`Using coordinates for search: ${lat},${lng}`, ErrorSeverity.LOW, 'RAPIDAPI_SEARCH');
    } else if (params.location) {
      // Location name-based search
      if (isPartySearch) {
        queryString = `parties events nightlife in ${params.location}`;
      } else {
        queryString = `events in ${params.location}`;
      }
    } else {
      // Fallback search with no location
      queryString = isPartySearch ? 'popular parties events' : 'popular events';
    }
    
    // Add categories to query if available
    if (params.categories && params.categories.length > 0) {
      const nonPartyCategories = params.categories.filter(c => c !== 'party');
      if (nonPartyCategories.length > 0) {
        queryString = `${nonPartyCategories.join(' ')} ${queryString}`;
      }
    }
    
    // Add keyword to query if provided
    if (cleanKeyword && !queryString.includes(cleanKeyword)) {
      queryString += ` ${cleanKeyword}`;
    }
    
    // Add party-specific keywords for better results
    if (isPartySearch) {
      const partyKeywords = ['nightclub', 'dance', 'dj', 'celebration', 'social'];
      // Add specific keywords based on user input
      if (cleanKeyword.includes('club')) {
        partyKeywords.push('nightclub', 'club night', 'dance club');
      } else if (cleanKeyword.includes('festival')) {
        partyKeywords.push('music festival', 'outdoor festival');
      }
      
      // Add party keywords that aren't already in the query
      for (const keyword of partyKeywords) {
        if (!queryString.toLowerCase().includes(keyword)) {
          queryString += ` ${keyword}`;
        }
      }
    }
    
    logError(`Final query string: "${queryString}"`, ErrorSeverity.LOW, 'RAPIDAPI_SEARCH');
    
    // Set query parameter
    queryParams.append('query', queryString);
    
    // Set date parameter to get upcoming events
    // 'month' gives a good balance of upcoming events
    queryParams.append('date', 'month');
    
    // Only get in-person events
    queryParams.append('is_virtual', 'false');
    
    // Request maximum number of events for better filtering
    const apiLimit = 200; // Optimal per-page limit
    queryParams.append('limit', apiLimit.toString());
    
    // Handle pagination
    const startIndex = params.page && params.page > 1 ? (params.page - 1) * apiLimit : 0;
    queryParams.append('start', startIndex.toString());
    
    // Sort by relevance for better results
    queryParams.append('sort', 'relevance');
    
    // Construct API URL
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    logError(`Sending request to: ${url.substring(0, 100)}...`, ErrorSeverity.LOW, 'RAPIDAPI_SEARCH');
    
    // Make API request
    const { result: response, error: fetchError } = await tryCatch(
      () => fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
      }),
      'RAPIDAPI_FETCH',
      ErrorSeverity.HIGH
    );
    
    // Handle fetch errors
    if (fetchError || !response) {
      return { 
        events: [], 
        error: `RapidAPI request failed: ${fetchError?.message || 'Unknown error'}`,
        status: 500,
        searchQueryUsed: queryString
      };
    }
    
    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      logError(
        `Request failed: ${response.status} - ${errorText.substring(0, 200)}`,
        ErrorSeverity.HIGH,
        'RAPIDAPI_RESPONSE'
      );
      return { 
        events: [], 
        error: `RapidAPI request failed: ${response.status}`,
        status: response.status,
        searchQueryUsed: queryString
      };
    }
    
    // Parse response
    const { result: data, error: parseError } = await tryCatch(
      () => response.json(),
      'RAPIDAPI_PARSE',
      ErrorSeverity.HIGH
    );
    
    // Handle parse errors
    if (parseError || !data) {
      return { 
        events: [], 
        error: `Failed to parse RapidAPI response: ${parseError?.message || 'Unknown error'}`,
        status: 500,
        searchQueryUsed: queryString
      };
    }
    
    // Extract raw events
    const rawEvents = data.data || [];
    logError(`Received ${rawEvents.length} raw events`, ErrorSeverity.LOW, 'RAPIDAPI_RESULTS');
    
    // Transform events
    let transformedEvents = rawEvents
      .map(transformRapidAPIEvent)
      .filter((event: Event | null): event is Event => event !== null);
    
    logError(`Transformed ${transformedEvents.length} events successfully`, ErrorSeverity.LOW, 'RAPIDAPI_TRANSFORM');
    
    // Filter out past events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const initialCountBeforeDateFilter = transformedEvents.length;
    transformedEvents = transformedEvents.filter((event: Event) => {
      if (!event.rawDate) return true;
      
      try {
        const eventDate = new Date(event.rawDate);
        return !isNaN(eventDate.getTime()) && eventDate >= today;
      } catch (e) {
        logError(
          `Failed to parse date for event ${event.id}: ${event.rawDate}`,
          ErrorSeverity.LOW,
          'DATE_FILTER'
        );
        return true;
      }
    });
    
    logError(
      `Filtered out past events: ${initialCountBeforeDateFilter} -> ${transformedEvents.length}`,
      ErrorSeverity.LOW,
      'DATE_FILTER'
    );
    
    // Apply radius filtering if coordinates are provided
    if (params.radius !== undefined && params.latitude !== undefined && params.longitude !== undefined) {
      const initialCount = transformedEvents.length;
      const userLat = parseFloat(String(params.latitude));
      const userLng = parseFloat(String(params.longitude));
      const radiusMiles = Math.max(1, Math.min(500, parseFloat(String(params.radius)) || 25));
      
      // Validate coordinates
      if (isNaN(userLat) || isNaN(userLng) ||
          userLat < -90 || userLat > 90 ||
          userLng < -180 || userLng > 180) {
        logError(
          `Invalid user coordinates: ${params.latitude}, ${params.longitude}`,
          ErrorSeverity.MEDIUM,
          'RADIUS_FILTER'
        );
      } else {
        logError(
          `Filtering by radius: ${radiusMiles} miles from ${userLat}, ${userLng}`,
          ErrorSeverity.LOW,
          'RADIUS_FILTER'
        );
        
        // Count events with coordinates
        const eventsWithCoords = transformedEvents.filter((event: Event) =>
          event.latitude !== undefined && event.longitude !== undefined &&
          event.latitude !== null && event.longitude !== null &&
          !isNaN(Number(event.latitude)) && !isNaN(Number(event.longitude))
        );
        
        logError(
          `Events with valid coordinates: ${eventsWithCoords.length}/${initialCount}`,
          ErrorSeverity.LOW,
          'RADIUS_FILTER'
        );
        
        // Filter events by radius
        transformedEvents = transformedEvents.filter((event: Event) => {
          const eventLat = event.latitude;
          const eventLng = event.longitude;
          
          // Skip events with invalid coordinates
          if (eventLat === undefined || eventLng === undefined ||
              eventLat === null || eventLng === null ||
              isNaN(Number(eventLat)) || isNaN(Number(eventLng))) {
            return false;
          }
          
          try {
            const distance = calculateDistance(userLat, userLng, Number(eventLat), Number(eventLng));
            
            // Apply radius boost for party events
            if (isPartySearch && (event.category === 'party' || event.isPartyEvent)) {
              const partyRadiusBoost = 1.5; // 50% larger radius for party events
              return distance <= (radiusMiles * partyRadiusBoost);
            }
            
            return distance <= radiusMiles;
          } catch (e) {
            logError(
              `Error calculating distance for event ${event.id}: ${e}`,
              ErrorSeverity.LOW,
              'RADIUS_FILTER'
            );
            return false;
          }
        });
        
        logError(
          `Filtered by radius (${radiusMiles} miles): ${initialCount} -> ${transformedEvents.length}`,
          ErrorSeverity.LOW,
          'RADIUS_FILTER'
        );
      }
    }
    
    // Limit results to requested limit
    if (params.limit && transformedEvents.length > params.limit) {
      transformedEvents = transformedEvents.slice(0, params.limit);
    }
    
    logError(`Returning ${transformedEvents.length} processed events`, ErrorSeverity.LOW, 'RAPIDAPI_COMPLETE');
    
    return {
      events: transformedEvents,
      error: null,
      status: 200,
      searchQueryUsed: queryString
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(errorMsg, ErrorSeverity.HIGH, 'RAPIDAPI_ERROR');
    
    // Attempt to get the query string even if the error occurred later
    const queryUsed = queryParams.get('query') || 'Error before query build';
    
    return {
      events: [],
      error: `Failed to search RapidAPI: ${errorMsg}`,
      status: 500,
      searchQueryUsed: queryUsed
    };
  }
}