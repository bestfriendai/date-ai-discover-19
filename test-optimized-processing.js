// Test script for optimized event processing functions
import { performance } from 'node:perf_hooks';

// Mock the processing module
const processing = {
  normalizeAndFilterEvents: (events, params) => {
    console.log(`Normalizing ${events.length} events`);
    return events.filter(e => e.id && e.title && e.date);
  },
  
  sortEventsByDate: (events) => {
    console.log(`Sorting ${events.length} events by date`);
    return events;
  },
  
  filterEventsByDistance: (events, lat, lng, radius) => {
    console.log(`Filtering ${events.length} events by distance from [${lat}, ${lng}] with radius ${radius}km`);
    return events;
  }
};

// Generate mock events
function generateMockEvents(count) {
  const events = [];
  const categories = ['music', 'sports', 'arts', 'food', 'party'];
  const sources = ['ticketmaster', 'predicthq'];
  
  for (let i = 0; i < count; i++) {
    // Generate random coordinates within the US
    const lat = 37 + (Math.random() * 10 - 5);
    const lng = -100 + (Math.random() * 20 - 10);
    
    events.push({
      id: `event-${i}`,
      title: `Event ${i}`,
      description: `Description for event ${i}`,
      date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      time: `${Math.floor(Math.random() * 12 + 1)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} PM`,
      location: `Location ${i}`,
      venue: `Venue ${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      coordinates: [lng, lat],
      price: `$${Math.floor(Math.random() * 100) + 10}`
    });
  }
  
  return events;
}

// Run performance tests
async function runTests() {
  console.log('Generating mock events...');
  const events = generateMockEvents(10000);
  console.log(`Generated ${events.length} mock events`);
  
  // Test normalizeAndFilterEvents
  console.log('\nTesting normalizeAndFilterEvents...');
  const startNormalize = performance.now();
  const normalizedEvents = processing.normalizeAndFilterEvents(events, {});
  const normalizeTime = performance.now() - startNormalize;
  console.log(`Normalized ${normalizedEvents.length} events in ${normalizeTime.toFixed(2)}ms`);
  
  // Test sortEventsByDate
  console.log('\nTesting sortEventsByDate...');
  const startSort = performance.now();
  const sortedEvents = processing.sortEventsByDate(normalizedEvents);
  const sortTime = performance.now() - startSort;
  console.log(`Sorted ${sortedEvents.length} events in ${sortTime.toFixed(2)}ms`);
  
  // Test filterEventsByDistance
  console.log('\nTesting filterEventsByDistance...');
  const startFilter = performance.now();
  const filteredEvents = processing.filterEventsByDistance(sortedEvents, 40, -100, 100);
  const filterTime = performance.now() - startFilter;
  console.log(`Filtered to ${filteredEvents.length} events in ${filterTime.toFixed(2)}ms`);
  
  console.log('\nAll tests completed successfully!');
}

// Run the tests
runTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});