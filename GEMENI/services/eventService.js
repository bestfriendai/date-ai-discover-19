// Simple mock implementation for testing
export async function searchEvents(params) {
  console.log('[MOCK_EVENT_SERVICE] searchEvents called with params:', params);
  
  // Create mock events based on the search parameters
  const events = [];
  
  // Generate some mock party events
  if (params.categories?.includes('party') || params.keyword?.toLowerCase().includes('party')) {
    events.push({
      id: 'rapidapi_mock1',
      source: 'rapidapi',
      title: 'Miami Beach Party',
      description: 'Join us for an amazing beach party with great music and vibes!',
      date: 'Saturday, May 3, 2025',
      time: '8:00 PM',
      location: 'Miami Beach, FL',
      venue: 'Ocean Drive Beach Club',
      category: 'party',
      partySubcategory: 'day-party',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
      coordinates: [-80.1291, 25.7825],
      longitude: -80.1291,
      latitude: 25.7825,
      url: 'https://example.com/events/beach-party',
      rawDate: '2025-05-03',
      isPartyEvent: true
    });
    
    events.push({
      id: 'rapidapi_mock2',
      source: 'rapidapi',
      title: 'Rooftop Sunset Party',
      description: 'Experience the best sunset views with amazing cocktails and music',
      date: 'Friday, May 2, 2025',
      time: '6:00 PM',
      location: 'New York, NY',
      venue: 'Sky Lounge',
      category: 'party',
      partySubcategory: 'rooftop',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
      coordinates: [-73.9857, 40.7484],
      longitude: -73.9857,
      latitude: 40.7484,
      url: 'https://example.com/events/rooftop-party',
      rawDate: '2025-05-02',
      isPartyEvent: true
    });
    
    events.push({
      id: 'rapidapi_mock3',
      source: 'rapidapi',
      title: 'Club Night: DJ Max',
      description: 'Dance the night away with DJ Max playing the best house music',
      date: 'Saturday, May 3, 2025',
      time: '10:00 PM',
      location: 'Los Angeles, CA',
      venue: 'Neon Nightclub',
      category: 'party',
      partySubcategory: 'club',
      image: 'https://images.unsplash.com/photo-1571266752264-7a0fcc92f6fe?w=800&auto=format&fit=crop',
      coordinates: [-118.2437, 34.0522],
      longitude: -118.2437,
      latitude: 34.0522,
      url: 'https://example.com/events/club-night',
      rawDate: '2025-05-03',
      isPartyEvent: true
    });
  }
  
  // Filter events based on location if provided
  let filteredEvents = events;
  if (params.location) {
    const locationLower = params.location.toLowerCase();
    filteredEvents = events.filter(event => 
      event.location.toLowerCase().includes(locationLower)
    );
  }
  
  // Apply limit if provided
  if (params.limit && filteredEvents.length > params.limit) {
    filteredEvents = filteredEvents.slice(0, params.limit);
  }
  
  // Return the mock results
  return {
    events: filteredEvents,
    sourceStats: {
      rapidapi: {
        count: filteredEvents.length,
        error: null
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      totalEvents: filteredEvents.length,
      page: params.page || 1,
      limit: params.limit || filteredEvents.length,
      hasMore: false
    }
  };
}

// Mock implementation for getEventById
export async function getEventById(id) {
  console.log(`[MOCK_EVENT_SERVICE] getEventById called with ID: ${id}`);
  
  // Return a mock event based on the ID
  if (id === 'rapidapi_mock1') {
    return {
      id: 'rapidapi_mock1',
      source: 'rapidapi',
      title: 'Miami Beach Party',
      description: 'Join us for an amazing beach party with great music and vibes!',
      date: 'Saturday, May 3, 2025',
      time: '8:00 PM',
      location: 'Miami Beach, FL',
      venue: 'Ocean Drive Beach Club',
      category: 'party',
      partySubcategory: 'day-party',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
      coordinates: [-80.1291, 25.7825],
      longitude: -80.1291,
      latitude: 25.7825,
      url: 'https://example.com/events/beach-party',
      rawDate: '2025-05-03',
      isPartyEvent: true
    };
  } else if (id === 'rapidapi_mock2') {
    return {
      id: 'rapidapi_mock2',
      source: 'rapidapi',
      title: 'Rooftop Sunset Party',
      description: 'Experience the best sunset views with amazing cocktails and music',
      date: 'Friday, May 2, 2025',
      time: '6:00 PM',
      location: 'New York, NY',
      venue: 'Sky Lounge',
      category: 'party',
      partySubcategory: 'rooftop',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
      coordinates: [-73.9857, 40.7484],
      longitude: -73.9857,
      latitude: 40.7484,
      url: 'https://example.com/events/rooftop-party',
      rawDate: '2025-05-02',
      isPartyEvent: true
    };
  } else if (id === 'rapidapi_mock3') {
    return {
      id: 'rapidapi_mock3',
      source: 'rapidapi',
      title: 'Club Night: DJ Max',
      description: 'Dance the night away with DJ Max playing the best house music',
      date: 'Saturday, May 3, 2025',
      time: '10:00 PM',
      location: 'Los Angeles, CA',
      venue: 'Neon Nightclub',
      category: 'party',
      partySubcategory: 'club',
      image: 'https://images.unsplash.com/photo-1571266752264-7a0fcc92f6fe?w=800&auto=format&fit=crop',
      coordinates: [-118.2437, 34.0522],
      longitude: -118.2437,
      latitude: 34.0522,
      url: 'https://example.com/events/club-night',
      rawDate: '2025-05-03',
      isPartyEvent: true
    };
  } else {
    return null;
  }
}