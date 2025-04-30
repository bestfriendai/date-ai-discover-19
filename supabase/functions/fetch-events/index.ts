
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

serve(async (req: Request) => {
  console.log("fetch-events function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request parameters
    const url = new URL(req.url);
    const projectRef = url.hostname.split('.')[0];
    let params = {};
    
    if (req.method === 'GET') {
      // For GET requests, use URL parameters
      params = Object.fromEntries(url.searchParams);
    } else if (req.method === 'POST') {
      // For POST requests, parse the JSON body
      params = await req.json();
    }
    
    console.log('Fetch events called with params:', JSON.stringify(params));

    // Forward the request to search-events with proper error handling
    const functionUrl = `https://${projectRef}.supabase.co/functions/v1/search-events`;
    console.log(`Forwarding request to: ${functionUrl}`);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify(params)
    });

    // Get the response body as JSON
    const responseBody = await response.json();
    console.log(`Received response with ${responseBody.events?.length || 0} events`);
    
    // Return the response from search-events
    return new Response(JSON.stringify(responseBody), { 
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
