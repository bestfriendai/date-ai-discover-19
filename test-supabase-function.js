// Test script for Supabase function
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = 'https://akwvmljopucsnorvdwuu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearchEventsFunction() {
  try {
    console.log('Testing search-events function...');
    
    // Call the search-events function
    const { data, error } = await supabase.functions.invoke('search-events', {
      body: {
        keyword: 'music',
        location: 'New York',
        radius: 10,
        startDate: new Date().toISOString().split('T')[0], // Today
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      }
    });
    
    if (error) {
      console.error('Error calling function:', error);
      return;
    }
    
    console.log('Response received:', {
      totalEvents: data.events?.length || 0,
      sourceStats: data.sourceStats,
      meta: data.meta,
    });
    
    // Check if PredictHQ events were returned
    if (data.sourceStats?.predicthq) {
      console.log('PredictHQ stats:', data.sourceStats.predicthq);
      if (data.sourceStats.predicthq.error) {
        console.error('PredictHQ error:', data.sourceStats.predicthq.error);
      } else {
        console.log(`Successfully fetched ${data.sourceStats.predicthq.count} events from PredictHQ`);
      }
    } else {
      console.error('No PredictHQ stats in response');
    }
    
    // Count events by source
    const eventsBySource = {};
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        const source = event.source || 'unknown';
        eventsBySource[source] = (eventsBySource[source] || 0) + 1;
      });
      console.log('Events by source:', eventsBySource);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSearchEventsFunction();
