// Script to test the rapidapi-events function
const fetch = require('node-fetch');

// Configuration
const projectRef = 'akwvmljopucsnorvdwuu';
const functionName = 'rapidapi-events';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NzA5NzcsImV4cCI6MjAyNTE0Njk3N30.Nh83ebqzf8AeSj3qE9-0-DRUTAl6t5q3TKctF6LabJY';

// Test parameters
const testParams = [
  {
    name: 'Location-based search',
    params: {
      location: 'New York',
      radius: 30,
      categories: ['party']
    }
  },
  {
    name: 'Coordinate-based search',
    params: {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 30,
      categories: ['party']
    }
  },
  {
    name: 'Keyword search',
    params: {
      location: 'Los Angeles',
      keyword: 'festival',
      radius: 30
    }
  }
];

// Function to test the rapidapi-events function
async function testRapidAPIEvents() {
  console.log(`Testing ${functionName} function...`);
  
  for (const test of testParams) {
    console.log(`\n--- Test: ${test.name} ---`);
    console.log('Parameters:', JSON.stringify(test.params, null, 2));
    
    try {
      const response = await fetch(`https://${projectRef}.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(test.params)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText.substring(0, 500)}...`);
        continue;
      }
      
      const data = await response.json();
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Events found: ${data.events.length}`);
      console.log(`Search query used: ${data.meta.searchQuery || 'Not specified'}`);
      
      if (data.events.length > 0) {
        console.log('\nSample event:');
        const sampleEvent = data.events[0];
        console.log(`- Title: ${sampleEvent.title}`);
        console.log(`- Date: ${sampleEvent.date} ${sampleEvent.time}`);
        console.log(`- Location: ${sampleEvent.location}`);
        console.log(`- Category: ${sampleEvent.category}${sampleEvent.partySubcategory ? ` (${sampleEvent.partySubcategory})` : ''}`);
        console.log(`- Image: ${sampleEvent.image.substring(0, 100)}...`);
        console.log(`- URL: ${sampleEvent.url || 'Not specified'}`);
        console.log(`- Ticket URL: ${sampleEvent.ticketUrl || sampleEvent.websites?.tickets || 'Not specified'}`);
      } else {
        console.log('No events found.');
        if (data.error) {
          console.error(`Error: ${data.error}`);
        }
      }
    } catch (error) {
      console.error(`Error testing ${test.name}:`, error.message);
    }
  }
  
  console.log('\nTesting completed!');
}

// Run the test
testRapidAPIEvents();
