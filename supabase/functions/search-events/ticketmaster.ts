/**
 * Ticketmaster API integration for fetching events
 * Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import { Event, TicketmasterParams } from './types.ts';
import { formatTicketmasterDate } from './utils.ts';

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
    console.error('[TICKETMASTER] Missing API key - TICKETMASTER_KEY environment variable is not set or is empty');
    return {
      events: [],
      error: 'Ticketmaster API key is missing. Please add a valid TICKETMASTER_KEY to your environment variables.',
      status: 401,
      warnings: ['Missing API key - TICKETMASTER_KEY environment variable is not set or is empty']
    };
  }
  
  // Check if the API key is a placeholder or example key
  if (params.apiKey === 'your_ticketmaster_key_here' ||
      params.apiKey.includes('example') ||
      params.apiKey.includes('placeholder')) {
    console.error('[TICKETMASTER] Invalid API key - using placeholder or example key');
    return {
      events: [],
      error: 'Ticketmaster API key is invalid. Please replace the placeholder with a valid API key.',
      status: 401,
      warnings: ['Invalid API key - using placeholder or example key']
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
      // Format the date using the improved formatTicketmasterDate function
      const formattedStartDate = formatTicketmasterDate(startDate, false);
      
      if (formattedStartDate) {
        queryParams.append('startDateTime', formattedStartDate);
        console.log(`[TICKETMASTER] Using startDateTime: ${formattedStartDate}`);
      } else {
        // Use current date as fallback if formatting fails
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0); // Set to beginning of day in UTC
        const fallbackDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z'); // Remove milliseconds
        
        queryParams.append('startDateTime', fallbackDate);
        console.log(`[TICKETMASTER] Using fallback startDateTime: ${fallbackDate}`);
      }
    }

    if (endDate) {
      // Format the date using the improved formatTicketmasterDate function
      const formattedEndDate = formatTicketmasterDate(endDate, true);
      
      if (formattedEndDate) {
        queryParams.append('endDateTime', formattedEndDate);
        console.log(`[TICKETMASTER] Using endDateTime: ${formattedEndDate}`);
      } else {
        // Use 7 days from now as fallback
        const future = new Date();
        future.setDate(future.getDate() + 7);
        future.setUTCHours(23, 59, 59, 0);
        
        // Format to required Ticketmaster format without milliseconds
        const fallbackDate = future.toISOString().replace(/\.\d{3}Z$/, 'Z');
        
        queryParams.append('endDateTime', fallbackDate);
        console.log(`[TICKETMASTER] Using fallback endDateTime: ${fallbackDate}`);
      }
    }

    // Add debug logging for date parameters
    console.log('[TICKETMASTER] Date parameters:', {
      originalStartDate: startDate,
      originalEndDate: endDate,
      formattedStartDate: queryParams.get('startDateTime'),
      formattedEndDate: queryParams.get('endDateTime')
    });

    // Add keyword parameter
    if (keyword) {
      queryParams.append('keyword', keyword);
    }

    // Add segment parameter (music, sports, arts, etc.)
    if (segmentName) {
      queryParams.append('segmentName', segmentName);
    }

    // Add classification parameter (specific type of event)
    if (classificationName) {
      queryParams.append('classificationName', classificationName);
      console.log(`[TICKETMASTER_DEBUG] Using classificationName: ${classificationName}`);
    }
    
    // Log all query parameters for debugging
    console.log('[TICKETMASTER_DEBUG] All query parameters:');
    queryParams.forEach((value, key) => {
      if (key === 'apikey') {
        console.log(`  ${key}: ${value.substring(0, 4)}...${value.substring(value.length - 4)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

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
      // Verify API key is present before making request
      if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
        console.error(`[TICKETMASTER] Invalid API key detected at fetch time: ${apiKey}`);
        return {
          events: [],
          error: 'Ticketmaster API key is missing or invalid. Please check your environment variables.',
          status: 401,
          warnings: ['Missing or invalid API key']
        };
      }
      
      console.log('[TICKETMASTER_DEBUG] Starting API request to:', url);
      console.log('[TICKETMASTER] Sanitized URL:', url.replace(/(apikey=)([^&]+)/, '$1[REDACTED]'));
      
      // Create a controller for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[TICKETMASTER_DEBUG] Request timed out after 15 seconds');
        controller.abort('Ticketmaster API call timed out after 15 seconds');
      }, 15000);

      const requestStartTime = Date.now();
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      const requestDuration = Date.now() - requestStartTime;
      console.log(`[TICKETMASTER_DEBUG] Request completed in ${requestDuration}ms`);

      clearTimeout(timeoutId);

      console.log('[TICKETMASTER] API response status:', response.status, response.statusText);

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
      
      // Try to parse the error response as JSON for more details
      let errorDetails = errorText;
      let errorMessages: string[] = [];
      
      try {
        const errorJson = JSON.parse(errorText);
        
        // Handle different error formats from Ticketmaster API
        if (errorJson.fault) {
          errorDetails = `${errorJson.fault.faultstring || 'Unknown error'} (${errorJson.fault.detail?.errorcode || 'No code'})`;
          errorMessages.push(errorJson.fault.faultstring || 'Unknown error');
        } else if (errorJson.errors && Array.isArray(errorJson.errors)) {
          // Extract error messages from the errors array
          errorMessages = errorJson.errors.map((err: any) =>
            `${err.code || 'Error'}: ${err.detail || 'Unknown error'}`
          );
          errorDetails = errorMessages.join('; ');
        }
        
        // Log detailed error information
        console.error('[TICKETMASTER] Parsed API error:', {
          status: response.status,
          errorJson,
          errorMessages
        });
      } catch (e) {
        // If not JSON, use the raw text
        console.error('[TICKETMASTER] Failed to parse error response as JSON:', e);
      }
      
      return {
        events: [],
        error: `Ticketmaster API error: ${response.status} - ${errorDetails}`,
        status: response.status,
        warnings: errorMessages.length > 0 ? errorMessages : [`API returned status ${response.status}`]
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
    
    // Log detailed response information for debugging
    console.log('[TICKETMASTER_DEBUG] Response details:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    console.log('  Has events:', !!data._embedded?.events);
    console.log('  Event count:', data._embedded?.events?.length || 0);
    
    if (data._embedded?.events && data._embedded.events.length > 0) {
      console.log('[TICKETMASTER_DEBUG] First event sample:');
      const firstEvent = data._embedded.events[0];
      console.log('  Name:', firstEvent.name);
      console.log('  ID:', firstEvent.id);
      console.log('  Date:', firstEvent.dates?.start?.localDate);
      console.log('  Venue:', firstEvent._embedded?.venues?.[0]?.name);
    }

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
      let ticketInfo: any = undefined;
      
      if (event.priceRanges && event.priceRanges.length > 0) {
        const priceRange = event.priceRanges[0];
        price = `${priceRange.min} - ${priceRange.max} ${priceRange.currency}`;
        
        // Create enhanced ticket info
        ticketInfo = {
          price: `${priceRange.min} - ${priceRange.max} ${priceRange.currency}`,
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          currency: priceRange.currency,
          availability: event.dates?.status?.code || 'unknown',
          purchaseUrl: event.url,
          provider: 'Ticketmaster'
        };
      }

      // Extract category information
      const category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';

      // Extract image
      const image = event.images && event.images.length > 0
        ? event.images.find((img: any) => img.ratio === '16_9' && img.width > 500)?.url || event.images[0].url
        : '';
        
      // Extract additional images
      const additionalImages = event.images && event.images.length > 1
        ? event.images.filter((img: any) => img.url !== image).map((img: any) => img.url)
        : undefined;

      // Extract date and time
      const date = event.dates?.start?.localDate || '';
      const time = event.dates?.start?.localTime || '';
      
      // Extract websites
      const websites = {
        official: event.url,
        tickets: event.url,
        venue: venue?.url
      };

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
        imageAlt: `${event.name} at ${venueName}`,
        additionalImages,
        coordinates,
        url: event.url,
        price,
        ticketInfo,
        websites
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
