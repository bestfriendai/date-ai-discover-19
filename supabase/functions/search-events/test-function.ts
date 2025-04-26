/**
 * Test script for the redesigned search-events function
 * 
 * This script tests the function locally to ensure all components work together correctly.
 */

// Import the handler function
import { handler } from "./index.ts";

// Import environment variables from temporary file
// IMPORTANT: Update temp-env.ts with your actual API keys before running this test
import { TICKETMASTER_API_KEY, PREDICTHQ_API_KEY } from "./temp-env.ts";

// Set environment variables for testing
Deno.env.set("TICKETMASTER_API_KEY", TICKETMASTER_API_KEY);
Deno.env.set("PREDICTHQ_API_KEY", PREDICTHQ_API_KEY);

// Test parameters
const testParams = {
  query: "music",  // Updated from 'text' to 'query' to match our new interface
  location: "New York", // Added location string search
  lat: 40.7128,    // Updated from 'latitude' to 'lat'
  lng: -74.0060,   // Updated from 'longitude' to 'lng'
  radius: 25,
  startDate: new Date().toISOString().split('T')[0], // Updated from 'start' to 'startDate'
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Updated from 'end' to 'endDate'
  category: "music", // Updated from 'categories' array to single 'category' string
  limit: 20,
  offset: 0
};

// Create a mock request
const mockRequest = new Request("http://localhost:8000/search-events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer test-token"
  },
  body: JSON.stringify(testParams)
});

// Run the test
console.log("\n🧪 Testing search-events function...");
console.log("📝 Test parameters:", testParams);

try {
  console.log("⏳ Calling handler function...");
  const startTime = performance.now();
  
  // Call the handler function
  const response = await handler(mockRequest);
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Handler function completed in ${duration.toFixed(2)}ms`);
  
  // Check if the response is valid
  if (response.status === 200) {
    console.log("✅ Response status: 200 OK");
    
    // Parse the response body
    const responseBody = await response.json();
    
    console.log(`✅ Received ${responseBody.events?.length || 0} events`);
    console.log("📊 Source stats:", responseBody.sourceStats || responseBody.metadata?.sourceStats);
    console.log("📊 Metadata:", responseBody.metadata);
    
    // Log cache performance if available
    if (responseBody.metadata?.cache) {
      console.log("📊 Cache performance:", responseBody.metadata.cache);
    }
    
    // Log API usage if available
    if (responseBody.metadata?.apiUsage) {
      console.log("📊 API usage:", responseBody.metadata.apiUsage);
    }
    
    // Log the first event if available
    if (responseBody.events && responseBody.events.length > 0) {
      console.log("\n📋 First event sample:");
      const event = responseBody.events[0];
      console.log("  ID:", event.id);
      console.log("  Title:", event.title);
      console.log("  Source:", event.source);
      console.log("  Date:", event.date);
      console.log("  Time:", event.time);
      console.log("  Location:", event.location);
      console.log("  Category:", event.category);
      console.log("  Has coordinates:", !!event.coordinates);
      console.log("  Has venue:", !!event.venue);
      console.log("  Has start time:", !!event.start);
    } else {
      console.log("⚠️ No events found");
    }
  } else {
    console.log(`❌ Response status: ${response.status}`);
    const errorBody = await response.json();
    console.log("❌ Error:", errorBody);
  }
} catch (error) {
  console.error("❌ Test failed with error:", error);
}

console.log("\n🏁 Test completed.");
