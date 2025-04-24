/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/api/events/search-events
 */

import { Event, PartySubcategory } from './types.ts';
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

/**
 * PredictHQ API response interface
 */
export interface PredictHQResponse {
  events: Event[];
  error: string | null;
  status: number;
  warnings: string[];
}

export async function fetchPredictHQEvents(params: PredictHQParams): Promise<PredictHQResponse> {
  // Validate input parameters
  if (!params) {
    console.error('[PREDICTHQ] Missing parameters');
    return {
      events: [],
      error: 'Missing parameters',
      status: 400,
      warnings: []
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
    radius = 25,
    startDate,
    endDate,
    categories = [],
    location,
    withinParam,
    keyword,
    limit = 100
  } = params;

  try {
    // Validate API key
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      console.error('[PREDICTHQ_AUTH_ERROR] Invalid or missing API key.');
      return {
        events: [],
        error: 'PredictHQ API key is missing or invalid. Check server configuration.',
        status: 401,
        warnings: []
      };
    }

    // Log API key details for debugging (safely)
    console.log(`[PREDICTHQ_AUTH_DEBUG] API Key provided (length ${apiKey.length}, starts with ${apiKey.substring(0, 4)}...).`);

    // Build the PredictHQ API URL
    let url = 'https://api.predicthq.com/v1/events/';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add location parameters
    if (withinParam) {
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using provided 'within' parameter: ${withinParam}`);
    } else if (latitude && longitude) {
      const radiusKm = Math.round(radius * 1.60934);
      queryParams.append('within', `${radiusKm}km@${latitude},${longitude}`);
      console.log(`[PREDICTHQ] Using lat/lng ${latitude},${longitude} with radius ${radiusKm}km.`);
    } else if (location) {
      queryParams.append('place.name', location.trim());
      console.log(`[PREDICTHQ] Using location string as place name: "${location}"`);
    } else {
      const defaultLocation = 'New York';
      queryParams.append('place.name', defaultLocation);
      console.log(`[PREDICTHQ] No location info provided, using default place name: "${defaultLocation}".`);
    }

    // Add date range
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    // Use active.gte instead of start.gte for better event relevance
    queryParams.append('active.gte', startDate || todayIso);
    console.log(`[PREDICTHQ] Filtering events active on or after: ${startDate || todayIso}`);

    if (endDate) {
      // Use active.lte instead of end.lte
      queryParams.append('active.lte', `${endDate}T23:59:59`);
      console.log(`[PREDICTHQ] Filtering events active on or before: ${endDate}`);
    }

    // Add sort parameter
    queryParams.append('sort', 'start');

    // Handle party category specially
    let phqCategories: string[] = [];
    let phqLabels: string[] = [];
    let phqKeyword = keyword;

    if (categories.includes('party')) {
      console.log('[PARTY_DEBUG] Party category requested - enhancing PredictHQ parameters');

      // Add party-related categories based on latest API documentation
      phqCategories = ['concerts', 'festivals', 'community', 'conferences', 'performing-arts', 'expos'];

      // Add party-related labels based on latest API documentation
      phqLabels = [
        // Nightlife and party-specific labels
        'nightlife', 'party', 'club', 'dance-party', 'dj-set', 'social-gathering', 'celebration', 'mixer',
        'day-party', 'brunch', 'rooftop-party', 'pool-party', 'yacht-party', 'themed-party', 'immersive',
        'popup', 'silent', 'networking', 'happy-hour',

        // Additional entertainment labels that often indicate party events
        'entertainment', 'music', 'live-music', 'dance', 'food-drink', 'alcohol'
      ];

      // Add party-related keywords
      if (!phqKeyword || !phqKeyword.toLowerCase().includes('party')) {
        const partyKeywords = 'party OR club OR nightlife OR dj OR dance OR festival OR concert OR music OR lounge OR bar OR venue OR mixer OR gathering OR gala OR reception OR meetup OR "happy hour" OR cocktail OR rave OR "live music" OR "themed party" OR "costume party" OR "masquerade" OR "holiday party" OR "new years party" OR "halloween party" OR "summer party" OR "winter party" OR "spring party" OR "fall party" OR "seasonal party" OR "annual party" OR "live dj" OR "live band" OR "live performance" OR "music venue" OR "dance venue" OR "nightclub venue" OR "lounge venue" OR "bar venue" OR "club night" OR "dance night" OR "party night" OR "night life" OR "social mixer" OR "networking event" OR "singles event" OR "mingling" OR "daytime event" OR "pool event" OR "rooftop event" OR "outdoor event" OR social OR gathering OR mixer OR networking OR meetup OR singles OR dating OR "speed dating" OR mingling OR celebration OR gala OR reception OR "cocktail party" OR "happy hour"';
        phqKeyword = phqKeyword ? `${phqKeyword} OR ${partyKeywords}` : partyKeywords;
      }
    } else {
      // Map our categories to PredictHQ categories
      const categoryMap: Record<string, string[]> = {
        'music': ['concerts', 'festivals', 'performing-arts'],
        'sports': ['sports'],
        'arts': ['performing-arts', 'expos', 'community'],
        'family': ['community', 'expos'],
        'food': ['community']
      };

      // Collect PHQ categories based on requested frontend categories
      categories.forEach(cat => {
        const mapped = categoryMap[cat.toLowerCase()];
        if (mapped) {
          phqCategories.push(...mapped);
        }
      });
    }

    // Add category filters
    if (phqCategories.length > 0) {
      // Remove duplicates
      phqCategories = Array.from(new Set(phqCategories));
      queryParams.append('category', phqCategories.join(','));
      console.log(`[PREDICTHQ] Filtering by categories: ${phqCategories.join(',')}`);
    }

    // Add label filters
    if (phqLabels.length > 0) {
      phqLabels = Array.from(new Set(phqLabels));
      phqLabels.forEach(label => queryParams.append('phq_label', label));
      queryParams.append('phq_label.op', 'any');
      console.log(`[PREDICTHQ] Filtering by labels: ${phqLabels.join(',')}`);
    }

    // Add keyword search
    if (phqKeyword) {
      queryParams.append('q', phqKeyword);
      console.log(`[PREDICTHQ] Filtering by keyword: "${phqKeyword.substring(0, 50)}..."`);
    }

    // Add limit parameter
    queryParams.append('limit', limit.toString());
    console.log(`[PREDICTHQ] Using limit: ${limit}`);

    // Add include parameters for additional data
    // Updated to include all relevant fields based on latest API documentation
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images,websites,entities.entity.websites,entities.entity.images,phq_labels,predicted_event_spend');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    console.log('[PREDICTHQ] Final API URL:', url);
    console.log('[PREDICTHQ_DEBUG] Full request parameters:', {
      apiKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET',
      latitude,
      longitude,
      radius,
      startDate,
      endDate,
      categories,
      location,
      withinParam,
      keyword,
      limit,
      phqCategories,
      phqLabels
    });

    // Make the API request with proper error handling
    let response: Response;
    try {
      // Create a controller for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort('PredictHQ API call timed out after 15 seconds');
      }, 15000);

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

      // Log response headers for debugging
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('[PREDICTHQ] API response headers:', headers);
    } catch (fetchError) {
      console.error('[PREDICTHQ_FETCH_ERROR] Fetch error:', fetchError);
      let errorMsg = `PredictHQ API fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        errorMsg = fetchError.message;
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

      let warnings: string[] = [];

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          console.error('[PREDICTHQ_API_ERROR] Error details:', errorJson.error);
          warnings.push(String(errorJson.error));
        }
        if (errorJson.warnings) {
          console.warn('[PREDICTHQ_API_WARN] API warnings:', errorJson.warnings);
          warnings = warnings.concat(errorJson.warnings);
        }
      } catch (e) {
        // If not JSON, include the raw text
        console.error('[PREDICTHQ_API_ERROR] Raw error text:', errorText.substring(0, 200));
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
      return {
        events: [],
        error: 'Failed to parse PredictHQ API response',
        status: 500,
        warnings: ['Response parsing failed']
      };
    }

    console.log('[PREDICTHQ_DEBUG] API response parsed:', {
      count: data.count,
      resultsCount: data.results?.length || 0,
      next: !!data.next,
      previous: !!data.previous,
      warnings: data.warnings
    });

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
      warnings: data.warnings || []
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error);
    }
    console.error('[PREDICTHQ] Error fetching events:', errorMessage);

    return {
      events: [],
      error: errorMessage,
      status: 500,
      warnings: []
    };
  }
}

/**
 * Normalize a PredictHQ event to our standard format
 */
function normalizePredictHQEvent(event: any): Event {
  try {
    // Extract date and time
    const startDate = event.start || new Date().toISOString();
    const date = startDate.split('T')[0];
    const time = startDate.split('T')[1]?.substring(0, 5) || '00:00';

    // Extract location
    let location = 'Location not specified';
    const locationParts: string[] = [];

    // Add venue name if available
    const venueEntity = event.entities?.find((e: any) => e.type === 'venue');
    const venueName = venueEntity?.name || event.phq_venue?.name;
    if (venueName) {
      locationParts.push(String(venueName));
    }

    // Add place name if available
    if (event.place?.name) {
      locationParts.push(String(event.place.name));
    }

    // Add state if available
    if (event.state) {
      locationParts.push(String(event.state));
    }

    // Build final location string
    if (locationParts.length > 0) {
      location = locationParts.join(', ');
    }

    // Extract venue
    const venue = venueName || event.title;

    // Extract coordinates
    let coordinates: [number, number] | undefined = undefined;
    if (event.location && Array.isArray(event.location) && event.location.length === 2) {
      coordinates = [event.location[0], event.location[1]];
    }

    // Map category
    let category = 'other';
    if (event.category) {
      // Improved category mapping based on PredictHQ categories
      switch (event.category) {
        // Music-related categories
        case 'concerts':
        case 'festivals':
        case 'music':
          category = 'music';
          break;

        // Sports-related categories
        case 'sports':
        case 'sport':
          category = 'sports';
          break;

        // Arts-related categories
        case 'performing-arts':
        case 'expos':
        case 'exhibitions':
        case 'arts':
        case 'conferences':
          category = 'arts';
          break;

        // Family-related categories
        case 'community':
        case 'family':
        case 'children':
        case 'school-holidays':
          category = 'family';
          break;

        // Food-related categories
        case 'food-drink':
        case 'food':
        case 'dining':
          category = 'food';
          break;

        // Other categories that don't fit neatly
        case 'observances':
        case 'public-holidays':
        case 'politics':
        case 'health-warnings':
        case 'daylight-savings':
        default:
          category = 'other';
          break;
      }
    }

    // Check if this is a party event
    let partySubcategory: PartySubcategory | undefined = undefined;
    const isPartyByDetection = detectPartyEvent(event.title, event.description);

    // Check if the event has party-related labels
    const hasPartyLabels = event.labels && Array.isArray(event.labels) &&
      event.labels.some((label: string) => label.includes('party') || label.includes('nightlife') || label.includes('club'));

    // Check if the event title or description contains party-related terms
    const lowerTitle = (event.title || '').toLowerCase();
    const lowerDesc = (event.description || '').toLowerCase();
    const combinedText = `${lowerTitle} ${lowerDesc}`;

    const hasPartyTerms = ['party', 'club', 'nightlife', 'dj', 'dance'].some(term => combinedText.includes(term));

    // If any of our party detection methods return true, categorize as a party
    if (isPartyByDetection || hasPartyLabels || hasPartyTerms) {
      category = 'party';
      partySubcategory = detectPartySubcategory(event.title, event.description, time);
    }

    // Get image URL
    let imageUrl = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
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

    return {
      id: `predicthq-${event.id}`,
      source: 'predicthq',
      title: event.title,
      description: event.description || `Event on ${date} at ${location}`,
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
      rank,
      localRelevance,
      attendance,
      demandSurge
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);

    // Return a minimal valid event
    const errorEvent: Event = {
      id: `predicthq-error-${Date.now()}`,
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
      demandSurge: 0
    };
    return errorEvent;
  }
}
