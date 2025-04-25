/**
 * Ticketmaster API integration for fetching events
 * Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import { Event, TicketmasterParams } from './types.ts';

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
    segmentName,
    classificationName,
    size = 100
  } = params;

  try {
    console.log('[TICKETMASTER] Fetching events with params:', {
      hasCoordinates: !!(latitude && longitude),
      radius,
      hasDateRange: !!(startDate && endDate),
      keyword,
      segmentName,
      classificationName,
      size
    });

    // Build the Ticketmaster API URL
    let url = 'https://app.ticketmaster.com/discovery/v2/events.json?';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add API key (required)
    queryParams.append('apikey', apiKey);

    // Add location parameters with improved handling
    if (latitude && longitude) {
      // Ticketmaster API uses latlong parameter with comma-separated values
      queryParams.append('latlong', `${latitude},${longitude}`);

      // Use the validated radius from the parameters
      // The radius is already guaranteed to be a number between 5-100 by the validation
      queryParams.append('radius', radius.toString());
      queryParams.append('unit', 'miles');

      console.log(`[TICKETMASTER] Using lat/lng ${latitude},${longitude} with radius ${radius} miles.`);
    }

    // Add date range parameters (using underscore naming as per v2 docs)
    if (startDate) {
      queryParams.append('startDateTime', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      queryParams.append('endDateTime', `${endDate}T23:59:59Z`);
    }

    // Add keyword parameter
    if (keyword) {
      queryParams.append('keyword', keyword);
    }

    // Add segment parameter (music, sports, arts, etc.) (using underscore naming as per v2 docs)
    if (segmentName) {
      queryParams.append('segmentName', segmentName);
    }

    // Add classification parameter (specific type of event) (using underscore naming as per v2 docs)
    if (classificationName) {
      queryParams.append('classificationName', classificationName);
    }

    // Add size parameter (max 200 per Ticketmaster docs)
    queryParams.append('size', Math.min(size, 200).toString());

    // Add sort parameter - sort by date
    queryParams.append('sort', 'date,asc');

    // Add includeTBA and includeTBD parameters to include events with dates to be announced/defined
    queryParams.append('includeTBA', 'yes');
    queryParams.append('includeTBD', 'yes');

    // Append query parameters to URL
    url += queryParams.toString();

    console.log('[TICKETMASTER] API URL:', url);
    console.log('[TICKETMASTER_DEBUG] Full request parameters:', {
      apiKey: apiKey ? `${apiKey.substring(0, 4)}...` : 'NOT SET',
      latitude,
      longitude,
      radius,
      startDate,
      endDate,
      keyword,
      segmentName,
      classificationName,
      size
    });

    // Make the API request with proper error handling
    let response: Response;
    try {
      // Create a controller for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort('Ticketmaster API call timed out after 15 seconds');
      }, 15000);

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[TICKETMASTER] API response status:', response.status);

      // Log response headers for debugging
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('[TICKETMASTER] API response headers:', headers);
    } catch (fetchError) {
      console.error('[TICKETMASTER_FETCH_ERROR] Fetch error:', fetchError);
      let errorMsg = `Ticketmaster API fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
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
      console.error('[TICKETMASTER] API error:', response.status, errorText);
      return {
        events: [],
        error: `Ticketmaster API error: ${response.status} ${errorText}`,
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

    // Transform Ticketmaster events to our Event format
    const events: Event[] = data._embedded.events.map((event: any) => {
      // Extract venue information
      const venue = event._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const venueCity = venue?.city?.name || '';
      const venueState = venue?.state?.stateCode || '';
      const venueCountry = venue?.country?.countryCode || '';
      const venueAddress = venue?.address?.line1 || '';

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
      status: 500,
      warnings: ['Error processing API response']
    };
  }
}
