
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Serve function
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('apiKey') || '';
    const endpoint = url.searchParams.get('endpoint') || '';
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'No endpoint parameter provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Parse request body if it exists
    let requestBody = null;
    let requestParams = {};
    
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        console.log("[fetch-events] Request body:", JSON.stringify(requestBody));
      } catch (e) {
        console.error("[fetch-events] Error parsing request body:", e);
      }
    }

    // Get parameters from the URL query string
    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== 'endpoint' && key !== 'apiKey') {
        params.append(key, value);
        requestParams[key] = value;
      }
    }

    console.log(`[fetch-events] Proxying request to endpoint: ${endpoint}`);
    console.log(`[fetch-events] Params:`, JSON.stringify(requestParams));

    // Prepare headers for the API request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add API key to headers if provided
    if (apiKey) {
      headers['X-RapidAPI-Key'] = apiKey;
      headers['X-RapidAPI-Host'] = new URL(endpoint).hostname;
    }

    // Make the request to the API
    const response = await fetch(
      `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`,
      {
        method: requestBody ? 'POST' : 'GET',
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      }
    );

    // Get the response data
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("[fetch-events] Error parsing API response:", e);
      data = { error: "Failed to parse API response" };
    }

    console.log(`[fetch-events] API response status: ${response.status}`);

    // Return the API response with CORS headers
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      }
    );
  } catch (error) {
    console.error("[fetch-events] Error:", error);
    
    // Return error response with CORS headers
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
