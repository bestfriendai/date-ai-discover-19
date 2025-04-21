// Direct test for PredictHQ API
import fetch from 'node-fetch';

// This is a simplified version of the fetchPredictHQEvents function
async function testPredictHQAPI() {
  // You'll need to replace this with your actual API key
  const apiKey = 'YOUR_PREDICTHQ_API_KEY';
  
  // Parameters similar to what we'd use in the application
  const params = {
    location: undefined, // Test the case where location is undefined
    latitude: undefined,
    longitude: undefined,
    radius: 10,
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    categories: ['music'],
    keyword: 'concert',
    limit: 10
  };
  
  try {
    console.log('Testing PredictHQ API directly...');
    console.log('Parameters:', params);
    
    // Build the PredictHQ API URL
    let url = 'https://api.predicthq.com/v1/events/';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add location parameters (either coordinates or place name)
    if (params.latitude && params.longitude) {
      // Convert radius from miles to km (PredictHQ uses km)
      const radiusKm = Math.round(params.radius * 1.60934);
      queryParams.append('within', `${radiusKm}km@${params.latitude},${params.longitude}`);
      console.log(`Using coordinates: ${params.latitude},${params.longitude} with radius ${radiusKm}km`);
    } else if (params.location) {
      console.log(`Using location as place name: ${params.location}`);
      queryParams.append('place.name', params.location);
    } else {
      // Default to a popular location if none provided
      console.log('No location or coordinates provided, using default location');
      queryParams.append('place.name', 'New York');
    }
    
    // Always filter for future events
    const now = new Date();
    now.setHours(now.getHours() - 1);
    const today = now.toISOString().split('T')[0];
    
    // Use start.gte instead of active.gte to ensure we only get events that haven't started yet
    queryParams.append('start.gte', params.startDate || today);
    
    // Also add a sort parameter to get the soonest events first
    queryParams.append('sort', 'start');
    
    // Add end date if provided
    if (params.endDate) {
      queryParams.append('active.lte', params.endDate);
    }
    
    // Add keyword search
    if (params.keyword) {
      queryParams.append('q', params.keyword);
    }
    
    // Add category filters
    if (params.categories && params.categories.length > 0) {
      // Map our categories to PredictHQ categories
      const categoryMap = {
        'music': ['concerts', 'festivals'],
        'sports': ['sports'],
        'arts': ['performing-arts', 'community', 'expos'],
        'family': ['community', 'expos'],
        'food': ['food-drink']
      };
      
      const predictHQCategories = params.categories
        .flatMap(cat => categoryMap[cat] || [])
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      
      if (predictHQCategories.length > 0) {
        queryParams.append('category', predictHQCategories.join(','));
      }
    }
    
    // Add limit parameter
    queryParams.append('limit', params.limit.toString());
    
    // Add include parameters for additional data
    queryParams.append('include', 'location,entities,place,category,description');
    
    // Append query parameters to URL
    url += `?${queryParams.toString()}`;
    
    console.log('API URL:', url);
    
    // Make the API request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      return;
    }
    
    // Parse the response
    const data = await response.json();
    console.log('API response:', {
      count: data.count,
      resultsCount: data.results?.length || 0
    });
    
    // Log the first result for debugging if available
    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      console.log('First result sample:', {
        id: firstResult.id,
        title: firstResult.title,
        start: firstResult.start,
        location: firstResult.location,
        hasCoordinates: Array.isArray(firstResult.location) && firstResult.location.length === 2
      });
    } else {
      console.log('No results returned');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPredictHQAPI();
