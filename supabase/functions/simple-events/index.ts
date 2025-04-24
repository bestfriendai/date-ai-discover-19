// @ts-ignore: Deno types are not available in the TypeScript compiler context but will be available at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for safe JSON responses
function safeResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 204,
    });
  }

  try {
    // Get API key from environment variables
    const TICKETMASTER_KEY = Deno.env.get('TICKETMASTER_KEY') || 'DpUgXkAg7KMNGmB9GsUjt5hIeUCJ7X5f';

    // Parse request body
    let params: any = {};
    try {
      if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
        const body = await req.text();
        if (body && body.trim().length > 0) {
          params = JSON.parse(body);
        }
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
    }

    // Set default parameters if not provided
    const location = params.location || 'New York';
    const radius = params.radius || 10;
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const endDate = params.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const keyword = params.keyword || '';
    const categories = params.categories || ['music', 'sports', 'arts', 'family', 'food'];

    console.log('Fetching events with params:', {
      location,
      radius,
      startDate,
      endDate,
      keyword,
      categories
    });

    // Build the Ticketmaster API URL
    let url = 'https://app.ticketmaster.com/discovery/v2/events.json?';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add API key
    queryParams.append('apikey', TICKETMASTER_KEY);

    // Add location parameter
    if (location) {
      queryParams.append('city', location);
    }

    // Add radius parameter
    queryParams.append('radius', radius.toString());
    queryParams.append('unit', 'miles');

    // Add date range parameters
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

    // Add category parameter - improved to handle multiple categories
    const categoryMapping: Record<string, string> = {
      'music': 'Music',
      'sports': 'Sports',
      'arts': 'Arts & Theatre',
      'family': 'Family',
      'food': 'Miscellaneous',
      'party': 'Music', // Map party to Music since Ticketmaster doesn't have a party category
      'conference': 'Miscellaneous',
      'community': 'Miscellaneous'
    };

    // Check if we have any categories that map to Ticketmaster segments
    if (categories && categories.length > 0) {
      // Find the first matching category
      for (const category of categories) {
        if (categoryMapping[category]) {
          queryParams.append('segmentName', categoryMapping[category]);
          break; // Ticketmaster only supports one segment at a time
        }
      }

      // If searching for parties, add party-related keywords
      if (categories.includes('party')) {
        const partyKeyword = keyword
          ? `${keyword} OR party OR club OR nightlife OR dance`
          : 'party OR club OR nightlife OR dance OR dj OR festival';
        queryParams.append('keyword', partyKeyword);
      }
    }

    // Add size parameter
    queryParams.append('size', '100');

    // Add sort parameter - sort by date
    queryParams.append('sort', 'date,asc');

    // Append query parameters to URL
    url += queryParams.toString();

    console.log('Ticketmaster API URL:', url);

    // Make the API request with timeout and error handling
    console.log('Making API request to Ticketmaster...');

    // Create a controller for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort('Ticketmaster API call timed out after 10 seconds');
    }, 10000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Ticketmaster API response status:', response.status);

      // Log response headers for debugging
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Ticketmaster API response headers:', headers);
    } catch (error) {
      console.error('Ticketmaster API fetch error:', error);
      return safeResponse({
        events: [],
        error: `Ticketmaster API fetch error: ${error instanceof Error ? error.message : String(error)}`,
        status: 500
      }, 500);
    }

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ticketmaster API error:', response.status, errorText);
      return safeResponse({
        events: [],
        error: `Ticketmaster API error: ${response.status} ${errorText}`,
        status: response.status
      });
    }

    // Parse the response
    const data = await response.json();
    console.log('Ticketmaster API response:', {
      page: data.page,
      totalElements: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
      size: data.page?.size || 0,
      number: data.page?.number || 0,
      hasEvents: !!data._embedded?.events
    });

    // Check if events were returned
    if (!data._embedded?.events) {
      console.log('No events found');
      return safeResponse({
        events: [],
        error: null,
        status: 200,
        message: 'No events found'
      });
    }

    // Transform Ticketmaster events to our Event format with improved data quality
    const events = data._embedded.events.map((event: any) => {
      try {
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

        // Extract category information with improved mapping
        let category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';

        // Map Ticketmaster categories to our standard categories
        if (category === 'music') {
          // Check if it's a party event
          const name = event.name?.toLowerCase() || '';
          const desc = event.description?.toLowerCase() || event.info?.toLowerCase() || '';
          const isParty = ['party', 'club', 'nightlife', 'dance', 'dj'].some(term =>
            name.includes(term) || desc.includes(term)
          );

          if (isParty) {
            category = 'party';
          }
        } else if (category === 'arts & theatre' || category === 'arts' || category === 'theatre') {
          category = 'arts';
        }

        // Extract image with better quality selection
        let image = '';
        if (event.images && event.images.length > 0) {
          // Try to find a high-quality 16:9 image first
          const highQualityImage = event.images.find((img: any) =>
            img.ratio === '16_9' && img.width >= 640
          );

          // If not found, try any 16:9 image
          const anyWideImage = event.images.find((img: any) =>
            img.ratio === '16_9'
          );

          // If still not found, use the first image
          image = highQualityImage?.url || anyWideImage?.url || event.images[0].url;
        }

        // Extract date and time
        const date = event.dates?.start?.localDate || '';
        const time = event.dates?.start?.localTime || '';

        // Format date for display
        let formattedDate = date;
        try {
          if (date) {
            const dateObj = new Date(date);
            formattedDate = dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }

        // Format time for display
        let formattedTime = time;
        try {
          if (time) {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            formattedTime = `${hour12}:${minutes} ${ampm}`;
          }
        } catch (e) {
          console.error('Error formatting time:', e);
        }

        // Create the event object with all extracted data
        return {
          id: `ticketmaster-${event.id}`,
          source: 'ticketmaster',
          title: event.name,
          description: event.description || event.info || '',
          date: formattedDate,
          time: formattedTime,
          rawDate: date, // Keep the original date for sorting
          rawTime: time, // Keep the original time for sorting
          location: locationStr,
          venue: venueName,
          category,
          image,
          coordinates,
          url: event.url,
          price,
          // Add additional fields for enhanced functionality
          popularity: event.rank || event.popularity || 0,
          ageRestriction: event.ageRestrictions?.legalAgeEnforced ? '18+' : undefined,
          accessibility: event.accessibility ? true : undefined,
          ticketStatus: event.dates?.status?.code || 'unknown'
        };
      } catch (error) {
        console.error('Error transforming event:', error, event?.id);
        // Return a minimal valid event in case of error
        return {
          id: `ticketmaster-error-${event?.id || Date.now()}`,
          source: 'ticketmaster',
          title: event?.name || 'Unknown Event',
          description: 'Error processing event details',
          date: event?.dates?.start?.localDate || new Date().toISOString().split('T')[0],
          time: event?.dates?.start?.localTime || '00:00',
          location: 'Location unavailable',
          category: 'other',
          image: ''
        };
      }
    });

    console.log(`Transformed ${events.length} events`);

    // Filter out events with missing critical data
    const validEvents = events.filter(event => {
      return (
        event.title &&
        event.date &&
        (event.image || event.description) &&
        event.location
      );
    });

    console.log(`Filtered to ${validEvents.length} valid events`);

    // Sort events by date (soonest first)
    validEvents.sort((a, b) => {
      // Parse dates using the raw date and time
      const dateA = new Date(`${a.rawDate || a.date}T${a.rawTime || '00:00:00'}`);
      const dateB = new Date(`${b.rawDate || b.date}T${b.rawTime || '00:00:00'}`);

      // Sort by date (ascending)
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination if requested
    const page = params.page ? parseInt(params.page) : 1;
    const pageSize = params.pageSize ? parseInt(params.pageSize) : 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = validEvents.slice(startIndex, endIndex);

    console.log(`Returning ${paginatedEvents.length} events (page ${page}, pageSize ${pageSize})`);

    return safeResponse({
      events: paginatedEvents,
      error: null,
      status: 200,
      meta: {
        totalEvents: validEvents.length,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(validEvents.length / pageSize),
        hasMore: endIndex < validEvents.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return safeResponse({
      events: [],
      error: error instanceof Error ? error.message : String(error),
      status: 500
    }, 500);
  }
});
