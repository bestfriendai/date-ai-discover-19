// Local test script for search-events function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./supabase/functions/_shared/cors.ts";
import { Event, SearchParams, SourceStats, SearchEventsResponse } from "./supabase/functions/search-events/types.ts";
import { fetchPredictHQEvents } from "./supabase/functions/search-events/predicthq-fixed.ts";

// Mock environment variables
const env = {
  TICKETMASTER_KEY: "YOUR_TICKETMASTER_KEY",
  SERPAPI_KEY: "YOUR_SERPAPI_KEY",
  PREDICTHQ_API_KEY: "YOUR_PREDICTHQ_API_KEY",
  MAPBOX_TOKEN: "YOUR_MAPBOX_TOKEN"
};

// Import the main function code
import { default as searchEventsHandler } from "./supabase/functions/search-events/index.ts";

// Create a mock request
const mockRequest = new Request("http://localhost:8000/search-events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    location: "New York",
    radius: 25,
    limit: 10,
    page: 1
  })
});

// Mock Deno.env.get
const originalEnvGet = Deno.env.get;
Deno.env.get = (key) => env[key] || originalEnvGet(key);

// Call the function
try {
  console.log("Testing search-events function locally...");
  console.log("Request:", mockRequest);
  
  const response = await searchEventsHandler(mockRequest);
  const data = await response.json();
  
  console.log("Response status:", response.status);
  console.log("Events count:", data.events?.length || 0);
  console.log("Source stats:", data.sourceStats);
  
  // Print first event as sample
  if (data.events && data.events.length > 0) {
    console.log("\nSample event:");
    console.log(JSON.stringify(data.events[0], null, 2));
  }
} catch (error) {
  console.error("Error testing function:", error);
}
