
// supabase/functions/fetch-events/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard response headers
const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json'
};

// Define Event type
interface Event {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  venue?: string;
  category?: string;
  partySubcategory?: string;
  image?: string;
  coordinates?: [number, number];
  latitude?: number;
  longitude?: number;
  price?: string;
}

// Define search parameters type
interface SearchParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  keyword?: string;
  location?: string;
  page?: number;
  limit?: number;
}

// Function to search for events using RapidAPI
async function searchRapidAPIEvents(params: SearchParams): Promise<{ events: Event[], error: string | null, searchQueryUsed?: string }> {
  try {
    // Get RapidAPI key from environment
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') ||
                        Deno.env.get('X_RAPIDAPI_KEY') ||
                        '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'; // Fallback key

    if (!rapidApiKey) {
      throw new Error('RapidAPI key not available');
    }

    console.log('[FETCH-EVENTS] Starting RapidAPI search with params:', JSON.stringify({
      ...params,
      // Don't log possibly sensitive location info
      location: params.location ? '[LOCATION PROVIDED]' : undefined
    }));

    // Build query string for RapidAPI
    let queryString = '';

    // Add location coordinates if available
    if (params.latitude !== undefined && params.longitude !== undefined) {
      queryString = `events near ${params.latitude},${params.longitude}`;

      // Add radius if provided
      if (params.radius) {
        // Convert to miles for RapidAPI
        const radiusMiles = Math.round(params.radius / 1.60934);
        queryString += ` within ${radiusMiles} miles`;
      }
    }
    // Use location name if coordinates not available
    else if (params.location) {
      queryString = `events in ${params.location}`;
    }

    // Add keyword if provided
    if (params.keyword) {
      queryString += ` ${params.keyword}`;
    }

    console.log(`[FETCH-EVENTS] Constructed query: "${queryString}"`);

    // Build API Request
    const queryParams = new URLSearchParams();

    // Set query parameter
    queryParams.append('query', queryString);

    // Date Parameter - Use 'month' for a good amount of upcoming events
    queryParams.append('date', 'month');

    // Virtual events setting - only physical events
    queryParams.append('is_virtual', 'false');

    // Request maximum limit
    const apiLimit = Math.min(200, params.limit ? params.limit * 2 : 100);
    queryParams.append('limit', apiLimit.toString());
    queryParams.append('start', '0');

    // Make API Request
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    console.log(`[FETCH-EVENTS] Sending request to: ${url.substring(0, 100)}...`);

    // Setting timeout for the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        },
        signal: controller.signal
      });

      // Clear the timeout since we got a response
      clearTimeout(timeout);

      console.log(`[FETCH-EVENTS] Response status: ${response.status}`);

      if (!response.ok) {
        // Handle different HTTP error codes appropriately
        let errorMessage = `RapidAPI request failed: ${response.status}`;

        if (response.status === 401 || response.status === 403) {
          errorMessage = 'API key is invalid or unauthorized';
        } else if (response.status === 429) {
          errorMessage = 'API rate limit exceeded';
        } else if (response.status >= 500) {
          errorMessage = 'RapidAPI server error';
        }

        // Try to get more details from the error response
        const errorText = await response.text();
        console.error(`[FETCH-EVENTS] Request failed: ${response.status}`, errorText.substring(0, 200));

        return {
          events: [],
          error: errorMessage,
          searchQueryUsed: queryString
        };
      }

      const data = await response.json();
      const rawEvents = data.data || [];
      console.log(`[FETCH-EVENTS] Received ${rawEvents.length} raw events.`);

      // Transform Events
      const transformedEvents = rawEvents
        .map((event: any): Event | null => {
          try {
            if (!event || !event.id || !event.title) return null;

            // Extract coordinates
            let latitude = null;
            let longitude = null;
            let coordinates = null;

            if (event.venue && event.venue.location) {
              if (event.venue.location.latitude && event.venue.location.longitude) {
                latitude = parseFloat(event.venue.location.latitude);
                longitude = parseFloat(event.venue.location.longitude);
                coordinates = [longitude, latitude];
              }
            }

            // Skip events without coordinates
            if (!latitude || !longitude) return null;

            // Extract date and time
            let date = null;
            let time = null;

            if (event.start_time) {
              const startTime = new Date(event.start_time);
              date = startTime.toISOString().split('T')[0];
              time = startTime.toTimeString().split(' ')[0].substring(0, 5);
            }

            // Determine category
            let category = 'event';
            let partySubcategory = null;

            if (event.categories && event.categories.length > 0) {
              const categoryMap: Record<string, string> = {
                'MUSIC': 'music',
                'CONCERT': 'music',
                'FESTIVALS': 'festival',
                'PERFORMING_ARTS': 'arts',
                'COMEDY': 'comedy',
                'NIGHTLIFE': 'party',
                'FOOD': 'food',
                'SPORTS': 'sports'
              };

              // Look for known categories
              for (const cat of event.categories) {
                if (categoryMap[cat]) {
                  category = categoryMap[cat];
                  break;
                }
              }

              // Determine party subcategory
              if (category === 'party') {
                const partySubcategoryMap: Record<string, string> = {
                  'NIGHTLIFE': 'club',
                  'DANCE': 'club',
                  'SOCIAL': 'social',
                  'NETWORKING': 'networking'
                };

                for (const cat of event.categories) {
                  if (partySubcategoryMap[cat]) {
                    partySubcategory = partySubcategoryMap[cat];
                    break;
                  }
                }
              }
            }

            // Extract image
            let image = null;
            if (event.image && event.image.url) {
              image = event.image.url;
            }

            // Extract price
            let price = 'Free';
            if (event.ticket_availability && event.ticket_availability.lowest_price) {
              const lowestPrice = parseFloat(event.ticket_availability.lowest_price);
              if (lowestPrice > 0) {
                price = `$${lowestPrice.toFixed(2)}`;
              }
            }

            return {
              id: `rapidapi_${event.id}`,
              title: event.title,
              description: event.description || '',
              date,
              time,
              location: event.venue?.name || '',
              venue: event.venue?.name || '',
              category,
              partySubcategory,
              image,
              coordinates,
              latitude,
              longitude,
              price
            };
          } catch (error) {
            console.error(`[FETCH-EVENTS] Error transforming event:`, error);
            return null;
          }
        })
        .filter((event): event is Event => event !== null);

      console.log(`[FETCH-EVENTS] Transformed ${transformedEvents.length} events successfully.`);

      return {
        events: transformedEvents,
        error: null,
        searchQueryUsed: queryString
      };

    } catch (fetchError) {
      console.error(`[FETCH-EVENTS] Fetch error:`, fetchError);
      return {
        events: [],
        error: `Fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        searchQueryUsed: queryString
      };
    }

  } catch (error) {
    console.error(`[FETCH-EVENTS] Error:`, error);
    return {
      events: [],
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

serve(async (req: Request) => {
  console.log("fetch-events function called");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request body
    let params: SearchParams = {};

    if (req.method === 'POST') {
      try {
        params = await req.json();
      } catch (e) {
        console.error('Error parsing request body:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body', events: [] }),
          { headers: responseHeaders, status: 400 }
        );
      }
    }

    console.log('Received search parameters:', JSON.stringify(params));

    // Search for events using RapidAPI
    const startTime = Date.now();
    const result = await searchRapidAPIEvents(params);
    const executionTime = Date.now() - startTime;

    // Create response
    const response = {
      events: result.events,
      sourceStats: {
        rapidapi: {
          count: result.events.length,
          error: result.error
        }
      },
      meta: {
        executionTime: `${executionTime}ms`,
        totalEvents: result.events.length,
        eventsWithCoordinates: result.events.length,
        timestamp: new Date().toISOString(),
        page: params.page || 1,
        limit: params.limit || 50,
        hasMore: result.events.length >= (params.limit || 50),
        searchQueryUsed: result.searchQueryUsed
      }
    };

    // Return response
    return new Response(JSON.stringify(response), {
      headers: responseHeaders,
      status: 200
    });
  } catch (error) {
    console.error('Error in fetch-events:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        events: []
      }),
      {
        headers: responseHeaders,
        status: 500
      }
    );
  }
});
