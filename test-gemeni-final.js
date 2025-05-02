// Final test script for GEMENI RapidAPI integration
import { searchEvents } from './GEMENI/services/eventService.js';

async function testGEMENIRapidAPI() {
  console.log('=== FINAL TEST: GEMENI RAPIDAPI INTEGRATION ===');
  
  try {
    // Test with different date ranges to verify our date mapping logic
    const tests = [
      {
        name: "Current week events",
        params: {
          location: "Miami",
          keyword: "party",
          limit: 5
        }
      },
      {
        name: "Events with specific date range (should map to 'week')",
        params: {
          location: "New York",
          keyword: "concert",
          startDate: "2025-05-01",
          endDate: "2025-05-07",
          limit: 5
        }
      },
      {
        name: "Events with longer date range (should map to 'month')",
        params: {
          location: "Los Angeles",
          keyword: "festival",
          startDate: "2025-05-01",
          endDate: "2025-05-25",
          limit: 5
        }
      }
    ];
    
    // Run each test
    for (const test of tests) {
      console.log(`\n--- Test: ${test.name} ---`);
      console.log(`Params: ${JSON.stringify(test.params, null, 2)}`);
      
      const result = await searchEvents(test.params);
      
      if (result.error) {
        console.error(`❌ ERROR: ${result.error}`);
      } else {
        console.log(`✅ Success! Retrieved ${result.events.length} events`);
        console.log(`RapidAPI events: ${result.sourceStats?.rapidapi?.count || 0}`);
        
        // Print first event as sample
        if (result.events.length > 0) {
          const event = result.events[0];
          console.log(`\nSample event: ${event.title}`);
          console.log(`Date: ${event.date}`);
          console.log(`Location: ${event.location}`);
          console.log(`Category: ${event.category}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR: Exception during test:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testGEMENIRapidAPI().catch(console.error);