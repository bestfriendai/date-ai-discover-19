/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event } from './types.ts';
import { detectPartyEvent, detectPartySubcategory } from './partyUtils.ts';

/**
 * Fetch events from PredictHQ API with improved error handling
 */
interface PredictHQParams {
  apiKey: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  location?: string;
  withinParam?: string;
  keyword?: string;
  limit?: number;
}

interface PredictHQResponse {
  events: Event[];
  error: string | null;
  status?: number;
  warnings?: string[];
}

export async function fetchPredictHQEvents(params: PredictHQParams): Promise<PredictHQResponse> {
  const {
    apiKey,
    latitude,
    longitude,
    radius = 50, // Significantly increased default radius for more party events
    startDate,
    endDate,
    categories = [],
    location,
    withinParam,
    keyword,
    limit = 500 // Significantly increased limit for more party events
  } = params;

  try {
    // Validate API key with proper type checking
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      console.error('[PREDICTHQ] Invalid API key:', apiKey);
      return { 
        events: [], 
        error: 'Invalid PredictHQ API key',
        status: 401
      };
    }
    
    // Validate date formats if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return {
        events: [],
        error: 'Invalid startDate format. Use YYYY-MM-DD',
        status: 400
      };
    }
    
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return {
        events: [],
        error: 'Invalid endDate format. Use YYYY-MM-DD',
        status: 400
      };
    }
    
    // Validate coordinates if provided
    if (latitude && (latitude < -90 || latitude > 90)) {
      return {
        events: [],
        error: 'Invalid latitude value. Must be between -90 and 90',
        status: 400
      };
    }
    
    if (longitude && (longitude < -180 || longitude > 180)) {
      return {
        events: [],
        error: 'Invalid longitude value. Must be between -180 and 180',
        status: 400
      };
    }
    
    // Validate radius
    if (radius && (radius < 0 || radius > 1000)) {
      return {
        events: [],
        error: 'Invalid radius value. Must be between 0 and 1000 miles',
        status: 400
      };
    }
    
    // Validate limit
    if (limit && (limit < 1 || limit > 1000)) {
      return {
        events: [],
        error: 'Invalid limit value. Must be between 1 and 1000',
        status: 400
      };
    }

    console.log('[PREDICTHQ] Fetching events with params:', {
      hasCoordinates: !!(latitude && longitude),
      radius,
      hasDateRange: !!(startDate && endDate),
      categories,
      location,
      locationProvided: !!location,
      locationLength: location ? location.length : 0,
      withinParam,
      keyword,
      limit,
      apiKeyProvided: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'N/A'
    });

    // Build the PredictHQ API URL
    let url = 'https://api.predicthq.com/v1/events/';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add location parameters (either coordinates or place name)
    if (withinParam) {
      // Use the pre-formatted within parameter directly
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using pre-formatted within parameter: ${withinParam}`);
    } else if (latitude && longitude) {
      // Convert radius from miles to km (PredictHQ uses km)
      // For party events, use a much larger radius
      let effectiveRadius = radius;
      if (categories && categories.includes('party')) {
        effectiveRadius = Math.max(radius, 75); // At least 75 miles for party events
        console.log(`[PREDICTHQ] Using significantly increased radius for party events: ${effectiveRadius} miles`);
      }
      const radiusKm = Math.round(effectiveRadius * 1.60934);
      queryParams.append('within', `${radiusKm}km@${latitude},${longitude}`);
      console.log(`[PREDICTHQ] Using coordinates: ${latitude},${longitude} with radius ${radiusKm}km`);
    } else if (location) {
      // Check if location is a comma-separated lat,lng string
      const latLngMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (latLngMatch) {
        const lat = parseFloat(latLngMatch[1]);
        const lng = parseFloat(latLngMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          // Convert radius from miles to km (PredictHQ uses km)
          // For party events, use a much larger radius
          let effectiveRadius = radius;
          if (categories && categories.includes('party')) {
            effectiveRadius = Math.max(radius, 75); // At least 75 miles for party events
            console.log(`[PREDICTHQ] Using significantly increased radius for party events: ${effectiveRadius} miles`);
          }
          const radiusKm = Math.round(effectiveRadius * 1.60934);
          queryParams.append('within', `${radiusKm}km@${lat},${lng}`);
          console.log(`[PREDICTHQ] Parsed coordinates from location string: ${lat},${lng} with radius ${radiusKm}km`);
        } else {
          console.log(`[PREDICTHQ] Invalid coordinates in location string: ${location}, using as place name`);
          queryParams.append('place.name', location);
        }
      } else {
        // Try to clean up the location string to improve matching
        const cleanLocation = location.replace(/\s+/g, ' ').trim();
        console.log(`[PREDICTHQ] Using location as place name: ${cleanLocation}`);
        queryParams.append('place.name', cleanLocation);
      }
    } else {
      // Default to a popular location if none provided
      console.log(`[PREDICTHQ] No location or coordinates provided, using default location`);
      queryParams.append('place.name', 'New York');
    }

    // Always filter for future events
    const now = new Date();
    // Add a small buffer (subtract 1 hour) to avoid missing events that just started
    now.setHours(now.getHours() - 1);
    const today = now.toISOString().split('T')[0];

    // Use start.gte instead of active.gte to ensure we only get events that haven't started yet
    // or are currently happening (more reliable than active.gte)
    queryParams.append('start.gte', startDate || today);

    // Also add a sort parameter to get the soonest events first
    queryParams.append('sort', 'start');

    // Add end date if provided
    if (endDate) {
      queryParams.append('active.lte', endDate);
    }

    // --- Enhanced party events prioritization in PredictHQ queries ---
    // If categories includes 'party', use a more sophisticated approach to find party events
    let categoriesForQuery = categories || [];
    let keywordForQuery = keyword;
    let labelsForQuery: string[] = [];
    let rankGte = 0; // Default rank threshold

    if (categoriesForQuery.includes('party')) {
      console.log('[PARTY_DEBUG] Party category requested - applying enhanced party detection');

      // Increase radius for party searches
      if (radius < 75) {
        console.log(`[PARTY_DEBUG] Increasing radius from ${radius} to 75 miles for party search`);
        // This is already handled above, but logging for clarity
      }

      // Add all party-related PredictHQ categories - only using valid PredictHQ categories
      // Prioritize categories that are most likely to contain party events
      const partyCategories = ['concerts', 'festivals', 'community', 'conferences', 'performing-arts', 'expos'];
      categoriesForQuery = Array.from(new Set([...categoriesForQuery, ...partyCategories]));

      // Force the category parameter to include all party-related categories
      queryParams.append('category', partyCategories.join(','));

      // Add party-related labels - prioritizing the most relevant ones
      // We'll rely heavily on labels to identify potential party events
      labelsForQuery = [
        // Top priority labels - strongest party indicators
        'nightlife', 'party', 'club', 'nightclub', 'dance-club', 'disco',
        'dance-party', 'dj-set', 'dj-night', 'dj-party', 'rave',
        'bottle-service', 'vip-tables', 'vip-section',
        'club-night', 'dance-night', 'party-night',

        // Day party specific labels
        'day-party', 'pool-party', 'beach-party', 'day-club',
        'rooftop-party', 'outdoor-party',

        // Music and entertainment focused labels
        'electronic-music', 'hip-hop', 'edm', 'house-music',
        'techno', 'music-festival', 'dance-music',

        // Venue type labels
        'lounge', 'bar', 'club-venue', 'nightclub-venue', 'dance-venue',
        'warehouse-party', 'underground-party',

        // Special event types
        'exclusive', 'vip', 'launch-party', 'after-party',
        'themed-party', 'costume-party', 'masquerade'
      ];

      // Add comprehensive party-related keywords if not present
      if (!keywordForQuery) {
        // Create a focused party keyword search with the most relevant terms first
        keywordForQuery = 'nightclub OR "night club" OR "dance club" OR "dance party" OR "dj set" OR "dj night" OR rave OR "bottle service" OR "vip table" OR "vip section" OR "dance floor" OR "electronic music" OR "hip hop" OR "edm" OR "house music" OR techno OR "underground party" OR "warehouse party" OR "pool party" OR "day party" OR "rooftop party" OR "exclusive party" OR "vip party" OR "club night" OR "dance night" OR "party night" OR "nightlife" OR "night life"';
      } else {
        // If keyword is provided, enhance it with party-specific terms
        keywordForQuery = `(${keywordForQuery}) AND (party OR club OR nightlife OR dance OR dj)`;
      }

      // Set a minimum rank threshold to filter out low-quality events
      // PredictHQ rank is 0-100, with higher values for more significant events
      rankGte = 30; // Only include events with rank >= 30
      queryParams.append('rank.gte', rankGte.toString());
      console.log(`[PARTY_DEBUG] Setting minimum rank threshold to ${rankGte}`);

      // Increase the limit for party events
      if (limit < 500) {
        const newParams = {
          ...params,
          limit: 500
        };
        console.log(`[PARTY_DEBUG] Increasing limit from ${params.limit} to ${newParams.limit}`);
        return fetchPredictHQEvents(newParams);
      }

      console.log('[PARTY_DEBUG] Enhanced PredictHQ filters for party events');
    }
    // --- END enhanced party events prioritization ---

    // Add category filters
    if (categoriesForQuery && categoriesForQuery.length > 0) {
      // Map our categories to PredictHQ categories
      const categoryMap: Record<string, string[]> = {
        'music': ['concerts', 'festivals'],
        'sports': ['sports'],
        'arts': ['performing-arts', 'community', 'expos'],
        'family': ['community', 'expos'],
        'food': ['community', 'expos'],
        // Include categories that might contain party events - only using valid PredictHQ categories
        'party': ['festivals', 'community', 'conferences', 'concerts', 'expos', 'performing-arts', 'sports', 'community']
      };

      // Log the categories for debugging
      console.log(`[CATEGORY_DEBUG] Requested categories: ${categoriesForQuery.join(', ')}`);
      console.log(`[CATEGORY_DEBUG] Mapped PredictHQ categories: ${categoriesForQuery.flatMap(cat => categoryMap[cat] || []).join(', ')}`);

      // Make sure 'party' is included in the categories if requested
      if (categoriesForQuery.includes('party')) {
        console.log('[CATEGORY_DEBUG] Party category requested, ensuring party-related categories are included');
      }

      const predictHQCategories = categoriesForQuery
        .flatMap(cat => categoryMap[cat] || [])
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

      if (predictHQCategories.length > 0) {
        queryParams.append('category', predictHQCategories.join(','));
      }
    }
    // Add labels if present
    if (labelsForQuery.length > 0) {
      queryParams.append('labels', labelsForQuery.join(','));
    }
    // Add keyword search
    if (keywordForQuery) {
      queryParams.append('q', keywordForQuery);
    }

    // Add limit parameter
    queryParams.append('limit', limit.toString());

    // Add include parameters for additional data - request all available fields for rich event data
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images,websites,entities.entity.websites,entities.entity.images');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    console.log('[PREDICTHQ] API URL:', url);

    // Make the API request with proper error handling
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PREDICTHQ] API error:', response.status, errorText);

      // More detailed error logging
      if (response.status === 401) {
        console.error('[PREDICTHQ] Authentication error - check API key');
      } else if (response.status === 429) {
        console.error('[PREDICTHQ] Rate limit exceeded');
      } else if (response.status === 400) {
        // Bad request - likely an issue with the parameters
        console.error('[PREDICTHQ] Bad request - check parameters');
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            console.error('[PREDICTHQ] Error details:', errorJson.error);
          }
        } catch (e) {
          // If it's not valid JSON, just log the raw text
          console.error('[PREDICTHQ] Error details (raw):', errorText);
        }
      }

      return {
        events: [],
        error: `PredictHQ API error: ${response.status} ${errorText}`
      };
    }

    // Parse the response with error handling
    let data;
    try {
      data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
    } catch (parseError) {
      console.error('[PREDICTHQ] Failed to parse API response:', parseError);
      return { events: [], error: 'Failed to parse PredictHQ API response' };
    }
    console.log('[PREDICTHQ] API response:', {
      count: data.count,
      resultsCount: data.results?.length || 0,
      next: !!data.next,
      previous: !!data.previous
    });

    // Log the first result for debugging if available
    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      console.log('[PREDICTHQ] First result sample:', {
        id: firstResult.id,
        title: firstResult.title,
        start: firstResult.start,
        location: firstResult.location,
        hasCoordinates: Array.isArray(firstResult.location) && firstResult.location.length === 2
      });
    } else {
      console.log('[PREDICTHQ] No results returned');
    }

    // Transform PredictHQ events to our format
    const events = data.results?.map(normalizePredictHQEvent) || [];

    return { events, error: null };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.stack) {
        console.error('[PREDICTHQ] Error stack:', error.stack);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error);
    }
    console.error('[PREDICTHQ] Error fetching events:', errorMessage);

    // Provide more detailed error information
    let detailedError = errorMessage;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        detailedError = 'PredictHQ API request timed out after 10 seconds';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        detailedError = 'Network error when connecting to PredictHQ API';
      } else if (error.stack) {
        console.error('[PREDICTHQ] Error stack:', error.stack);
      }
    }

    return { 
      events: [], 
      error: detailedError,
      status: 500
    };
  }
}

/**
 * Normalize a PredictHQ event to our standard format
 */
function normalizePredictHQEvent(event: any): Event {
  try {
    // Validate event object
    if (!event || typeof event !== 'object') {
      console.error('[PREDICTHQ] Invalid event object:', event);
      throw new Error('Invalid event object');
    }

    // Extract date and time
    const startDate = event.start || new Date().toISOString();
    const date = startDate.split('T')[0];
    const time = startDate.split('T')[1]?.substring(0, 5) || '00:00';

    // Extract location with more detail
    let location = 'Location not specified';

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

    // Map category with improved detection
    let category = 'other';

    // First check the event's category (most reliable source)
    if (event.category) {
      if (['concerts', 'festivals', 'music'].includes(event.category)) {
        category = 'music';
      } else if (['sports', 'sport'].includes(event.category)) {
        category = 'sports';
      } else if (['performing-arts', 'expos', 'exhibitions', 'arts', 'theatre', 'theater'].includes(event.category)) {
        category = 'arts';
      } else if (['community', 'family', 'children'].includes(event.category)) {
        category = 'family';
      } else if (['food-drink', 'food', 'dining', 'culinary'].includes(event.category)) {
        category = 'food';
      }
    }

    // Check for party events using party detection utilities

    // Check if this is a party event based on title and description
    let partySubcategory: any = undefined;
    const isPartyByDetection = detectPartyEvent(event.title, event.description);

    // Also check if the event has party-related labels
    // Check if the event has party-related labels - expanded list for better detection
    const hasPartyLabels = event.labels && Array.isArray(event.labels) && event.labels.some(label => {
      const partyLabels = [
        'nightlife', 'party', 'club', 'nightclub', 'dance-club', 'disco', 'lounge',
        'dance-party', 'dj-set', 'dj-night', 'dj-party', 'social-gathering', 'celebration',
        'mixer', 'happy-hour', 'cocktail', 'rave', 'festival', 'gala', 'reception',
        'day-party', 'pool-party', 'beach-party', 'brunch', 'day-club', 'rooftop-party',
        'night-out', 'night-life', 'club-night', 'dance-night', 'party-night',
        'social-mixer', 'networking-event', 'singles-event', 'mingling',
        'live-dj', 'live-band', 'live-performance', 'music-event', 'concert-event',
        'special-event', 'exclusive-event', 'vip-event', 'private-event',
        'daytime-event', 'pool-event', 'rooftop-event', 'outdoor-event',
        'lounge-venue', 'bar-venue', 'nightclub-venue', 'dance-venue',
        'themed-party', 'costume-party', 'masquerade', 'holiday-party',
        'new-years-party', 'halloween-party', 'summer-party', 'winter-party',
        'spring-party', 'fall-party', 'seasonal-party', 'annual-party'
      ];
      return partyLabels.includes(label);
    });

    // Check if the event is in a venue that suggests it's a party - expanded venue types
    const hasPartyVenue = event.entities && Array.isArray(event.entities) && event.entities.some(entity => {
      if (entity.type === 'venue' && entity.name) {
        const partyVenueTerms = [
          'club', 'lounge', 'bar', 'nightclub', 'disco', 'party', 'dance', 'dj',
          'venue', 'hall', 'ballroom', 'terrace', 'rooftop', 'warehouse', 'underground',
          'event space', 'event-space', 'social', 'mixer', 'gathering', 'celebration'
        ];
        return partyVenueTerms.some(term => entity.name.toLowerCase().includes(term));
      }
      return false;
    });

    // Check if the event title or description contains party-related terms - massively expanded list
    const partyTerms = [
      // Basic party terms
      'party', 'club', 'nightclub', 'dance', 'dj', 'nightlife', 'festival', 'mixer',
      'gathering', 'gala', 'reception', 'happy hour', 'cocktail', 'rave', 'live music',
      'concert', 'lounge', 'vip', 'exclusive', 'pool party', 'day party', 'dance party',
      'after party', 'launch party', 'birthday party', 'singles', 'warehouse', 'underground',
      'rooftop', 'beach party', 'brunch', 'dj set', 'bottle service', 'open bar',

      // Additional party terms
      'night out', 'night life', 'club night', 'dance night', 'party night',
      'social mixer', 'networking event', 'singles event', 'mingling',
      'live dj', 'live band', 'live performance', 'music event', 'concert event',
      'special event', 'exclusive event', 'vip event', 'private event',
      'daytime event', 'pool event', 'rooftop event', 'outdoor event',

      // Venue types
      'lounge venue', 'bar venue', 'nightclub venue', 'dance venue',
      'event space', 'ballroom', 'terrace', 'hall',

      // Themed parties
      'themed party', 'costume party', 'masquerade', 'holiday party',
      'new years party', 'halloween party', 'summer party', 'winter party',
      'spring party', 'fall party', 'seasonal party', 'annual party',

      // Music genres common at parties
      'electronic', 'hip hop', 'hip-hop', 'edm', 'house', 'techno', 'disco',
      'dance music', 'dance floor', 'dancing'
    ];

    const hasPartyTerms = partyTerms.some(term => {
      const lowerTitle = (event.title || '').toLowerCase();
      const lowerDesc = (event.description || '').toLowerCase();
      return lowerTitle.includes(term) || lowerDesc.includes(term);
    });

    // Check if the event is in a party-related category - expanded categories
    const partyCategories = ['concerts', 'festivals', 'community', 'performing-arts', 'expos'];
    const hasPartyCategory = event.category && partyCategories.includes(event.category);

    // Check event rank (PredictHQ specific) - higher rank events are more significant
    const eventRank = event.rank || 0;
    const isHighRankEvent = eventRank >= 60; // High rank threshold
    const isMediumRankEvent = eventRank >= 40; // Medium rank threshold

    // Log party detection for debugging
    console.log(`[PARTY_DEBUG] PredictHQ Event: ${event.title}, Category: ${category}, Rank: ${eventRank}, IsPartyByDetection: ${isPartyByDetection}, HasPartyLabels: ${hasPartyLabels}, HasPartyVenue: ${hasPartyVenue}, HasPartyTerms: ${hasPartyTerms}, HasPartyCategory: ${hasPartyCategory}`);

    // If any of our party detection methods return true, categorize as a party
    // We're being more aggressive with party detection to compensate for category limitations
    if (isPartyByDetection || hasPartyLabels || hasPartyVenue || hasPartyTerms || hasPartyCategory) {
      category = 'party';
      partySubcategory = detectPartySubcategory(event.title, event.description, time);
      console.log(`[PARTY_DEBUG] PredictHQ event categorized as party with subcategory: ${partySubcategory}`);
    }

    // For events from PredictHQ with certain categories, use a more sophisticated approach
    // This ensures we get more high-quality party events from PredictHQ
    if (event.category === 'concerts' || event.category === 'festivals' || event.category === 'performing-arts') {
      // Check if the title or description contains music-related terms that suggest a party
      // Weighted approach - some terms are stronger indicators than others
      const strongPartyTerms = [
        'dj', 'dance', 'club', 'nightclub', 'party', 'nightlife', 'electronic',
        'hip hop', 'hip-hop', 'edm', 'house', 'techno', 'disco', 'rave'
      ];

      const mediumPartyTerms = [
        'festival', 'concert', 'live music', 'performance', 'show', 'night',
        'venue', 'lounge', 'bar', 'vip', 'exclusive'
      ];

      const weakPartyTerms = [
        'evening', 'weekend', 'friday', 'saturday', 'sunday', 'entertainment'
      ];

      const lowerTitle = (event.title || '').toLowerCase();
      const lowerDesc = (event.description || '').toLowerCase();
      const combinedText = `${lowerTitle} ${lowerDesc}`;

      // Check for term presence with different weights
      const hasStrongTerms = strongPartyTerms.some(term => combinedText.includes(term));
      const hasMediumTerms = mediumPartyTerms.some(term => combinedText.includes(term));
      const hasWeakTerms = weakPartyTerms.some(term => combinedText.includes(term));

      // Determine if it's a party based on term presence and event rank
      const isPartyByStrongTerms = hasStrongTerms;
      const isPartyByMediumTerms = hasMediumTerms && (isMediumRankEvent || hasWeakTerms);
      const isPartyByWeakTerms = hasWeakTerms && isHighRankEvent;

      if (isPartyByStrongTerms || isPartyByMediumTerms || isPartyByWeakTerms) {
        category = 'party';

        // Determine subcategory based on terms
        if (!partySubcategory) {
          if (combinedText.includes('club') || combinedText.includes('nightclub') ||
              combinedText.includes('dj') || combinedText.includes('dance')) {
            partySubcategory = 'club';
          } else if (combinedText.includes('day') || combinedText.includes('afternoon') ||
                     combinedText.includes('pool') || combinedText.includes('rooftop')) {
            partySubcategory = 'day-party';
          } else {
            partySubcategory = 'general';
          }
        }

        console.log(`[PARTY_DEBUG] PredictHQ music event categorized as party: ${event.title} (Subcategory: ${partySubcategory})`);
      }

      // For concerts and festivals, even without specific terms, there's a good chance it's party-like
      // This helps us catch more potential party events
      if (event.category === 'concerts' || event.category === 'festivals') {
        // Check if it has a high rank, which suggests it's a significant event
        if (event.rank && event.rank > 50) {
          category = 'party';
          partySubcategory = partySubcategory || 'general';
          console.log(`[PARTY_DEBUG] PredictHQ high-ranked music event categorized as party: ${event.title}`);
        }
      }
    }

    // No need to store _rank since we're now including rank in the Event type

    // Generate a unique ID
    const id = `predicthq-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Get the description and ensure it's clean
    let description = '';

    // Safely get description
    if (event.description && typeof event.description === 'string') {
      description = event.description;
    } else {
      // Create a fallback description
      description = `${event.title || 'Event'} in ${location}`;
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
    let imageUrl = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';

    // Try to get image from event
    if (event.images && Array.isArray(event.images) && event.images.length > 0) {
      imageUrl = event.images[0].url;
    }

    // Category-based fallback images
    const categoryImages = {
      'music': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
      'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
      'arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
      'family': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
      'food': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'
    };

    // Use category image if no event image
    if (!event.images && category !== 'other' && categoryImages[category]) {
      imageUrl = categoryImages[category];
    }

    // Add rank and local impact data
    const rank = event.rank || 0;
    const localRelevance = event.local_rank || 0;
    const attendance = {
      forecast: event.phq_attendance || undefined,
      actual: event.actual_attendance || undefined
    };
    const demandSurge = event.labels?.includes('demand_surge') || false;
    const isRealTime = event.labels?.includes('real_time') || false;
    const predictHQCategories = event.category ? [event.category] : undefined;

    return {
      id,
      source: 'predicthq',
      title: event.title,
      description,
      date,
      time,
      location,
      venue,
      category,
      partySubcategory,
      image: imageUrl,
      coordinates,
      url: event.url,
      price: event.ticket_info?.price,
      // Add PredictHQ specific fields
      rank,
      localRelevance,
      attendance,
      demandSurge,
      isRealTime,
      predictHQCategories
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);
    console.error('Problem event:', JSON.stringify(event, null, 2).substring(0, 500) + '...');

    // Instead of throwing, return a minimal valid event
    const errorEvent: Event = {
      id: `predicthq-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: 'predicthq',
      title: event?.title || 'Unknown Event',
      description: 'Error processing event details',
      date: new Date().toISOString().split('T')[0],
      time: '00:00',
      location: 'Location unavailable',
      category: 'other',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
      rank: 0,
      localRelevance: 0,
      attendance: {
        forecast: undefined,
        actual: undefined
      },
      demandSurge: false,
      isRealTime: false
    };
    return errorEvent;
  }
}
