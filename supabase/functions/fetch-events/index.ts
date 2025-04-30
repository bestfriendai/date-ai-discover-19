
// supabase/functions/fetch-events/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

// Standard response headers
const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request parameters
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    console.log('Fetch events called with params:', params);

    // This is a proxy to the search-events function
    // Redirect to the search-events function
    const searchEventsUrl = url.origin.replace('/fetch-events', '/search-events');
    
    // Forward the request to search-events
    console.log('Forwarding request to search-events');
    
    // Call the search-events function
    const response = await fetch(`${url.origin.replace('/fetch-events', '')}/search-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify(params)
    });

    // Return the response from search-events
    const data = await response.json();
    return new Response(JSON.stringify(data), { 
      headers: responseHeaders,
      status: response.status
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
