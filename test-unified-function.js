// Test script for the unified search-events function
// To run this script:
// 1. Install node-fetch if not already installed: npm install node-fetch
// 2. Run the script: node test-unified-function.js

import fetch from 'node-fetch';

async function testSearchEvents() {
  try {
    console.log('Testing search-events-unified function...');

    // Use the correct Supabase project URL
    const SUPABASE_URL = 'https://akwvmljopucsnorvdwuu.supabase.co';

    // Use the unified function that works reliably
    let functionUrl = `${SUPABASE_URL}/functions/v1/search-events-unified`;

    console.log('Using function URL:', functionUrl);

    // Test parameters
    const params = {
      latitude: 34.0522,
      longitude: -118.2437,
      radius: 25,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      categories: ['music', 'arts'],
      limit: 50
    };

    console.log('Request parameters:', params);

    try {
      // Make the request
      console.log('Sending request to:', functionUrl);
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk'
        },
        body: JSON.stringify(params)
      });

      // Check response status
      console.log('Response status:', response.status);

      // Parse response
      const data = await response.json();

      // Log summary
      console.log('Response summary:');
      console.log('- Total events:', data.events?.length || 0);
      console.log('- Ticketmaster events:', data.sourceStats?.ticketmaster?.count || 0);
      console.log('- PredictHQ events:', data.sourceStats?.predicthq?.count || 0);
      console.log('- Execution time:', data.meta?.executionTime || 'N/A', 'ms');

      // Check for errors or warnings
      if (data.error) {
        console.error('Error:', data.error);
        console.error('Details:', data.details);
      } else if (data.warning) {
        console.warn('Warning:', data.warning);
      }

      // Check API errors
      if (data.sourceStats?.ticketmaster?.error) {
        console.warn('Ticketmaster API error:', data.sourceStats.ticketmaster.error);
      }
      if (data.sourceStats?.predicthq?.error) {
        console.warn('PredictHQ API error:', data.sourceStats.predicthq.error);
      }

      // Log events if available
      if (data.events && data.events.length > 0) {
        // Log first 3 events as sample
        console.log('\nSample events:');
        const sampleEvents = data.events.slice(0, 3);
        sampleEvents.forEach((event, index) => {
          console.log(`\nEvent ${index + 1}:`);
          console.log('- ID:', event.id);
          console.log('- Source:', event.source);
          console.log('- Title:', event.title);
          console.log('- Date/Time:', event.date, event.time);
          console.log('- Location:', event.location);
          console.log('- Category:', event.category);
          console.log('- Has coordinates:', !!event.coordinates);
          console.log('- URL:', event.url || 'N/A');
        });
      } else {
        console.log('\nNo events returned');
      }
    } catch (error) {
      console.error('Error making request:', error);
    }

    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSearchEvents();
