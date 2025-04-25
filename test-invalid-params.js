import fetch from 'node-fetch';

async function testInvalidParams() {
  const projectRef = 'akwvmljopucsnorvdwuu';
  const functionName = 'search-events';
  const baseUrl = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;
  
  // Use the public anonymous key for invoking deployed functions
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';
  
  console.log('Testing with invalid radius parameter...');
  const invalidRadiusParams = {
    location: "New York",
    radius: "abc", // Invalid radius
    categories: ["music"],
    limit: 20,
    startDate: "2025-04-25"
  };
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(invalidRadiusParams)
    });
    
    const data = await response.json();
    console.log(`Status code: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing invalid radius:', error);
  }
  
  console.log('\nTesting with invalid coordinates...');
  const invalidCoordinatesParams = {
    latitude: 200, // Invalid latitude (> 90)
    longitude: -74.006,
    radius: 50,
    categories: ["music"],
    limit: 20,
    startDate: "2025-04-25"
  };
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(invalidCoordinatesParams)
    });
    
    const data = await response.json();
    console.log(`Status code: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing invalid coordinates:', error);
  }
  
  console.log('\nTesting with missing longitude...');
  const missingLongitudeParams = {
    latitude: 40.7128, // Only latitude, no longitude
    radius: 50,
    categories: ["music"],
    limit: 20,
    startDate: "2025-04-25"
  };
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(missingLongitudeParams)
    });
    
    const data = await response.json();
    console.log(`Status code: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing missing longitude:', error);
  }
}

testInvalidParams();