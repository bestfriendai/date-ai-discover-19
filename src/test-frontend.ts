/**
 * Frontend test script to verify the integration with Supabase functions
 * 
 * This script tests the entire flow from the frontend to the Supabase functions and back.
 * Run this script with: npx ts-node --esm src/test-frontend.ts
 */

// @ts-ignore - Import the services
import { searchEvents, getEventById } from './services/eventService';

// Test parameters for searchEvents
const searchParams = {
  query: 'music',
  location: 'New York',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  category: 'music',
  limit: 10
};

// Function to test searchEvents
async function testSearchEvents() {
  console.log('\n🧪 Testing searchEvents function...');
  console.log('📝 Test parameters:', searchParams);
  
  try {
    console.log('⏳ Calling searchEvents...');
    const startTime = performance.now();
    
    const result = await searchEvents(searchParams);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ searchEvents completed in ${duration.toFixed(2)}ms`);
    console.log(`✅ Received ${result.events?.length || 0} events`);
    
    if (result.metadata) {
      console.log('📊 Metadata:', result.metadata);
    }
    
    // Log the first event if available
    if (result.events && result.events.length > 0) {
      console.log('\n📋 First event sample:');
      const event = result.events[0];
      console.log('  ID:', event.id);
      console.log('  Title:', event.title);
      console.log('  Source:', event.source);
      console.log('  Date:', event.date);
      console.log('  Time:', event.time || 'N/A');
      console.log('  Location:', event.location);
      console.log('  Category:', event.category);
      
      // Test getEventById with this event's ID
      return event.id;
    } else {
      console.log('⚠️ No events found');
      return null;
    }
  } catch (error) {
    console.error('❌ searchEvents failed with error:', error);
    return null;
  }
}

// Function to test getEventById
async function testGetEventById(eventId: string) {
  if (!eventId) {
    console.log('⚠️ Skipping getEventById test: No event ID available');
    return;
  }
  
  console.log(`\n🧪 Testing getEventById function with ID: ${eventId}...`);
  
  try {
    console.log('⏳ Calling getEventById...');
    const startTime = performance.now();
    
    const event = await getEventById(eventId);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ getEventById completed in ${duration.toFixed(2)}ms`);
    
    if (event) {
      console.log('✅ Event found');
      console.log('  Title:', event.title);
      console.log('  Description:', event.description?.substring(0, 100) + '...');
      console.log('  Date:', event.date);
      console.log('  Location:', event.location);
      console.log('  Category:', event.category);
    } else {
      console.log('⚠️ Event not found');
    }
  } catch (error) {
    console.error('❌ getEventById failed with error:', error);
  }
}

// Function to test cache performance
async function testCachePerformance() {
  console.log('\n🧪 Testing cache performance...');
  
  try {
    // First call to fill the cache
    console.log('⏳ First call to searchEvents (should populate cache)...');
    let startTime = performance.now();
    await searchEvents(searchParams);
    let endTime = performance.now();
    let duration = endTime - startTime;
    console.log(`✅ First call completed in ${duration.toFixed(2)}ms`);
    
    // Second call to test cache hit
    console.log('⏳ Second call to searchEvents (should hit cache)...');
    startTime = performance.now();
    await searchEvents(searchParams);
    endTime = performance.now();
    duration = endTime - startTime;
    console.log(`✅ Second call completed in ${duration.toFixed(2)}ms`);
    
    // Should be significantly faster on the second call
  } catch (error) {
    console.error('❌ Cache test failed with error:', error);
  }
}

// Run the tests
async function runTests() {
  try {
    // Test searchEvents
    const eventId = await testSearchEvents();
    
    // Test getEventById
    if (eventId) {
      await testGetEventById(eventId);
    }
    
    // Test cache performance
    await testCachePerformance();
    
    console.log('\n🏁 All tests completed.');
  } catch (error) {
    console.error('❌ Tests failed with error:', error);
  }
}

// Run the tests
runTests();
