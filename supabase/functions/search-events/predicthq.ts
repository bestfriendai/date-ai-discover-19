/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event, PredictHQParams } from './types.ts';
import { detectPartyEvent, detectPartySubcategory } from './partyUtils.ts';
import { normalizePredictHQEvent } from './eventNormalizers.ts';

interface PredictHQResponse {
  events: Event[];
  error: string | null;
  status?: number;
  warnings?: string[];
}

export async function fetchPredictHQEvents(params: PredictHQParams): Promise<PredictHQResponse> {
  // Validate input parameters
  if (!params) {
    console.error('[PREDICTHQ] Missing parameters');
    return {
      events: [],
      error: 'Missing parameters',
      status: 400
    };
  }
  console.log('[PREDICTHQ] fetchPredictHQEvents called with params:', JSON.stringify({
    ...params,
    apiKey: params.apiKey ? `${params.apiKey.substring(0, 4)}...${params.apiKey.substring(params.apiKey.length - 4)}` : 'NOT SET'
  }, null, 2));
  const {
    apiKey,
    latitude,
    longitude,
    radius = 50,
    startDate,
    endDate,
    categories = [],
    location,
    withinParam,
    keyword,
    limit = 100
  } = params;

  try {
    // Validate API key with proper type checking
    if (typeof apiKey !== 'string' || apiKey.length < 10) { // Basic length check
      console.error('[PREDICTHQ_AUTH_ERROR] Invalid or missing API key.');
      console.error('[PREDICTHQ_AUTH_ERROR] API Key details:', {
        provided: !!apiKey,
        length: apiKey?.length || 0,
        type: typeof apiKey
      });
      return {
        events: [],
        error: 'PredictHQ API key is missing or invalid. Check server configuration.',
        status: 401
      };
    }
    console.log(`[PREDICTHQ_AUTH_DEBUG] API Key looks valid (length ${apiKey.length}).`);

    // Log API key details for debugging
    console.log('[PREDICTHQ] API Key validation passed');
    console.log('[PREDICTHQ] API Key length:', apiKey.length);
    console.log('[PREDICTHQ] API Key prefix:', apiKey.substring(0, 4) + '...');
    console.log('[PREDICTHQ] API Key suffix:', '...' + apiKey.substring(apiKey.length - 4));

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

    // Validate radius (already validated by validateAndNormalizeRadius)
    if (radius && (radius < 5 || radius > 100)) {
      return {
        events: [],
        error: 'Invalid radius value. Must be between 5 and 100 miles',
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

    // Process the API call

    // Build query parameters
    const queryParams = new URLSearchParams();

    // --- ENHANCED LOCATION LOGIC ---
    let locationParamSet = false;

    /**
     * Helper function to validate coordinates
     * @param lat Latitude value
     * @param lng Longitude value
     * @returns True if coordinates are valid, false otherwise
     */
    function validateCoordinates(lat: any, lng: any): boolean {
      // Check if both values are numbers
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return false;
      }
      
      // Check if values are within valid ranges
      if (isNaN(lat) || isNaN(lng) || 
          lat < -90 || lat > 90 || 
          lng < -180 || lng > 180) {
        return false;
      }
      
      // Check for 0,0 coordinates (often default values)
      if (lat === 0 && lng === 0) {
        return false;
      }
      
      return true;
    }

    /**
     * Helper function to format the within parameter for PredictHQ API
     * PredictHQ expects coordinates in the format longitude,latitude (opposite of usual)
     * @param lat Latitude value
     * @param lng Longitude value
     * @param radiusMiles Radius in miles
     * @returns Formatted within parameter
     */
    function formatWithinParameter(lat: number, lng: number, radiusMiles: number): string {
      // Ensure radius is a positive number
      const finalRadius = typeof radiusMiles === 'number' && radiusMiles > 0 ? radiusMiles : 25;
      
      // Convert radius from miles to km (PredictHQ uses km)
      const radiusKm = Math.round(finalRadius * 1.60934);
      
      // PredictHQ expects coordinates in the format longitude,latitude (opposite of usual)
      return `${radiusKm}km@${lng},${lat}`;
    }

    // Priority 1: Use coordinates and user's radius if valid
    if (validateCoordinates(latitude, longitude)) {
      const withinParam = formatWithinParameter(Number(latitude), Number(longitude), Number(radius));
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using coordinates ${longitude},${latitude} (lng,lat) with radius ${Math.round(Number(radius) * 1.60934)}km.`);
      locationParamSet = true;
    }
    // Priority 2: Use 'withinParam' if explicitly provided (often used internally)
    else if (withinParam) {
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using provided 'within' parameter: ${withinParam}`);
      locationParamSet = true;
    }
    // Priority 3: Use location string as place name if coordinates are missing
    else if (location && typeof location === 'string' && location.trim()) {
      // Check if location is a comma-separated lat,lng string
      const latLngMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (latLngMatch) {
        const lat = parseFloat(latLngMatch[1]);
        const lng = parseFloat(latLngMatch[2]);
        
        if (validateCoordinates(lat, lng)) {
          const withinParam = formatWithinParameter(lat, lng, Number(radius));
          queryParams.append('within', withinParam);
          console.log(`[PREDICTHQ] Parsed coordinates from location string: ${lng},${lat} (lng,lat) with radius ${Math.round(Number(radius) * 1.60934)}km`);
          locationParamSet = true;
        } else {
          console.log(`[PREDICTHQ] Invalid coordinates in location string: ${location}, using as place name`);
          queryParams.append('place.name', location);
          locationParamSet = true;
        }
      } else {
        // Try to clean up the location string to improve matching
        const cleanLocation = location.replace(/\s+/g, ' ').trim();
        console.log(`[PREDICTHQ] Using location as place name: "${cleanLocation}"`);
        queryParams.append('place.name', cleanLocation);
        locationParamSet = true;
      }
    }

    // If no location parameter could be set, use default location (New York City)
    if (!locationParamSet) {
      console.log('[PREDICTHQ] No valid location parameter could be determined. Using default location (New York City).');
      // Default to New York City with a 25-mile radius (converted to km)
      const defaultRadiusKm = Math.round(25 * 1.60934);
      // Note: PredictHQ expects coordinates in the format longitude,latitude
      queryParams.append('within', `${defaultRadiusKm}km@-74.0060,40.7128`);
      console.log(`[PREDICTHQ] Using default coordinates: -74.0060,40.7128 (lng,lat) with radius ${defaultRadiusKm}km.`);
      locationParamSet = true;
    }
    // --- END ENHANCED LOCATION LOGIC ---

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
    // No longer using rankGte since we're not setting a rank threshold

    if (categoriesForQuery.includes('party')) {
      console.log('[PARTY_DEBUG] Party category requested - applying enhanced party detection');

      // Use the provided radius without increasing it
      console.log(`[PARTY_DEBUG] Using radius: ${radius} miles for party search`);

      // Force active state for party events
      queryParams.append('state', 'active');

      // Add all party-related PredictHQ categories
      const partyCategories = ['concerts', 'festivals', 'community', 'performing-arts', 'expos', 'conferences'];
      categoriesForQuery = Array.from(new Set([...categoriesForQuery, ...partyCategories]));

      // Add party-related labels
      const partyLabels = [
        'nightlife', 'club', 'dance-club', 'disco', 'dance-party', 'dj-set',
        'live-music', 'live-performance', 'entertainment', 'music-venue',
        'bar', 'lounge', 'nightclub', 'party-venue', 'social-gathering'
      ];
      partyLabels.forEach(label => {
        queryParams.append('phq_label', label);
      });
      queryParams.append('phq_label.op', 'any');

      // Add party-related categories
      queryParams.append('category', partyCategories.join(','));

      // Remove rank threshold for party events to get more results
      console.log('[PARTY_DEBUG] Removing rank threshold for party events');

      // Add state parameter to ensure we get active events
      queryParams.append('state', 'active');

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
        'themed-party', 'costume-party', 'masquerade',

        // Social gathering labels
        'social', 'social-gathering', 'mixer', 'networking', 'meetup',
        'singles', 'dating', 'speed-dating', 'mingling', 'social-event',
        'community-event', 'gathering', 'get-together', 'celebration',
        'gala', 'reception', 'cocktail-party', 'happy-hour',

        // Additional entertainment labels
        'entertainment', 'live-entertainment', 'performance', 'show',
        'concert', 'live-music', 'live-band', 'live-dj', 'live-performance',
        'comedy', 'comedy-night', 'stand-up', 'improv', 'karaoke',
        'open-mic', 'trivia', 'game-night', 'bingo', 'quiz-night'
      ];

      // Add comprehensive party-related keywords if not present
      if (!keywordForQuery) {
        // Create a focused party keyword search with the most relevant terms first
        keywordForQuery = 'party OR nightclub OR "night club" OR "dance club" OR "dance party" OR "dj set" OR "dj night" OR rave OR "bottle service" OR "vip table" OR "vip section" OR "dance floor" OR "electronic music" OR "hip hop" OR "hip-hop" OR "edm" OR "house music" OR techno OR "underground party" OR "warehouse party" OR "pool party" OR "day party" OR "rooftop party" OR "exclusive party" OR "vip party" OR "club night" OR "dance night" OR "party night" OR "nightlife" OR "night life" OR social OR gathering OR mixer OR networking OR meetup OR singles OR dating OR "speed dating" OR mingling OR celebration OR gala OR reception OR "cocktail party" OR "happy hour"';
      } else {
        // If keyword is provided, enhance it with party-specific terms
        keywordForQuery = `(${keywordForQuery}) OR party OR club OR nightlife OR dance OR dj OR social OR gathering OR mixer OR celebration`;
      }

      // Set a very low minimum rank threshold to include more party events
      // PredictHQ rank is 0-100, with higher values for more significant events
      // Don't set rank.gte for party events to get all results
      console.log(`[PARTY_DEBUG] Removing rank threshold to include all party events`);

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
        'party': ['concerts', 'festivals', 'community', 'performing-arts', 'expos']
      };

      // Log the categories for debugging
      console.log(`[CATEGORY_DEBUG] Requested categories: ${categoriesForQuery.join(', ')}`);
      console.log(`[CATEGORY_DEBUG] Mapped PredictHQ categories: ${categoriesForQuery.flatMap(cat => categoryMap[cat] || []).join(', ')}`);

      // Make sure 'party' is included in the categories if requested
      if (categoriesForQuery.includes('party')) {
        console.log('[CATEGORY_DEBUG] Party category requested, ensuring party-related categories are included');
      }

      // Always map categories, even if party is included
      const predictHQCategories = categoriesForQuery
        .flatMap(cat => categoryMap[cat] || [])
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

      if (predictHQCategories.length > 0) {
        queryParams.append('category', predictHQCategories.join(','));
      }
    }
    // Add labels if present - use phq_label instead of labels (which is deprecated)
    if (labelsForQuery.length > 0) {
      // Use phq_label instead of labels (which is deprecated)
      // Add each label individually for better matching
      labelsForQuery.forEach(label => {
        queryParams.append('phq_label', label);
      });
      // Set the operator to 'any' to match events with any of the labels
      queryParams.append('phq_label.op', 'any');
    }
    // Add keyword search
    if (keywordForQuery) {
      queryParams.append('q', keywordForQuery);
    }

    // Add limit parameter
    queryParams.append('limit', limit.toString());

    // Add include parameters for additional data - request all available fields for rich event data
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images,websites,entities.entity.websites,entities.entity.images,phq_labels');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    // Log full request details
    console.log('[PREDICTHQ] Full API URL:', url);
    console.log('[PREDICTHQ] API Key prefix:', apiKey ? apiKey.substring(0, 4) + '...' : 'NOT SET');
    console.log('[PREDICTHQ] Full Query parameters:', {
      categories: categoriesForQuery,
      labels: labelsForQuery,
      keyword: keywordForQuery,
      location: location,
      latitude: latitude,
      longitude: longitude,
      radius: radius,
      startDate: startDate,
      endDate: endDate,
      limit: limit,
      queryParams: Object.fromEntries(queryParams.entries())
    });

    // Make the API request with proper error handling
    console.log('[PREDICTHQ] Making API request with headers:', {
      'Authorization': apiKey ? `Bearer ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET',
      'Accept': 'application/json'
    });

    // Make the API request with proper error handling
    let response: Response;
    try {
      // Create a controller for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort('PredictHQ API call timed out after 15 seconds'); // Increased timeout
      }, 15000);

      console.log('[PREDICTHQ] Making API request to:', url.substring(0, 100) + '...');
      console.log('[PREDICTHQ] Request headers:', {
        'Authorization': apiKey ? `Bearer ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET',
        'Accept': 'application/json'
      });

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[PREDICTHQ] API response status:', response.status);
    } catch (fetchError) {
      console.error('[PREDICTHQ_FETCH_ERROR] Fetch error:', fetchError);
      let errorMsg = `PredictHQ API fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        errorMsg = fetchError.message; // Use the AbortError message directly
      }

      return {
        events: [],
        error: errorMsg,
        status: 500,
        warnings: ['API request failed or timed out']
      };
    }

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PREDICTHQ_API_ERROR] API error response:', response.status, errorText.substring(0, 200));

      let errorDetails: any = { status: response.status };
      let warnings: string[] = [];

      try {
        // Attempt to parse error response as JSON for more details
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          console.error('[PREDICTHQ_API_ERROR] Error details:', errorJson.error);
          errorDetails.apiError = errorJson.error;
          warnings.push(String(errorJson.error));
        }
        if (errorJson.warnings) {
           console.warn('[PREDICTHQ_API_WARN] API warnings:', errorJson.warnings);
           errorDetails.warnings = errorJson.warnings;
           warnings = warnings.concat(errorJson.warnings);
        }
      } catch (e) {
        // If not JSON, include the raw text
        errorDetails.rawResponse = errorText.substring(0, 200) + '...';
      }

      // More detailed error logging based on status code
      if (response.status === 401) {
        console.error('[PREDICTHQ_AUTH_ERROR] Authentication error - check API key');
        console.error('[PREDICTHQ_AUTH_ERROR] API Key prefix:', apiKey ? apiKey.substring(0, 4) + '...' : 'NOT SET');
        console.error('[PREDICTHQ_AUTH_ERROR] API Key length:', apiKey ? apiKey.length : 0);
        warnings.push('Authentication failed - API key may be invalid');
      } else if (response.status === 429) {
        console.error('[PREDICTHQ_RATE_ERROR] Rate limit exceeded');
        warnings.push('Rate limit exceeded');
      } else if (response.status === 400) {
        // Bad request - likely an issue with the parameters
        console.error('[PREDICTHQ_PARAM_ERROR] Bad request - check parameters');
        warnings.push('Invalid request parameters');
      }

      return {
        events: [],
        error: `PredictHQ API error: ${response.status}`,
        status: response.status,
        warnings
      };
    }

    // Parse the response with error handling
    let data: any;
    try {
      data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
    } catch (parseError) {
      console.error('[PREDICTHQ_PARSE_ERROR] Failed to parse API response:', parseError);
      // Include raw response text for debugging parse errors
      const rawText = await response.text().catch(() => 'Could not read response text.');
      console.error('[PREDICTHQ_PARSE_ERROR] Raw response text:', rawText.substring(0, 200) + '...');
      return {
        events: [],
        error: 'Failed to parse PredictHQ API response',
        status: 500,
        warnings: ['Response parsing failed']
      };
    }
    // Log detailed API response
    console.log('[PREDICTHQ_DEBUG] Full API response:', {
      count: data.count,
      resultsCount: data.results?.length || 0,
      next: !!data.next,
      previous: !!data.previous,
      warnings: data.warnings,
      firstResult: data.results?.[0] ? {
        id: data.results[0].id,
        title: data.results[0].title,
        category: data.results[0].category,
        labels: data.results[0].labels,
        start: data.results[0].start,
        location: data.results[0].location
      } : null,
      requestId: data.request_id,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Log any warnings
    if (data.warnings && data.warnings.length > 0) {
      console.warn('[PREDICTHQ_DEBUG] API Warnings:', data.warnings);
    }

    // Log the full response for debugging
    if (data.results && data.results.length > 0) {
      console.log('[PREDICTHQ] First result full details:', JSON.stringify(data.results[0]));
    } else {
      console.log('[PREDICTHQ] No results returned from API');
    }

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

    // Transform PredictHQ events to our format using the new normalizer
    const events = data.results?.map((event: any) => {
      try {
        return normalizePredictHQEvent(event);
      } catch (e) {
        console.error('[PREDICTHQ_NORM_ERROR] Failed to normalize PredictHQ event:', event?.id, e);
        // Return a minimal error event instead of null
        return {
          id: `predicthq-norm-error-${event?.id || Date.now()}`,
          source: 'predicthq',
          title: event?.title || 'Error Normalizing Event',
          description: `Failed to process event data from PredictHQ (ID: ${event?.id}).`,
          date: event?.start?.split('T')[0] || new Date().toISOString().split('T')[0],
          time: event?.start?.split('T')[1]?.substring(0, 5) || '00:00',
          location: event?.location_name || event?.place?.name || 'Unknown location',
          category: 'error',
          image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
          rank: event?.rank || 0,
          localRelevance: event?.local_rank || 0,
          attendance: { forecast: event?.phq_attendance, actual: event?.actual_attendance },
          demandSurge: event?.labels?.includes('demand_surge') ? 1 : 0,
        };
      }
    }) || [];

    // Filter out any normalization error events if they exist
    const successfullyNormalizedEvents = events.filter((event: any) => event.category !== 'error');

    return {
      events: successfullyNormalizedEvents,
      error: null,
      status: response.status,
      warnings: data.warnings // Include warnings in the response
    };
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
