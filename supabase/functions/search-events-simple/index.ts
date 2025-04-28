// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Add Deno namespace declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight requests
function handleOptionsRequest() {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status: 204,
  });
}

/**
 * Simple function to search for events using RapidAPI Events Search API
 *
 * This is a simplified version of the original searchRapidAPIEvents function
 * that focuses on the core functionality without the complexity of the original.
 *
 * @param params - Search parameters object containing location, categories, etc.
 * @returns Object containing events array and any error information
 */
async function searchRapidAPIEvents(params: any) {
  try {
    // Get RapidAPI key from environment variable
    // The key should be stored in RAPIDAPI_KEY environment variable
    // This is a simplified approach compared to the original implementation
    // which tried multiple environment variable names
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      throw new Error('RapidAPI key not available');
    }
    
    // Log the masked API key (first 4 chars only) for debugging
    // This avoids exposing the full API key in logs
    const maskedKey = rapidApiKey.substring(0, 4) + '...' + rapidApiKey.substring(rapidApiKey.length - 4);
    console.log(`Using RapidAPI key: ${maskedKey}`);
    
    // Build query parameters for the RapidAPI Events Search API
    const queryParams = new URLSearchParams();
    
    // Add location-based query parameter if location is provided
    // This constructs a simple query string that works well with the API
    // The original implementation had complex query construction logic
    if (params.location) {
      queryParams.append('query', `events in ${params.location}`);
    } else {
      // Fallback to popular events if no location is provided
      queryParams.append('query', 'popular events');
    }
    
    // Add date parameter - valid values for RapidAPI:
    // all, today, tomorrow, week, weekend, next_week, month, next_month
    // We default to 'week' for a reasonable date range
    queryParams.append('date', 'week');
    
    // Set is_virtual parameter to false to only get in-person events
    // This is important for events that need to be displayed on a map
    queryParams.append('is_virtual', 'false');
    
    // Add start parameter for pagination (0-based index)
    // This simplified version always starts from the beginning
    queryParams.append('start', '0');
    
    // Build the complete URL for the RapidAPI Events Search API
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    
    console.log(`Sending request to: ${url}`);
    
    // Make the API call with the required RapidAPI headers
    // The x-rapidapi-key header is required for authentication
    // The x-rapidapi-host header specifies which RapidAPI service to use
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });
    
    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`RapidAPI request failed with status: ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Return the events from the data property of the response
    // The RapidAPI Events Search API returns events in the data array
    // This handles the newer API response format
    return {
      events: data.data || [],
      error: null
    };
  } catch (error) {
    console.error(`Error searching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`);
    return {
      events: [],
      error: `Error searching RapidAPI events: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    // Parse request body
    let params = {};
    if (req.method === 'POST') {
      params = await req.json();
    }
    
    // Log the search parameters for debugging
    console.log('Search parameters:', JSON.stringify(params));
    
    // Call the searchRapidAPIEvents function to fetch events
    // This is the main function that handles the RapidAPI integration
    const result = await searchRapidAPIEvents(params);
    
    // Return the response
    return new Response(
      JSON.stringify({
        events: result.events,
        sourceStats: {
          rapidapi: {
            count: result.events.length,
            error: result.error
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({
        events: [],
        error: error instanceof Error ? error.message : String(error),
        sourceStats: {
          rapidapi: {
            count: 0,
            error: error instanceof Error ? error.message : String(error)
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
