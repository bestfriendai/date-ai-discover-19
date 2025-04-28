/**
 * Direct RapidAPI Integration for DateAI
 * 
 * This file provides a client-side implementation for directly calling the RapidAPI Events Search API
 * without going through Supabase functions. This can be integrated into the main application.
 */

// RapidAPI key - should be stored securely in a production environment
const RAPIDAPI_KEY = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';

/**
 * Search for events using RapidAPI directly
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} - Search results
 */
export async function searchEvents(params) {
  try {
    console.log('[EVENTS] Searching for events with direct RapidAPI call:', params);
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Determine if this is a party search
    const isPartySearch = params.categories && 
                         Array.isArray(params.categories) && 
                         params.categories.includes('party');
    
    // Build the query string based on parameters
    let queryString = '';
    
    // Add location to query if provided
    if (params.location) {
      if (isPartySearch) {
        // For party searches, add party keywords to the location search
        queryString = `parties in ${params.location}`;
      } else {
        queryString = `events in ${params.location}`;
      }
    } else if (params.latitude !== undefined && params.longitude !== undefined) {
      // For coordinate-based searches
      if (isPartySearch) {
        queryString = 'parties nearby';
      } else {
        queryString = 'events nearby';
      }
    } else {
      // Default fallback
      queryString = isPartySearch ? 'popular parties' : 'popular events';
    }
    
    // If this is a party search, enhance the query with party keywords
    if (isPartySearch && params.keyword) {
      queryString += ` ${params.keyword}`;
    } else if (isPartySearch) {
      // Add party-related keywords to improve results
      queryString += ' nightclub dj dance festival celebration';
    } else if (params.keyword) {
      // Add any provided keywords
      queryString += ` ${params.keyword}`;
    }
    
    // Set the query parameter
    queryParams.append('query', queryString);
    console.log(`[EVENTS] Using query string: "${queryString}"`);
    
    // Add date parameter - valid values for RapidAPI:
    // all, today, tomorrow, week, weekend, next_week, month, next_month
    if (params.startDate) {
      // If we have a specific start date, use 'month' to get a wider range
      queryParams.append('date', 'month');
    } else {
      // Default to 'week' for a reasonable timeframe
      queryParams.append('date', 'week');
    }
    
    // Set is_virtual parameter to false to only get in-person events
    queryParams.append('is_virtual', 'false');
    
    // Add start parameter for pagination (0-based index)
    queryParams.append('start', params.page ? (params.page - 1) * (params.limit || 20) : '0');
    
    // Add limit parameter to get more results
    queryParams.append('limit', '100'); // Request 100 events to have enough after filtering
    
    // Build the complete URL for the RapidAPI Events Search API
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    
    console.log(`[EVENTS] Sending request to: ${url}`);
    
    // Make the API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`RapidAPI request failed with status: ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Get raw events from the response
    const rawEvents = data.data || [];
    console.log(`[EVENTS] Received ${rawEvents.length} raw events from RapidAPI`);
    
    // Transform events to our standardized format
    let transformedEvents = rawEvents.map(transformRapidAPIEvent);
    
    // Filter events based on parameters
    if (params.categories && Array.isArray(params.categories)) {
      // If searching for party events, filter to only include party events
      if (params.categories.includes('party')) {
        console.log('[EVENTS] Filtering for party events only');
        transformedEvents = transformedEvents.filter(event => 
          event.isPartyEvent || event.category === 'party'
        );
        console.log(`[EVENTS] Found ${transformedEvents.length} party events`);
      }
    }
    
    // Filter events by radius if coordinates are provided
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius) {
      console.log(`[EVENTS] Filtering events within ${params.radius} miles of [${params.latitude}, ${params.longitude}]`);
      
      const userLat = params.latitude;
      const userLng = params.longitude;
      const radius = params.radius;
      
      transformedEvents = transformedEvents.filter(event => {
        // Get event coordinates
        const eventLat = event.latitude;
        const eventLng = event.longitude;
        
        // Skip events with invalid coordinates
        if (eventLat === null || eventLng === null ||
            eventLat === undefined || eventLng === undefined ||
            isNaN(Number(eventLat)) || isNaN(Number(eventLng))) {
          return false;
        }
        
        // Calculate distance between user and event
        const distance = calculateDistance(
          Number(userLat),
          Number(userLng),
          Number(eventLat),
          Number(eventLng)
        );
        
        // Return true if event is within the radius
        return distance <= radius;
      });
      
      console.log(`[EVENTS] Found ${transformedEvents.length} events within ${radius} miles`);
    }
    
    // Filter by date range if provided
    if (params.startDate || params.endDate) {
      const startDate = params.startDate ? new Date(params.startDate) : new Date();
      const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3); // Default to 3 months from start date if no end date
      
      console.log(`[EVENTS] Filtering events between ${startDate.toISOString()} and ${endDate.toISOString()}`);
      
      transformedEvents = transformedEvents.filter(event => {
        // Skip events without a date
        if (!event.rawDate) return false;
        
        // Parse the event date
        const eventDate = new Date(event.rawDate);
        
        // Return true if event is within the date range
        return eventDate >= startDate && eventDate <= endDate;
      });
      
      console.log(`[EVENTS] Found ${transformedEvents.length} events within date range`);
    }
    
    // Filter out excluded events
    if (params.excludeIds && Array.isArray(params.excludeIds) && params.excludeIds.length > 0) {
      transformedEvents = transformedEvents.filter(event => 
        !params.excludeIds.includes(event.id)
      );
    }
    
    // Sort events by date (soonest first)
    transformedEvents.sort((a, b) => {
      if (!a.rawDate) return 1;
      if (!b.rawDate) return -1;
      return new Date(a.rawDate) - new Date(b.rawDate);
    });
    
    // Limit the number of events if requested
    const totalEvents = transformedEvents.length;
    if (params.limit && transformedEvents.length > params.limit) {
      const startIndex = params.page ? (params.page - 1) * params.limit : 0;
      transformedEvents = transformedEvents.slice(startIndex, startIndex + params.limit);
    }
    
    // Return the filtered events
    return {
      events: transformedEvents,
      sourceStats: {
        rapidapi: {
          count: transformedEvents.length,
          error: null
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        totalEvents,
        page: params.page || 1,
        limit: params.limit || totalEvents,
        hasMore: params.limit ? totalEvents > params.page * params.limit : false
      }
    };
  } catch (error) {
    console.error('[EVENTS] Error searching RapidAPI events:', error);
    return {
      events: [],
      sourceStats: {
        rapidapi: {
          count: 0,
          error: error.message
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        error: error.message,
        totalEvents: 0,
        page: params.page || 1,
        limit: params.limit || 20,
        hasMore: false
      }
    };
  }
}

/**
 * Transform a RapidAPI event to our standardized format
 * @param {Object} event - Raw event from RapidAPI
 * @returns {Object} - Standardized event object
 */
function transformRapidAPIEvent(event) {
  // Extract venue information
  const venue = event.venue?.name || '';
  const location = event.venue?.full_address ||
                  `${event.venue?.city || ''}, ${event.venue?.state || ''}`.trim() ||
                  'Location not specified';
  
  // Extract date and time
  const rawDate = event.start_time_utc || event.start_time || event.date_human_readable;
  let dateObj = null;
  
  if (event.start_time_utc) {
    dateObj = new Date(event.start_time_utc);
  } else if (event.start_time) {
    dateObj = new Date(event.start_time);
  } else if (event.date_human_readable) {
    // Try to parse the human-readable date
    try {
      const parts = event.date_human_readable.split(' ');
      if (parts.length >= 3) {
        // Format might be like "Monday, June 10, 2023"
        dateObj = new Date(parts.slice(1).join(' '));
      }
    } catch (e) {
      console.warn('[EVENTS] Could not parse date:', event.date_human_readable);
    }
  }
  
  // Format the date and time
  const date = dateObj 
    ? dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }) 
    : event.date_human_readable || 'Date not specified';
  
  const time = dateObj
    ? dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : '';
  
  // Extract coordinates
  let coordinates = null;
  let eventLatitude = null;
  let eventLongitude = null;
  
  if (event.venue?.latitude !== undefined && event.venue?.longitude !== undefined) {
    eventLatitude = event.venue.latitude;
    eventLongitude = event.venue.longitude;
    coordinates = [eventLongitude, eventLatitude];
  }
  
  // Enhanced party detection with expanded keywords
  const partyKeywords = [
    'party', 'club', 'dj', 'nightlife', 'dance', 'lounge', 'rave', 
    'festival', 'celebration', 'gala', 'social', 'mixer', 'nightclub',
    'disco', 'bash', 'soiree', 'fiesta', 'shindig', 'get-together',
    'brunch', 'day party', 'pool party', 'rooftop'
  ];
  
  const nameLower = event.name?.toLowerCase() || '';
  const descriptionLower = event.description?.toLowerCase() || '';
  
  const isPartyEvent = 
    partyKeywords.some(keyword => nameLower.includes(keyword)) ||
    partyKeywords.some(keyword => descriptionLower.includes(keyword));
  
  // Determine event category and subcategory
  let category = 'other';
  let partySubcategory = undefined;
  
  if (isPartyEvent) {
    category = 'party';
    partySubcategory = 'general';
    
    // Determine party subcategory
    if (nameLower.includes('festival') || descriptionLower.includes('festival')) {
      partySubcategory = 'festival';
    } else if (nameLower.includes('brunch') || descriptionLower.includes('brunch')) {
      partySubcategory = 'brunch';
    } else if ((nameLower.includes('day') && nameLower.includes('party')) || 
               (descriptionLower.includes('day') && descriptionLower.includes('party'))) {
      partySubcategory = 'day party';
    } else if (nameLower.includes('club') || descriptionLower.includes('club') ||
               nameLower.includes('nightlife') || descriptionLower.includes('nightlife')) {
      partySubcategory = 'nightclub';
    }
  }
  
  // Get event URL and ticket URL
  const eventUrl = event.link || '';
  let ticketUrl = '';
  
  if (event.ticket_links && event.ticket_links.length > 0) {
    ticketUrl = event.ticket_links[0].link || '';
  }
  
  // Get event image
  const eventImage = event.thumbnail || 'https://placehold.co/600x400?text=No+Image';
  
  // Create standardized event object
  return {
    id: `rapidapi_${event.event_id}`,
    source: 'rapidapi',
    title: event.name,
    description: event.description || '',
    date,
    time,
    location,
    venue,
    category,
    partySubcategory,
    image: eventImage,
    imageAlt: `${event.name} event image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: eventUrl,
    rawDate,
    isPartyEvent,
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
    }
  };
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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
  const R = 3958.8;
  
  // Calculate the distance
  const distance = R * c;
  
  return distance;
}

/**
 * Example of how to integrate this into the main application
 */
export function createDirectRapidAPIService() {
  return {
    /**
     * Search for events
     * @param {Object} params - Search parameters
     * @returns {Promise<Object>} - Search results
     */
    searchEvents,
    
    /**
     * Get event details
     * @param {string} eventId - Event ID
     * @returns {Promise<Object>} - Event details
     */
    async getEventDetails(eventId) {
      // Extract the actual event ID from our prefixed ID
      const actualEventId = eventId.startsWith('rapidapi_') 
        ? eventId.substring('rapidapi_'.length) 
        : eventId;
      
      try {
        // Build the query URL
        const url = `https://real-time-events-search.p.rapidapi.com/event-details?event_id=${encodeURIComponent(actualEventId)}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
          }
        });
        
        if (!response.ok) {
          throw new Error(`RapidAPI event details request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.data) {
          throw new Error('Invalid response from RapidAPI event details endpoint');
        }
        
        // Transform the event
        const transformedEvent = transformRapidAPIEvent(data.data);
        
        return {
          event: transformedEvent,
          error: null
        };
      } catch (error) {
        console.error('[EVENTS] Error fetching event details:', error);
        return {
          event: null,
          error: error.message
        };
      }
    }
  };
}
