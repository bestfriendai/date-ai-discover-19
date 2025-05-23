/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event, PredictHQParams } from './types.ts';
import { detectPartyEvent, detectPartySubcategory } from './partyUtils.ts';

interface PredictHQResponse {
  events: Event[];
  error: string | null;
  status?: number;
  warnings?: string[];
}

/**
 * Get the best available image for an event
 */
function getEventImage(event: any): string {
  // Try multiple sources for images in order of preference
  
  // 1. Check for images in websites
  if (event.websites && Array.isArray(event.websites)) {
    const websiteImage = event.websites.find((site: any) => site.url && site.logo_url);
    if (websiteImage && websiteImage.logo_url) {
      return websiteImage.logo_url;
    }
  }
  
  // 2. Check if the event has images directly
  if (event.images && Array.isArray(event.images) && event.images.length > 0) {
    // Find the largest image
    const sortedImages = [...event.images].sort((a, b) => {
      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize; // Sort by size (largest first)
    });

    // Return the URL of the largest image
    return sortedImages[0].url;
  }

  // 3. Check for images in entities (performers, venues, etc.)
  if (event.entities && Array.isArray(event.entities)) {
    // Look for entities with images
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.images && Array.isArray(entity.entity.images) && entity.entity.images.length > 0) {
        // Find the largest image
        const sortedImages = [...entity.entity.images].sort((a, b) => {
          const aSize = (a.width || 0) * (a.height || 0);
          const bSize = (b.width || 0) * (b.height || 0);
          return bSize - aSize; // Sort by size (largest first)
        });

        return sortedImages[0].url;
      }
    }
    
    // 4. Check for image in the first entity
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.image_url) {
        return entity.entity.image_url;
      }
      // Look for logo_url in entity
      if (entity.entity && entity.entity.logo_url) {
        return entity.entity.logo_url;
      }
    }
  }
  
  // 5. Check for venue image
  if (event.venue && event.venue.image) {
    return event.venue.image;
  }

  // If no images are available, use a category-based placeholder
  const categoryImages = {
    'concerts': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
    'festivals': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
    'performing-arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
    'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
    'community': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
    'expos': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
    'conferences': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop',
    'food-drink': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'
  };

  // Return category-specific image if available
  if (event.category && categoryImages[event.category]) {
    return categoryImages[event.category];
  }

  // Default placeholder
  return 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
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

    // Validate and format date formats if provided
    let formattedStartDate = startDate;
    let formattedEndDate = endDate;

    // Format startDate to YYYY-MM-DD if it has a time component
    if (startDate) {
      if (startDate.includes('T')) {
        formattedStartDate = startDate.split('T')[0];
        console.log(`[PREDICTHQ] Formatted startDate from ${startDate} to ${formattedStartDate}`);
      }

      // Validate the formatted date
      if (formattedStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(formattedStartDate)) {
        return {
          events: [],
          error: 'Invalid startDate format. Use YYYY-MM-DD',
          status: 400
        };
      }
    }

    // Format endDate to YYYY-MM-DD if it has a time component
    if (endDate) {
      if (endDate.includes('T')) {
        formattedEndDate = endDate.split('T')[0];
        console.log(`[PREDICTHQ] Formatted endDate from ${endDate} to ${formattedEndDate}`);
      }

      // Validate the formatted date
      if (formattedEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(formattedEndDate)) {
        return {
          events: [],
          error: 'Invalid endDate format. Use YYYY-MM-DD',
          status: 400
        };
      }
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

    // Add location parameters (either coordinates or place name)
    if (withinParam) {
      // Use the pre-formatted within parameter directly
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using pre-formatted within parameter: ${withinParam}`);
    } else if (latitude && longitude) {
      // Convert radius from miles to km (PredictHQ uses km)
      // Use the provided radius without increasing it
      let effectiveRadius = radius;
      // Log the radius being used
      console.log(`[PREDICTHQ] Using radius: ${effectiveRadius} miles`);
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
          // Use the provided radius without increasing it
          let effectiveRadius = radius;
          // Log the radius being used
          console.log(`[PREDICTHQ] Using radius: ${effectiveRadius} miles`);
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
    queryParams.append('start.gte', formattedStartDate || today);
    console.log(`[PREDICTHQ] Using start.gte: ${formattedStartDate || today}`);

    // Also add a sort parameter to get the soonest events first
    queryParams.append('sort', 'start');

    // Add end date if provided
    if (formattedEndDate) {
      queryParams.append('active.lte', formattedEndDate);
      console.log(`[PREDICTHQ] Using active.lte: ${formattedEndDate}`);
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
        'nightlife', 'club', 'nightclub', 'dance-club', 'disco', 'dance-party', 'dj-set',
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
        keywordForQuery = 'party OR nightclub OR "night club" OR "dance club" OR "dance party" OR "dj set" OR "dj night" OR rave OR "bottle service" OR "vip table" OR "vip section" OR "dance floor" OR "electronic music" OR "hip hop" OR "edm" OR "house music" OR techno OR "underground party" OR "warehouse party" OR "pool party" OR "day party" OR "rooftop party" OR "exclusive party" OR "vip party" OR "club night" OR "dance night" OR "party night" OR "nightlife" OR "night life" OR social OR gathering OR mixer OR networking OR meetup OR singles OR dating OR "speed dating" OR mingling OR celebration OR gala OR reception OR "cocktail party" OR "happy hour"';
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
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images,websites,entities.entity.websites,entities.entity.images,phq_labels,performers,performers.images,phq_venue.images,phq_venue.websites');

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

    // Transform PredictHQ events to our format
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

    // Enhanced category mapping with improved party detection
    let category = 'other';
    let partyScore = 0;

    // Enhanced party signals with more comprehensive keywords and higher weights
    const partySignals = {
      // Title/description keywords (weighted)
      titleKeywords: {
        strong: [
          'party', 'club', 'nightclub', 'dance', 'dj', 'rave', 'disco',
          'nightlife', 'bottle service', 'vip table', 'dance floor'
        ],
        medium: [
          'festival', 'mixer', 'social', 'celebration', 'gala',
          'lounge', 'bar', 'pub', 'cocktail'
        ],
        weak: [
          'entertainment', 'live', 'show', 'performance',
          'music', 'concert', 'event'
        ]
      },

      // Venue types (weighted)
      venueTypes: {
        strong: [
          'club', 'nightclub', 'disco', 'lounge', 'dance club',
          'party venue', 'event space'
        ],
        medium: [
          'bar', 'venue', 'hall', 'ballroom', 'rooftop',
          'warehouse', 'loft'
        ],
        weak: [
          'restaurant', 'cafe', 'theater', 'pub',
          'gallery', 'studio'
        ]
      },

      // Labels (weighted)
      labels: {
        strong: [
          'nightlife', 'dance-club', 'dj-set', 'dance-party',
          'club-night', 'party-night', 'nightclub'
        ],
        medium: [
          'live-music', 'entertainment', 'social-gathering',
          'mixer', 'celebration'
        ],
        weak: [
          'food-and-drink', 'performing-arts', 'community',
          'culture'
        ]
      }
    };

    // Check title and description
    const combinedText = `${event.title || ''} ${event.description || ''}`.toLowerCase();

    // Add points for keyword matches with higher weights
    partyScore += partySignals.titleKeywords.strong.some(kw => combinedText.includes(kw)) ? 4 : 0;
    partyScore += partySignals.titleKeywords.medium.some(kw => combinedText.includes(kw)) ? 2.5 : 0;
    partyScore += partySignals.titleKeywords.weak.some(kw => combinedText.includes(kw)) ? 1 : 0;

    // Check venue type
    if (event.entities?.some((e: any) => e.type === 'venue' && e.name)) {
      const venueName = event.entities.find((e: any) => e.type === 'venue').name.toLowerCase();
      // Give more weight to venue-based signals since they're strong indicators
      partyScore += partySignals.venueTypes.strong.some(type => venueName.includes(type)) ? 5 : 0;
      partyScore += partySignals.venueTypes.medium.some(type => venueName.includes(type)) ? 3 : 0;
      partyScore += partySignals.venueTypes.weak.some(type => venueName.includes(type)) ? 1.5 : 0;
    }

    // Check labels
    if (event.labels && Array.isArray(event.labels)) {
      partyScore += partySignals.labels.strong.some(label =>
        event.labels.some((l: string) => l.toLowerCase().includes(label))) ? 4 : 0;
      partyScore += partySignals.labels.medium.some(label =>
        event.labels.some((l: string) => l.toLowerCase().includes(label))) ? 2.5 : 0;
      partyScore += partySignals.labels.weak.some(label =>
        event.labels.some((l: string) => l.toLowerCase().includes(label))) ? 1 : 0;
    }

    // Give more weight to timing since it's a strong indicator
    const eventHour = event.start ? new Date(event.start).getHours() : -1;
    if (eventHour >= 19 || eventHour <= 4) { // 7pm-4am
      partyScore += 3;
    } else if (eventHour >= 16 && eventHour < 19) { // 4pm-7pm (happy hour/early evening)
      partyScore += 1.5;
    }

    // Check rank (higher ranked events more likely to be significant parties)
    if (event.rank) {
      if (event.rank >= 70) partyScore += 3;
      else if (event.rank >= 50) partyScore += 2;
      else if (event.rank >= 30) partyScore += 1;
    }

    // Check local rank for additional context
    if (event.local_rank) {
      if (event.local_rank >= 70) partyScore += 2;
      else if (event.local_rank >= 50) partyScore += 1;
    }

    // Check attendance if available
    if (event.phq_attendance) {
      if (event.phq_attendance >= 500) partyScore += 2;
      else if (event.phq_attendance >= 200) partyScore += 1;
    }

    const isLikelyParty = partyScore >= 4; // Lower threshold to catch more potential parties

    // Then check the event's category
    if (event.category) {
      if (isLikelyParty) {
        category = 'party';  // Override category if likely a party
      } else if (['concerts', 'festivals', 'music'].includes(event.category)) {
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

    // ENHANCED PARTY DETECTION - Comprehensive approach

    // 1. Check if this is a party event based on title and description using our utility
    let partySubcategory: any = undefined;
    const isPartyByDetection = detectPartyEvent(event.title, event.description);

    // 2. Check if the event has party-related labels
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

    const hasPartyLabels = event.labels && Array.isArray(event.labels) &&
      event.labels.some((label: string) => partyLabels.includes(label));

    // 3. Check if the event is in a venue that suggests it's a party
    const partyVenueTerms = [
      'club', 'lounge', 'bar', 'nightclub', 'disco', 'party', 'dance', 'dj',
      'venue', 'hall', 'ballroom', 'terrace', 'rooftop', 'warehouse', 'underground',
      'event space', 'event-space', 'social', 'mixer', 'gathering', 'celebration',
      'tavern', 'pub', 'cabaret', 'speakeasy', 'cocktail', 'hookah', 'karaoke',
      'brewery', 'distillery', 'winery', 'taproom', 'garden', 'patio', 'deck',
      'loft', 'studio', 'gallery', 'theater', 'arena', 'stadium', 'pavilion'
    ];

    const hasPartyVenue = event.entities && Array.isArray(event.entities) &&
      event.entities.some((entity: any) => {
        if (entity.type === 'venue' && entity.name) {
          return partyVenueTerms.some(term =>
            entity.name.toLowerCase().includes(term));
        }
        return false;
      });

    // 4. Check if the event title or description contains party-related terms
    const partyTerms = [
      // Basic party terms
      'party', 'club', 'nightclub', 'dance', 'dj', 'nightlife', 'festival', 'mixer',
      'gathering', 'gala', 'reception', 'happy hour', 'cocktail', 'rave', 'live music',
      'concert', 'lounge', 'vip', 'exclusive', 'pool party', 'day party', 'dance party',
      'after party', 'launch party', 'birthday party', 'singles', 'warehouse', 'underground',
      'rooftop', 'beach party', 'brunch', 'dj set', 'bottle service', 'open bar',
      'social', 'celebration', 'fiesta', 'bash', 'soiree', 'shindig', 'get-together',
      'meetup', 'mingle', 'networking', 'mixer', 'social hour', 'happy hour',
      'karaoke', 'trivia', 'game night', 'comedy', 'show', 'performance',

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

    // Use the previously calculated partyScore to determine if it's a party
    if (partyScore >= 5) {
      category = 'party';
      console.log(`[PARTY_DEBUG] Event categorized as party with score ${partyScore}`);
    }

    // 7. Check for party-related phq_labels
    const partyPhqLabels = [
      'nightlife', 'entertainment', 'music', 'performing-arts', 'food-and-beverage',
      'community-and-culture', 'lifestyle', 'fashion-and-style'
    ];

    const hasPartyPhqLabels = event.phq_labels && Array.isArray(event.phq_labels) &&
      event.phq_labels.some((labelObj: any) =>
        labelObj && labelObj.label && partyPhqLabels.includes(labelObj.label));

    // 8. Check if the event is in a party-related category
    const partyRelatedCategories = ['concerts', 'festivals', 'community', 'performing-arts', 'expos', 'conferences'];
    const isPartyRelatedCategory = event.category && partyRelatedCategories.includes(event.category);

    // Log party detection for debugging
    console.log(`[PARTY_DEBUG] PredictHQ Event: ${event.title}, Category: ${category}, Score: ${partyScore}`);
    console.log(`[PARTY_DEBUG] Detection results: Score=${partyScore}, Category=${event.category}`);

    // Use the weighted scoring system to determine if it's a party
    if (partyScore >= 5) {
      category = 'party';
      partySubcategory = detectPartySubcategory(event.title, event.description, time);
      console.log(`[PARTY_DEBUG] ✅ PredictHQ event categorized as party with score ${partyScore} and subcategory: ${partySubcategory}`);
    }

    // Determine party subcategory if it's a party
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

      console.log(`[PARTY_DEBUG] ✅ Event categorized as ${partySubcategory} party with score ${partyScore}`);
    }

    // If not a party, determine other categories
    if (category === 'other') {
      if (event.category === 'concerts' || event.category === 'festivals') {
        category = 'music';
      } else if (event.category === 'sports') {
        category = 'sports';
      } else if (event.category === 'performing-arts' || event.category === 'arts') {
        category = 'arts';
      } else if (event.category === 'community' || event.category === 'family') {
        category = 'family';
      } else if (event.category === 'food-drink' || event.category === 'food') {
        category = 'food';
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

    // Get ticket URL and price information
    let ticketUrl = '';
    let ticketPrices: { min?: number; max?: number; currency?: string } = {};
    
    console.log('[PREDICTHQ_TICKET_DEBUG] Attempting to extract ticket information');
    
    // Try to get ticket information from ticket_info
    if (event.ticket_info) {
      if (event.ticket_info.links && Array.isArray(event.ticket_info.links)) {
        // Get the first valid ticket URL
        const ticketLink = event.ticket_info.links.find(link => link && typeof link === 'string');
        if (ticketLink) {
          ticketUrl = ticketLink;
          console.log(`[PREDICTHQ_TICKET_DEBUG] Found ticket URL in ticket_info.links: ${ticketUrl}`);
        }
      }
      
      // Extract price information if available
      if (event.ticket_info.minimum_price || event.ticket_info.maximum_price) {
        ticketPrices = {
          min: event.ticket_info.minimum_price,
          max: event.ticket_info.maximum_price,
          currency: event.ticket_info.currency
        };
        console.log('[PREDICTHQ_TICKET_DEBUG] Found ticket prices:', ticketPrices);
      }
    }
    
    // If no ticket URL found in ticket_info, try to get it from websites array
    if (!ticketUrl && event.websites && Array.isArray(event.websites)) {
      // Look for ticket-related websites
      const ticketSite = event.websites.find(site => 
        site && typeof site === 'object' && 
        site.url && typeof site.url === 'string' && 
        (site.type === 'tickets' || site.type === 'booking'));
      
      if (ticketSite) {
        ticketUrl = ticketSite.url;
        console.log(`[PREDICTHQ_TICKET_DEBUG] Found ticket URL in websites: ${ticketUrl}`);
      }
    }
    
    // Get image URL
    let imageUrl = getEventImage(event);
    let imageAlt = event.title || 'Event image';
    let additionalImages: string[] = [];
    
    console.log('[PREDICTHQ_IMAGE_DEBUG] Attempting to extract images');
    
    // Debug the available image sources
    console.log('[PREDICTHQ_IMAGE_DEBUG] Available image sources:', {
      hasEventImages: !!(event.images && Array.isArray(event.images) && event.images.length > 0),
      eventImagesCount: event.images && Array.isArray(event.images) ? event.images.length : 0,
      hasEntities: !!(event.entities && Array.isArray(event.entities) && event.entities.length > 0),
      entitiesCount: event.entities && Array.isArray(event.entities) ? event.entities.length : 0,
      entityTypes: event.entities && Array.isArray(event.entities) ?
        event.entities.map(e => e.type).join(', ') : 'none',
      hasPerformers: !!(event.performers && Array.isArray(event.performers) && event.performers.length > 0),
      performersCount: event.performers && Array.isArray(event.performers) ? event.performers.length : 0
    });

    // 1. Try to get image directly from event.images
    if (event.images && Array.isArray(event.images) && event.images.length > 0) {
      // Find the first image with a valid URL
      const validImage = event.images.find(img => img && typeof img === 'object' && img.url && typeof img.url === 'string');
      
      if (validImage) {
        imageUrl = validImage.url;
        console.log(`[PREDICTHQ_IMAGE_DEBUG] Found image in event.images: ${imageUrl}`);
        
        // Store alt text if available
        if (validImage.alt) {
          imageAlt = validImage.alt;
        }
        
        // Store additional images if available (up to 5)
        additionalImages = event.images
          .filter(img => img && typeof img === 'object' && img.url && typeof img.url === 'string')
          .slice(1, 6)
          .map(img => img.url);
      }
    }

    // 2. Try to get images from entities (performers, venues, etc.)
    if ((!imageUrl || imageUrl === 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop') && event.entities && Array.isArray(event.entities)) {
      // First try to find entities with entity.entity.images (nested structure)
      for (const entity of event.entities) {
        // Check for nested entity structure first (entity.entity.images)
        if (entity && entity.entity && entity.entity.images &&
            Array.isArray(entity.entity.images) && entity.entity.images.length > 0) {
          
          const validImage = entity.entity.images.find(img =>
            img && typeof img === 'object' && img.url && typeof img.url === 'string');
          
          if (validImage) {
            imageUrl = validImage.url;
            console.log(`[PREDICTHQ_IMAGE_DEBUG] Found image in entity.entity.images: ${imageUrl}`);
            
            if (validImage.alt) {
              imageAlt = validImage.alt;
            }
            
            // Store additional images
            additionalImages = entity.entity.images
              .filter(img => img && typeof img === 'object' && img.url && typeof img.url === 'string')
              .slice(1, 6)
              .map(img => img.url);
            
            break;
          }
        }
        
        // Then check for direct entity.images
        if ((!imageUrl || imageUrl === 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop') &&
            entity && entity.images && Array.isArray(entity.images) && entity.images.length > 0) {
          
          const validImage = entity.images.find(img =>
            img && typeof img === 'object' && img.url && typeof img.url === 'string');
          
          if (validImage) {
            imageUrl = validImage.url;
            console.log(`[PREDICTHQ_IMAGE_DEBUG] Found image in entity.images: ${imageUrl}`);
            
            if (validImage.alt) {
              imageAlt = validImage.alt;
            }
            
            // Store additional images
            additionalImages = entity.images
              .filter(img => img && typeof img === 'object' && img.url && typeof img.url === 'string')
              .slice(1, 6)
              .map(img => img.url);
            
            break;
          }
        }
      }
    }

    // 3. Try to get image from performers
    if ((!imageUrl || imageUrl === 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop') &&
        event.performers && Array.isArray(event.performers)) {
      
      for (const performer of event.performers) {
        if (performer && performer.images && Array.isArray(performer.images) && performer.images.length > 0) {
          const validImage = performer.images.find(img =>
            img && typeof img === 'object' && img.url && typeof img.url === 'string');
          
          if (validImage) {
            imageUrl = validImage.url;
            console.log(`[PREDICTHQ_IMAGE_DEBUG] Found image in performer.images: ${imageUrl}`);
            
            if (validImage.alt) {
              imageAlt = validImage.alt;
            }
            
            // Store additional images
            additionalImages = performer.images
              .filter(img => img && typeof img === 'object' && img.url && typeof img.url === 'string')
              .slice(1, 6)
              .map(img => img.url);
            
            break;
          }
        }
      }
    }

    // 4. Try to get image from phq_venue if available
    if ((!imageUrl || imageUrl === 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop') &&
        event.phq_venue && event.phq_venue.images &&
        Array.isArray(event.phq_venue.images) && event.phq_venue.images.length > 0) {
      
      const validImage = event.phq_venue.images.find(img =>
        img && typeof img === 'object' && img.url && typeof img.url === 'string');
      
      if (validImage) {
        imageUrl = validImage.url;
        console.log(`[PREDICTHQ_IMAGE_DEBUG] Found image in phq_venue.images: ${imageUrl}`);
        
        if (validImage.alt) {
          imageAlt = validImage.alt;
        }
        
        // Store additional images
        additionalImages = event.phq_venue.images
          .filter(img => img && typeof img === 'object' && img.url && typeof img.url === 'string')
          .slice(1, 6)
          .map(img => img.url);
      }
    }

    // Category-based fallback images
    const categoryImages = {
      'music': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
      'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
      'arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
      'family': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
      'food': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop',
      'party': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop'
    };

    // Use category image if no event image was found
    if ((!imageUrl || imageUrl === 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop') &&
        category !== 'other' && categoryImages[category]) {
      imageUrl = categoryImages[category];
      console.log(`[PREDICTHQ_IMAGE_DEBUG] Using category fallback image for ${category}: ${imageUrl}`);
    }

    // Add rank and local impact data
    const rank = event.rank || 0;
    const localRelevance = event.local_rank || 0;
    const attendance = {
      forecast: event.phq_attendance || undefined,
      actual: event.actual_attendance || undefined
    };
    const demandSurge = event.labels?.includes('demand_surge') ? 1 : 0;

    // Process ticket information
    console.log('[PREDICTHQ_TICKET_DEBUG] Attempting to extract ticket information');
    
    // Debug the available ticket sources
    console.log('[PREDICTHQ_TICKET_DEBUG] Available ticket sources:', {
      hasTicketInfo: !!event.ticket_info,
      ticketInfoType: event.ticket_info ? typeof event.ticket_info : 'undefined',
      hasWebsites: !!(event.websites && Array.isArray(event.websites) && event.websites.length > 0),
      websitesCount: event.websites && Array.isArray(event.websites) ? event.websites.length : 0,
      websiteTypes: event.websites && Array.isArray(event.websites) ?
        event.websites.map(w => w.type).join(', ') : 'none',
      hasUrl: !!event.url,
      urlType: event.url ? typeof event.url : 'undefined'
    });
    
    // Define ticket info and websites with proper types
    let ticketInfo: {
      price?: string;
      minPrice?: number;
      maxPrice?: number;
      currency?: string;
      availability?: string;
      purchaseUrl?: string;
      provider?: string;
    } | undefined = undefined;
    
    // 1. Process ticket_info if available
    if (event.ticket_info && typeof event.ticket_info === 'object') {
      ticketInfo = {
        price: event.ticket_info.price,
        minPrice: typeof event.ticket_info.minimum_price === 'number' ? event.ticket_info.minimum_price : undefined,
        maxPrice: typeof event.ticket_info.maximum_price === 'number' ? event.ticket_info.maximum_price : undefined,
        currency: event.ticket_info.currency,
        availability: event.ticket_info.availability,
        purchaseUrl: event.ticket_info.url || event.ticket_info.link || event.ticket_info.purchase_url,
        provider: event.ticket_info.provider
      };
      
      if (ticketInfo.purchaseUrl) {
        console.log(`[PREDICTHQ_TICKET_DEBUG] Found purchase URL in ticket_info: ${ticketInfo.purchaseUrl}`);
      }
    }

    // 2. Process website information
    let websites: {
      official?: string;
      tickets?: string;
      venue?: string;
    } | undefined = undefined;
    
    // Check for websites in the main event object
    if (event.websites && Array.isArray(event.websites) && event.websites.length > 0) {
      websites = {};

      // Process each website by type
      for (const site of event.websites) {
        if (site && typeof site === 'object' && site.url && typeof site.url === 'string') {
          if (site.type === 'official') {
            websites.official = site.url;
            console.log(`[PREDICTHQ_TICKET_DEBUG] Found official website: ${site.url}`);
          } else if (site.type === 'tickets' || site.type === 'purchase') {
            websites.tickets = site.url;
            console.log(`[PREDICTHQ_TICKET_DEBUG] Found tickets website: ${site.url}`);
          } else if (site.type === 'venue') {
            websites.venue = site.url;
            console.log(`[PREDICTHQ_TICKET_DEBUG] Found venue website: ${site.url}`);
          }
        }
      }
    }
    
    // 3. Check for websites in entities
    if ((!websites || !websites.tickets) && event.entities && Array.isArray(event.entities)) {
      if (!websites) {
        websites = {};
      }
      
      // First check for nested entity structure first (entity.entity.websites)
      for (const entity of event.entities) {
        if (entity && entity.entity && entity.entity.websites &&
            Array.isArray(entity.entity.websites) && entity.entity.websites.length > 0) {
          
          for (const site of entity.entity.websites) {
            if (site && typeof site === 'object' && site.url && typeof site.url === 'string') {
              if (site.type === 'official' && !websites.official) {
                websites.official = site.url;
                console.log(`[PREDICTHQ_TICKET_DEBUG] Found official website in entity: ${site.url}`);
              } else if ((site.type === 'tickets' || site.type === 'purchase') && !websites.tickets) {
                websites.tickets = site.url;
                console.log(`[PREDICTHQ_TICKET_DEBUG] Found tickets website in entity: ${site.url}`);
              } else if (site.type === 'venue' && !websites.venue) {
                websites.venue = site.url;
                console.log(`[PREDICTHQ_TICKET_DEBUG] Found venue website in entity: ${site.url}`);
              }
            }
          }
        }
        
        // Then check for direct entity.websites
        if (entity && entity.websites && Array.isArray(entity.websites) && entity.websites.length > 0) {
          for (const site of entity.websites) {
            if (site && typeof site === 'object' && site.url && typeof site.url === 'string') {
              if (site.type === 'official' && !websites.official) {
                websites.official = site.url;
                console.log(`[PREDICTHQ_TICKET_DEBUG] Found official website in entity direct: ${site.url}`);
              } else if ((site.type === 'tickets' || site.type === 'purchase') && !websites.tickets) {
                websites.tickets = site.url;
                console.log(`[PREDICTHQ_TICKET_DEBUG] Found tickets website in entity direct: ${site.url}`);
              } else if (site.type === 'venue' && !websites.venue) {
                websites.venue = site.url;
                console.log(`[PREDICTHQ_TICKET_DEBUG] Found venue website in entity direct: ${site.url}`);
              }
            }
          }
        }
      }
    }

    // 4. Check for websites in phq_venue
    if ((!websites || Object.keys(websites).length === 0) &&
        event.phq_venue && event.phq_venue.websites &&
        Array.isArray(event.phq_venue.websites) && event.phq_venue.websites.length > 0) {
      
      if (!websites) {
        websites = {};
      }
      
      for (const site of event.phq_venue.websites) {
        if (site && typeof site === 'object' && site.url && typeof site.url === 'string') {
          if (site.type === 'official' && !websites.official) {
            websites.official = site.url;
            console.log(`[PREDICTHQ_TICKET_DEBUG] Found official website in phq_venue: ${site.url}`);
          } else if ((site.type === 'tickets' || site.type === 'purchase') && !websites.tickets) {
            websites.tickets = site.url;
            console.log(`[PREDICTHQ_TICKET_DEBUG] Found tickets website in phq_venue: ${site.url}`);
          }
        }
      }
    }

    // Determine the best URL to use
    let bestUrl = event.url;

    // If we have ticket info with a URL, use that
    if (ticketInfo?.purchaseUrl) {
      bestUrl = ticketInfo.purchaseUrl;
      console.log(`[PREDICTHQ_TICKET_DEBUG] Using ticket_info.purchaseUrl as best URL: ${bestUrl}`);
    }
    // Otherwise if we have a tickets website, use that
    else if (websites?.tickets) {
      bestUrl = websites.tickets;
      console.log(`[PREDICTHQ_TICKET_DEBUG] Using websites.tickets as best URL: ${bestUrl}`);
    }
    // Otherwise if we have an official website, use that
    else if (websites?.official) {
      bestUrl = websites.official;
      console.log(`[PREDICTHQ_TICKET_DEBUG] Using websites.official as best URL: ${bestUrl}`);
    } else if (bestUrl) {
      console.log(`[PREDICTHQ_TICKET_DEBUG] Using event.url as best URL: ${bestUrl}`);
    } else {
      console.log('[PREDICTHQ_TICKET_DEBUG] No URL found for event');
    }

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
      imageAlt,
      additionalImages,
      ticketUrl: bestUrl || '',
      ticketPrices: ticketInfo ? {
        min: ticketInfo.minPrice,
        max: ticketInfo.maxPrice,
        currency: ticketInfo.currency
      } : undefined,
      additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
      coordinates,
      url: bestUrl,
      price: event.ticket_info?.price,
      ticketInfo,
      websites,
      // Add PredictHQ specific fields
      rank,
      localRelevance,
      attendance,
      demandSurge
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
      imageAlt: 'Event image placeholder',
      url: event?.url || undefined,
      ticketInfo: undefined,
      websites: undefined,
      rank: 0,
      localRelevance: 0,
      attendance: {
        forecast: undefined,
        actual: undefined
      },
      demandSurge: 0
    };
    return errorEvent;
  }
}
