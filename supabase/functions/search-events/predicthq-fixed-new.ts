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

    // Add location parameters with improved handling
    if (withinParam) {
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using provided 'within' parameter: ${withinParam}`);
    } else if (latitude && longitude) {
      // Ensure radius is a number and convert to km
      const radiusKm = Math.round(Number(radius) * 1.60934);
      // Use a minimum radius of 40km (approximately 25 miles) to ensure we get enough events
      const finalRadiusKm = Math.max(radiusKm, 40);
      queryParams.append('within', `${finalRadiusKm}km@${latitude},${longitude}`);
      console.log(`[PREDICTHQ] Using lat/lng ${latitude},${longitude} with radius ${finalRadiusKm}km (original: ${radiusKm}km).`);
    } else if (location) {
      // If we have a location string but no coordinates, use place.name and a larger radius
      queryParams.append('place.name', location.trim());
      console.log(`[PREDICTHQ] Using location string as place name: "${location}"`);

      // Add a default radius around the place name to ensure we get enough events
      queryParams.append('within', '80km@place.name');
      console.log(`[PREDICTHQ] Adding default 80km radius around place name.`);
    } else {
      const defaultLocation = 'New York';
      queryParams.append('place.name', defaultLocation);
      console.log(`[PREDICTHQ] No location info provided, using default place name: "${defaultLocation}".`);

      // Add a default radius around the default location
      queryParams.append('within', '80km@place.name');
      console.log(`[PREDICTHQ] Adding default 80km radius around default place.`);
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

    // Enhanced mapping from application categories to valid PredictHQ categories
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

    // Enhanced mapping from application categories to PredictHQ labels
    const labelMapping: Record<string, string[]> = {
      'music': ['music', 'entertainment'],
      'sports': ['sport'],
      'arts': ['entertainment', 'arts'],
      'family': ['family-friendly'],
      'food': ['food'],
      'party': ['nightlife', 'music', 'entertainment', 'social', 'dance'],
      'conference': ['business'],
      'community': ['community']
    };

    // Enhanced party event detection
    if (categories.includes('party')) {
      console.log('[PARTY_DEBUG] Party category requested - applying enhanced detection');

      // Add party-related categories based on latest API documentation
      phqCategories = categoryMapping['party'];

      // Add expanded party-related labels
      phqLabels = labelMapping['party'];

      // Comprehensive list of party-related keywords
      const partyKeywords = [
        'party', 'club', 'nightlife', 'festival', 'dance', 'dj',
        'celebration', 'mixer', 'social', 'gala', 'bash', 'rave',
        'disco', 'lounge', 'nightclub', 'rooftop', 'entertainment'
      ];

      // Enhance keyword search with expanded terms
      if (!phqKeyword) {
        phqKeyword = partyKeywords.join(' OR ');
      } else {
        // Combine user keywords with party keywords
        phqKeyword = `${phqKeyword} OR ${partyKeywords.join(' OR ')}`;
      }

      // Add rank boost for party-related events
      queryParams.append('rank.boost', 'local_rank,1.5');
      queryParams.append('rank.boost', 'category_rank,1.3');
      queryParams.append('rank.boost', 'attendance_rank,1.2');

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
function normalizePredictHQEvent(event: any): Event | null { // --- FIX 3a: Return null on error ---
  try {
    // Validate essential properties
    if (!event || !event.id || !event.title) {
       console.warn('[PREDICTHQ_NORM] Skipping event due to missing essential fields:', event);
       return null; // Skip if missing ID or title
    }

    // Extract date and time - use fallback if missing
    const startDateStr = event.start || new Date().toISOString();
    const date = startDateStr.split('T')[0] || 'Date TBA';
    const time = startDateStr.split('T')[1]?.substring(0, 5) || 'Time TBA';

    // --- FIX 3b: Extract location and venue more robustly ---
    let location = 'Location not specified';
    let venue = 'Venue not specified';

    const venueEntity = event.entities?.find((e: any) => e.type === 'venue');

    // Prioritize venue name from entity or PHQ specific field
    venue = venueEntity?.name || event.phq_venue?.name || 'Venue not specified';

    // Build location string - prioritize address, then place, then general location name
    const locationParts: string[] = [];

    if (venueEntity?.formatted_address) {
       locationParts.push(String(venueEntity.formatted_address));
    } else if (event.phq_venue?.address) {
       locationParts.push(String(event.phq_venue.address));
    } else if (event.location_name) {
       locationParts.push(String(event.location_name));
    }

    // Add city, state, country if available and not already covered by formatted_address
    const city = event.place?.name;
    const state = event.state;
    const country = event.country;

    if (city && !locationParts.some(p => p.includes(city))) locationParts.push(String(city));
    if (state && !locationParts.some(p => p.includes(state))) locationParts.push(String(state));
    if (country && country !== 'US' && !locationParts.some(p => p.includes(country))) locationParts.push(String(country));

    // Use venue name as location if no other parts found
    if (locationParts.length === 0 && venue !== 'Venue not specified') {
        location = venue;
    } else if (locationParts.length > 0) {
       // Remove duplicates and build string
       location = Array.from(new Set(locationParts)).join(', ');
    }

    // If still 'Location not specified' and we have coordinates, use them as fallback string
    if (location === 'Location not specified' && event.location && Array.isArray(event.location) && event.location.length === 2) {
        location = `Coordinates: ${event.location[1].toFixed(4)}, ${event.location[0].toFixed(4)}`;
    }
    // --- END FIX 3b ---


    // --- FIX 3c: Extract and validate coordinates robustly ---
    let coordinates: [number, number] | undefined = undefined;

    // Prioritize event.location (most reliable for point events)
    if (event.location && Array.isArray(event.location) && event.location.length === 2 &&
        typeof event.location[0] === 'number' && typeof event.location[1] === 'number' &&
        !isNaN(event.location[0]) && !isNaN(event.location[1])) {
      // PredictHQ returns [longitude, latitude] which matches our format
      coordinates = [event.location[0], event.location[1]];
    }
    // If event.location is not point coordinates, try geo.geometry (e.g., polygons)
    else if (event.geo?.geometry?.type === 'Point' && event.geo.geometry.coordinates && Array.isArray(event.geo.geometry.coordinates) && event.geo.geometry.coordinates.length === 2 &&
             typeof event.geo.geometry.coordinates[0] === 'number' && typeof event.geo.geometry.coordinates[1] === 'number' &&
             !isNaN(event.geo.geometry.coordinates[0]) && !isNaN(event.geo.geometry.coordinates[1])) {
        coordinates = [event.geo.geometry.coordinates[0], event.geo.geometry.coordinates[1]];
    }
    // If no coordinates yet, try the venue entity coordinates
    else if (venueEntity?.coordinates && Array.isArray(venueEntity.coordinates) && venueEntity.coordinates.length === 2 &&
             typeof venueEntity.coordinates[0] === 'number' && typeof venueEntity.coordinates[1] === 'number' &&
             !isNaN(venueEntity.coordinates[0]) && !isNaN(venueEntity.coordinates[1])) {
        coordinates = [venueEntity.coordinates[0], venueEntity.coordinates[1]];
    }
    // If no coordinates yet, try the place location
    else if (event.place?.location && Array.isArray(event.place.location) && event.place.location.length === 2 &&
             typeof event.place.location[0] === 'number' && typeof event.place.location[1] === 'number' &&
             !isNaN(event.place.location[0]) && !isNaN(event.place.location[1])) {
        coordinates = [event.place.location[0], event.place.location[1]];
    }
    // --- END FIX 3c ---

    // Determine category and subcategory (Party detection logic remains similar)
    let category = 'other';
    let partySubcategory: PartySubcategory | undefined = undefined;

    // ... (Keep your existing category and party detection logic here) ...
    // Check if this is a party event
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


    // Get image URL - use fallback if none found
    const imageUrl = getEventImage(event) || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';

    // Get description - use fallback if empty after cleaning
    const description = getEventDescription(event, location) || `Event on ${date} at ${location}`;

    // Get URL
    const url = getEventUrl(event);

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
      description,
      date,
      time,
      location,
      venue,
      category,
      partySubcategory, // May be undefined
      image: imageUrl,
      coordinates, // May be undefined
      url, // May be undefined
      price: event.ticket_info?.price, // May be undefined
      rank,
      localRelevance,
      attendance,
      demandSurge
    };
  } catch (error) {
    // --- FIX 3a (continued): Log error and return null ---
    console.error('[PREDICTHQ_NORM_ERROR] Failed to normalize PredictHQ event:', event?.id || 'unknown', error);
    // Log the raw event data causing the error (truncated)
    console.error('[PREDICTHQ_NORM_ERROR] Problematic event data sample:', JSON.stringify(event || {}, null, 2).substring(0, 500) + '...');
    return null; // Indicate failure to normalize this specific event
    // --- END FIX 3a ---
  }
}

// Helper function to get event image URL
function getEventImage(event: any): string | undefined {
  if (event.images && Array.isArray(event.images) && event.images.length > 0) {
    // Prioritize images with a specific type or size if needed, otherwise take the first one
    return event.images[0].url;
  }
  return undefined;
}

// Helper function to get event description, with fallback
function getEventDescription(event: any, location: string): string | undefined {
  // Use event.description if available and not just a generic placeholder
  if (event.description && typeof event.description === 'string' && event.description.trim() !== '') {
    return event.description.trim();
  }
  // Fallback to a generated description if no description is available
  const date = event.start ? new Date(event.start).toISOString().split('T')[0] : 'Date TBA';
  return `Event on ${date} at ${location}`;
}

// Helper function to get event URL
function getEventUrl(event: any): string | undefined {
  // PredictHQ provides a url field
  if (event.url && typeof event.url === 'string' && event.url.trim() !== '') {
    return event.url.trim();
  }
  // Check for ticket_info url as a fallback
  if (event.ticket_info?.url && typeof event.ticket_info.url === 'string' && event.ticket_info.url.trim() !== '') {
    return event.ticket_info.url.trim();
  }
  return undefined;
}
