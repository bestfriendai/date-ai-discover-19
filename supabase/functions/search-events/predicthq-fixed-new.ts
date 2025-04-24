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
      const radiusKm = Math.round(Number(radius) * 1.60934); // Convert miles to km, ensure radius is a number
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

    // Map application categories to valid PredictHQ categories
    let phqCategories: string[] = [];
    let phqLabels: string[] = [];
    let phqKeyword = keyword;

    // Define a mapping from application categories to valid PredictHQ categories
    const categoryMapping: Record<string, string[]> = {
      'music': ['concerts', 'festivals'],
      'sports': ['sports'],
      'arts': ['performing-arts', 'expos', 'conferences'],
      'family': ['community', 'school-holidays'],
      'food': ['community', 'expos'],
      'party': ['concerts', 'festivals', 'performing-arts', 'community', 'expos', 'conferences'],
      'conference': ['conferences'],
      'community': ['community']
    };

    // Define a mapping from application categories to PredictHQ labels
    const labelMapping: Record<string, string[]> = {
      'music': ['music', 'entertainment'],
      'sports': ['sport'],
      'arts': ['entertainment', 'arts'],
      'family': ['family-friendly'],
      'food': ['food'],
      'party': ['nightlife', 'music', 'entertainment'],
      'conference': ['business'],
      'community': ['community']
    };

    // Special handling for party category
    if (categories.includes('party')) {
      console.log('[PARTY_DEBUG] Party category requested - enhancing PredictHQ parameters');

      // Add party-related categories based on latest API documentation
      phqCategories = categoryMapping['party'];

      // Add party-related labels
      phqLabels = labelMapping['party'];

      // Enhance keyword search for parties if no keyword is provided
      if (!phqKeyword) {
        phqKeyword = 'party OR club OR nightlife OR festival OR dance OR dj';
      } else {
        // Add party-related terms to existing keyword
        phqKeyword = `${phqKeyword} OR party OR club OR nightlife OR festival OR dance OR dj`;
      }

      console.log('[PARTY_DEBUG] Enhanced PredictHQ parameters:', {
        categories: phqCategories,
        labels: phqLabels,
        keyword: phqKeyword
      });
    } else if (categories.length > 0) {
      // Map application categories to valid PredictHQ categories
      const mappedCategories = new Set<string>();
      const mappedLabels = new Set<string>();

      categories.forEach(category => {
        if (categoryMapping[category]) {
          categoryMapping[category].forEach(phqCategory => mappedCategories.add(phqCategory));
        }
        if (labelMapping[category]) {
          labelMapping[category].forEach(label => mappedLabels.add(label));
        }
      });

      phqCategories = Array.from(mappedCategories);
      phqLabels = Array.from(mappedLabels);

      console.log('[PREDICTHQ] Mapped categories:', {
        originalCategories: categories,
        mappedCategories: phqCategories,
        mappedLabels: phqLabels
      });
    } else {
      // Use default categories if none provided
      phqCategories = [
        'concerts', 'conferences', 'expos', 'festivals', 'performing-arts', 'sports', 'community'
      ];
    }

    // Add categories parameter
    if (phqCategories.length > 0) {
      queryParams.append('category', phqCategories.join(','));
    }

    // Add labels parameter
    if (phqLabels.length > 0) {
      queryParams.append('label', phqLabels.join(','));
    }

    // Add keyword parameter
    if (phqKeyword) {
      queryParams.append('q', phqKeyword);
    }

    // Add limit parameter
    queryParams.append('limit', limit.toString());

    // Build the complete URL
    const apiUrl = `${url}?${queryParams.toString()}`;
    console.log(`[PREDICTHQ] API URL: ${apiUrl}`);

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PREDICTHQ] API error: ${response.status} ${errorText}`);
      return {
        events: [],
        error: `PredictHQ API error: ${response.status} ${errorText}`,
        status: response.status,
        warnings: []
      };
    }

    // Parse the response
    const data = await response.json();
    console.log(`[PREDICTHQ] API response: ${data.count} events found`);

    // Check if results were returned
    if (!data.results || !Array.isArray(data.results)) {
      console.log('[PREDICTHQ] No events found or invalid response format');
      return {
        events: [],
        error: null,
        status: 200,
        warnings: ['No events found or invalid response format']
      };
    }

    // Transform PredictHQ events to our Event format
    const events: Event[] = [];
    for (const result of data.results) {
      try {
        const event = normalizePredictHQEvent(result);
        events.push(event);
      } catch (error) {
        console.error('[PREDICTHQ] Error normalizing event:', error);
      }
    }

    console.log(`[PREDICTHQ] Transformed ${events.length} events`);

    return {
      events,
      error: null,
      status: 200,
      warnings: []
    };
  } catch (error) {
    console.error('[PREDICTHQ] Error fetching events:', error);
    return {
      events: [],
      error: `Error fetching PredictHQ events: ${error instanceof Error ? error.message : String(error)}`,
      status: 500,
      warnings: ['Error processing API response']
    };
  }
}

// Normalize a PredictHQ event to our standard format
function normalizePredictHQEvent(event: any): Event {
  try {
    // Extract basic event information
    const id = event.id;
    const title = event.title;
    const description = event.description || '';

    // Extract date and time
    const start = event.start ? new Date(event.start) : new Date();
    const date = start.toISOString().split('T')[0];
    const time = start.toISOString().split('T')[1].substring(0, 5);

    // Extract location information
    const location = event.entities && event.entities.length > 0
      ? event.entities.map((e: any) => e.name).join(', ')
      : event.place_hierarchies && event.place_hierarchies.length > 0 && event.place_hierarchies[0].length > 0
        ? event.place_hierarchies[0].slice(-2).join(', ')
        : 'Location unavailable';

    // Extract venue information
    const venue = event.entities && event.entities.length > 0
      ? event.entities[0].name
      : '';

    // Extract coordinates
    let coordinates: [number, number] | undefined = undefined;
    if (event.location && Array.isArray(event.location)) {
      // PredictHQ returns coordinates as [longitude, latitude]
      coordinates = [event.location[0], event.location[1]];
    }

    // Determine category
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
