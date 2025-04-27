/**
 * Simplified Ticketmaster API integration for fetching events
 * Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import { Event } from './types.ts';

interface TicketmasterParams {
  apiKey: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  segmentName?: string;
  size?: number;
  location?: string; // Added location parameter
}

interface TicketmasterResponse {
  events: Event[];
  error: string | null;
  status: number;
}

/**
 * Fetch events from Ticketmaster API
 */
export async function fetchTicketmasterEvents(params: TicketmasterParams): Promise<TicketmasterResponse> {
  // Validate input parameters
  if (!params.apiKey) {
    console.error('[TICKETMASTER] Missing API key');
    return {
      events: [],
      error: 'Missing API key',
      status: 401
    };
  }

  console.log('[TICKETMASTER] Fetching events with params:', {
    hasCoordinates: !!(params.latitude && params.longitude),
    radius: params.radius,
    hasDateRange: !!(params.startDate && params.endDate),
    keyword: params.keyword,
    segmentName: params.segmentName,
    size: params.size
  });

  try {
    // Build the Ticketmaster API URL
    let url = 'https://app.ticketmaster.com/discovery/v2/events.json?';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add API key (required)
    queryParams.append('apikey', params.apiKey);

    // Add location parameters
    if (params.latitude && params.longitude) {
      queryParams.append('latlong', `${params.latitude},${params.longitude}`);
      queryParams.append('radius', Math.max(Number(params.radius || 25), 25).toString());
      queryParams.append('unit', 'miles');
      console.log(`[TICKETMASTER] Using lat/lng ${params.latitude},${params.longitude} with radius ${params.radius} miles.`);
    } else if (params.location) {
      // If no coordinates but location name is provided, use city parameter
      queryParams.append('city', params.location);
      queryParams.append('radius', '50');
      queryParams.append('unit', 'miles');
      console.log(`[TICKETMASTER] Using city name: ${params.location} with default radius of 50 miles.`);
    } else {
      queryParams.append('radius', '50');
      queryParams.append('unit', 'miles');
      console.log(`[TICKETMASTER] No location provided, using default radius of 50 miles.`);
    }

    // Add date range parameters
    if (params.startDate) {
      queryParams.append('startDateTime', `${params.startDate}T00:00:00Z`);
    }
    if (params.endDate) {
      queryParams.append('endDateTime', `${params.endDate}T23:59:59Z`);
    }

    // Add keyword parameter
    if (params.keyword) {
      queryParams.append('keyword', params.keyword);
    }

    // Add segment parameter (music, sports, arts, etc.)
    if (params.segmentName) {
      queryParams.append('segmentName', params.segmentName);
    }

    // Add size parameter (max 200 per Ticketmaster docs)
    queryParams.append('size', Math.min(params.size || 100, 200).toString());

    // Add sort parameter - sort by date
    queryParams.append('sort', 'date,asc');

    // Append query parameters to URL
    url += queryParams.toString();

    console.log('[TICKETMASTER] API URL:', url);

    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TICKETMASTER] API error:', response.status, errorText);
      return {
        events: [],
        error: `Ticketmaster API error: ${response.status} ${errorText}`,
        status: response.status
      };
    }

    // Parse the response
    const data = await response.json();
    console.log('[TICKETMASTER] API response:', {
      totalElements: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
      size: data.page?.size || 0,
      hasEvents: !!data._embedded?.events
    });

    // Check if events were returned
    if (!data._embedded?.events) {
      console.log('[TICKETMASTER] No events found');
      return {
        events: [],
        error: null,
        status: 200
      };
    }

    // Transform Ticketmaster events to our Event format
    const events: Event[] = data._embedded.events.map((event: any) => {
      // Extract venue information
      const venue = event._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const venueCity = venue?.city?.name || '';
      const venueState = venue?.state?.stateCode || '';
      const venueCountry = venue?.country?.countryCode || '';

      // Build location string
      let locationStr = venueName;
      if (venueCity) {
        locationStr += locationStr ? `, ${venueCity}` : venueCity;
      }
      if (venueState) {
        locationStr += locationStr ? `, ${venueState}` : venueState;
      }
      if (venueCountry && venueCountry !== 'US') {
        locationStr += locationStr ? `, ${venueCountry}` : venueCountry;
      }

      // Extract coordinates
      let coordinates: [number, number] | undefined = undefined;
      if (venue?.location?.longitude && venue?.location?.latitude) {
        coordinates = [
          parseFloat(venue.location.longitude),
          parseFloat(venue.location.latitude)
        ];
      }

      // Extract price information
      let price: string | undefined = undefined;
      if (event.priceRanges && event.priceRanges.length > 0) {
        const priceRange = event.priceRanges[0];
        price = `${priceRange.min} - ${priceRange.max} ${priceRange.currency}`;
      }

      // Extract category information
      const category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';

      // Extract image
      const image = event.images && event.images.length > 0
        ? event.images.find((img: any) => img.ratio === '16_9' && img.width > 500)?.url || event.images[0].url
        : '';

      // Extract date and time
      const date = event.dates?.start?.localDate || '';
      const time = event.dates?.start?.localTime || '';

      return {
        id: `ticketmaster-${event.id}`,
        source: 'ticketmaster',
        title: event.name,
        description: event.description || event.info || '',
        date,
        time,
        location: locationStr,
        venue: venueName,
        category,
        image,
        coordinates,
        url: event.url,
        price
      };
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
      status: 500
    };
  }
}
