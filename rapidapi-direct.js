/**
 * Direct RapidAPI client for event searches
 * This file provides functions to directly call the RapidAPI Events Search API
 * without going through Supabase functions.
 */

// RapidAPI key - should be stored securely in a production environment
const RAPIDAPI_KEY = '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9';

/**
 * Search for events using RapidAPI directly
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} - Search results
 */
async function searchEventsDirectly(params) {
  try {
    console.log('Searching for events with params:', params);
    
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
    }
    
    // Set the query parameter
    queryParams.append('query', queryString);
    console.log(`Using query string: "${queryString}"`);
    
    // Add date parameter - valid values for RapidAPI:
    // all, today, tomorrow, week, weekend, next_week, month, next_month
    queryParams.append('date', params.startDate ? 'month' : 'month');
    
    // Set is_virtual parameter to false to only get in-person events
    queryParams.append('is_virtual', 'false');
    
    // Add start parameter for pagination (0-based index)
    queryParams.append('start', '0');
    
    // Add limit parameter to get more results
    queryParams.append('limit', '100');
    
    // Build the complete URL for the RapidAPI Events Search API
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    
    console.log(`Sending request to: ${url}`);
    
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
    console.log(`Received ${rawEvents.length} raw events from RapidAPI`);
    
    // Transform events to our standardized format
    let transformedEvents = rawEvents.map(transformRapidAPIEvent);
    
    // Filter events based on parameters
    if (params.categories && Array.isArray(params.categories)) {
      // If searching for party events, filter to only include party events
      if (params.categories.includes('party')) {
        console.log('Filtering for party events only');
        transformedEvents = transformedEvents.filter(event => 
          event.isPartyEvent || event.category === 'party'
        );
        console.log(`Found ${transformedEvents.length} party events`);
      }
    }
    
    // Filter events by radius if coordinates are provided
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius) {
      console.log(`Filtering events within ${params.radius} miles of [${params.latitude}, ${params.longitude}]`);
      
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
      
      console.log(`Found ${transformedEvents.length} events within ${radius} miles`);
    }
    
    // Limit the number of events if requested
    if (params.limit && transformedEvents.length > params.limit) {
      transformedEvents = transformedEvents.slice(0, params.limit);
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
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error searching RapidAPI events:', error);
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
        error: error.message
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
  const date = event.date_human_readable || 'Date not specified';
  const time = event.start_time
    ? new Date(event.start_time).toLocaleTimeString('en-US', {
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
  
  // Determine event category
  let category = 'other';
  
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
  
  if (isPartyEvent) {
    category = 'party';
    
    // Determine party subcategory
    let partySubcategory = 'general';
    
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
  
  // Get event URL
  const eventUrl = event.link || '';
  
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
    partySubcategory: isPartyEvent ? partySubcategory : undefined,
    image: eventImage,
    imageAlt: `${event.name} event image`,
    coordinates,
    longitude: eventLongitude,
    latitude: eventLatitude,
    url: eventUrl,
    isPartyEvent
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
