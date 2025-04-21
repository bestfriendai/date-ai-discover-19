// Direct test script for PredictHQ integration
import { fetchPredictHQEvents } from "./supabase/functions/search-events/predicthq-fixed.ts";

// Replace with your actual API key or use environment variable
const PREDICTHQ_API_KEY = process.env.PREDICTHQ_API_KEY || "YOUR_PREDICTHQ_API_KEY";

async function testPredictHQ() {
  try {
    console.log('Testing PredictHQ integration directly...');
    console.log('API Key available:', !!PREDICTHQ_API_KEY);

    // Call the PredictHQ function directly
    const result = await fetchPredictHQEvents({
      apiKey: PREDICTHQ_API_KEY,
      location: "New York",
      radius: 25,
      limit: 5,
      startDate: new Date().toISOString().split('T')[0], // Today
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    });

    console.log("PredictHQ API response:");
    console.log("Error:", result.error);
    console.log("Events count:", result.events.length);

    if (result.events.length > 0) {
      console.log("\nSample event:");
      console.log(JSON.stringify(result.events[0], null, 2));

      // Check if events have coordinates
      const eventsWithCoords = result.events.filter(event => event.coordinates && event.coordinates.length === 2);
      console.log(`\n${eventsWithCoords.length} of ${result.events.length} events have coordinates`);
    }
  } catch (error) {
    console.error("Error testing PredictHQ:", error);
  }
}

testPredictHQ();
