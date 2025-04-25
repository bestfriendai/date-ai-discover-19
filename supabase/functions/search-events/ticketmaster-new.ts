/**
 * Ticketmaster API integration for fetching events
 * Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import { Event, TicketmasterParams } from './types.ts';
import { normalizeTicketmasterEvent } from './eventNormalizers.ts';

interface TicketmasterResponse {
  events: Event[];
  error: string | null;
  status: number;
  warnings?: string[];
}

/**
 * Fetch events from Ticketmaster API
 * Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
export async function fetchTicketmasterEvents(params: TicketmasterParams): Promise<TicketmasterResponse> {
  // Validate input parameters
  if (!params) {
    console.error('[TICKETMASTER] Missing parameters');
    return {
      events: [],
      error: 'Missing parameters',
      status: 400,
      warnings: ['Missing parameters']
    };
  }

  if (!params.apiKey) {
    console.error('[TICKETMASTER] Missing API key');
    return {
      events: [],
      error: 'Missing API key',
      status: 401,
      warnings: ['Missing API key']
    };
  }

  console.log('[TICKETMASTER] fetchTicketmasterEvents called with params:', JSON.stringify({
    ...params,
    apiKey: params.apiKey ? `${params.apiKey.substring(0, 4)}...` : 'NOT SET'
  }, null, 2));

  const {
    apiKey,
    latitude,
    longitude,
    radius = 25,
    startDate,
    endDate,
    keyword,
    categories = [],
    limit = 20
  } = params;

  try {
    // Build the Ticketmaster API URL
    let url = 'https://app.ticketmaster.com/discovery/v2/events.json';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add API key
    queryParams.append('apikey', apiKey);

    // Add location parameters
    if (latitude && longitude) {
      queryParams.append('latlong', `${latitude},${longitude}`);
      queryParams.append('radius', radius.toString());
      queryParams.append('unit', 'miles');
    }

    // Add date range parameters
    if (startDate) {
      queryParams.append('startDateTime', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      queryParams.append('endDateTime', `${endDate}T23:59:59Z`);
    }

    // Add keyword search
    if (keyword) {
      queryParams.append('keyword', keyword);
    }

    // Add category filters
    if (categories && categories.length > 0) {
      // Map our categories to Ticketmaster segment names
      const categoryMap: Record<string, string> = {
        'music': 'Music',
        'sports': 'Sports',
        'arts': 'Arts & Theatre',
        'family': 'Family',
        'food': 'Miscellaneous',
        'party': 'Music' // Default party events to Music category
      };

      // Get unique mapped categories
      const segmentNames = Array.from(
        new Set(
          categories
            .map(cat => categoryMap[cat])
            .filter(Boolean)
        )
      );

      if (segmentNames.length > 0) {
        queryParams.append('segmentName', segmentNames.join(','));
      }

      // Special handling for party category
      if (categories.includes('party')) {
        // Add keyword search for party-related terms if not already specified
        if (!keyword) {
          queryParams.append('keyword', 'party OR club OR nightclub OR dance OR dj OR nightlife');
        } else {
          // Enhance existing keyword with party terms
          queryParams.append('keyword', `${keyword} OR party OR club OR nightclub OR dance OR dj OR nightlife`);
        }
      }
    }

    // Add size parameter (limit)
    queryParams.append('size', limit.toString());

    // Add sort parameter
    queryParams.append('sort', 'date,asc');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    console.log('[TICKETMASTER] API URL:', url);

    // Make the API request
    const response = await fetch(url);

    // Check for HTTP errors
    if (!response.ok) {
      console.error('[TICKETMASTER] API error:', response.status, response.statusText);
      return {
        events: [],
        error: `API returned status ${response.status}`,
        status: response.status,
        warnings: [`API returned status ${response.status}`]
      };
    }

    // Parse the response
    const data = await response.json();
    console.log('[TICKETMASTER] API response:', {
      page: data.page,
      totalElements: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
      size: data.page?.size || 0,
      number: data.page?.number || 0,
      hasEvents: !!data._embedded?.events
    });

    // Check if events were returned
    if (!data._embedded?.events) {
      console.log('[TICKETMASTER] No events found');
      return {
        events: [],
        error: null,
        status: 200,
        warnings: ['No events found']
      };
    }

    // Transform Ticketmaster events to our Event format using the new normalizer
    const events: Event[] = data._embedded.events.map((event: any) => {
      try {
        return normalizeTicketmasterEvent(event);
      } catch (error) {
        console.error('[TICKETMASTER_NORM_ERROR] Failed to normalize event:', error);
        // Return a minimal error event
        return {
          id: `ticketmaster-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          source: 'ticketmaster',
          title: event?.name || 'Unknown Event',
          description: 'Error processing event details',
          start: new Date().toISOString(),
          url: event?.url || '',
          date: event?.dates?.start?.localDate || new Date().toISOString().split('T')[0],
          time: event?.dates?.start?.localTime || '00:00',
          location: 'Location unavailable',
          category: 'other',
          image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop'
        };
      }
    });

    console.log('[TICKETMASTER] Transformed events:', events.length);

    return {
      events,
      error: null,
      status: 200
    };
  } catch (error) {
    console.error('[TICKETMASTER] Error fetching events:', error);
    return {
      events: [],
      error: `Error fetching Ticketmaster events: ${error instanceof Error ? error.message : String(error)}`,
      status: 500,
      warnings: ['Error processing API response']
    };
  }
}