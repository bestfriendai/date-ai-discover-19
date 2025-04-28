/**
 * Mock implementation for Ticketmaster API when the real API key is missing or invalid
 */

import { Event } from './types.ts';

/**
 * Generate mock Ticketmaster events
 * This is used when the Ticketmaster API key is missing or invalid
 */
export function generateMockTicketmasterEvents(
  latitude?: number,
  longitude?: number,
  keyword?: string,
  limit: number = 5
): Event[] {
  console.log('[TICKETMASTER_MOCK] Generating mock events');
  console.log('[TICKETMASTER_MOCK] Parameters:', { latitude, longitude, keyword, limit });
  
  // Default coordinates if none provided
  const lat = latitude || 34.0522; // Los Angeles
  const lng = longitude || -118.2437;
  
  // Sample venues near the provided coordinates
  const venues = [
    {
      name: "The Wiltern",
      city: "Los Angeles",
      state: "CA",
      address: "3790 Wilshire Blvd",
      coordinates: [lng - 0.01, lat + 0.02]
    },
    {
      name: "Hollywood Bowl",
      city: "Los Angeles",
      state: "CA",
      address: "2301 N Highland Ave",
      coordinates: [lng + 0.03, lat - 0.01]
    },
    {
      name: "The Roxy Theatre",
      city: "West Hollywood",
      state: "CA",
      address: "9009 Sunset Blvd",
      coordinates: [lng - 0.02, lat - 0.03]
    },
    {
      name: "The Troubadour",
      city: "West Hollywood",
      state: "CA",
      address: "9081 Santa Monica Blvd",
      coordinates: [lng - 0.025, lat - 0.015]
    },
    {
      name: "The Echo",
      city: "Los Angeles",
      state: "CA",
      address: "1822 Sunset Blvd",
      coordinates: [lng + 0.015, lat + 0.01]
    }
  ];
  
  // Sample event types
  const eventTypes = [
    { name: "Concert", category: "music" },
    { name: "DJ Night", category: "music" },
    { name: "Live Band", category: "music" },
    { name: "Club Night", category: "party" },
    { name: "Dance Party", category: "party" }
  ];
  
  // Sample artists/events
  const artists = [
    "DJ Sparkle",
    "The Night Owls",
    "Electric Dreams",
    "Midnight Groove",
    "Neon Pulse",
    "Rhythm Collective",
    "Sonic Wave",
    "Velvet Underground Tribute",
    "Funk Masters",
    "Jazz Ensemble"
  ];
  
  // Generate random future dates
  const generateFutureDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days in the future
    return date;
  };
  
  // Filter by keyword if provided
  let filteredArtists = [...artists];
  if (keyword) {
    const keywordLower = keyword.toLowerCase();
    filteredArtists = artists.filter(artist => 
      artist.toLowerCase().includes(keywordLower) ||
      eventTypes.some(type => type.name.toLowerCase().includes(keywordLower))
    );
    
    // If no matches, just use all artists
    if (filteredArtists.length === 0) {
      filteredArtists = [...artists];
    }
  }
  
  // Generate mock events
  const events: Event[] = [];
  const actualLimit = Math.min(limit, filteredArtists.length * eventTypes.length);
  
  for (let i = 0; i < actualLimit; i++) {
    const artistIndex = i % filteredArtists.length;
    const eventTypeIndex = Math.floor(i / filteredArtists.length) % eventTypes.length;
    const venueIndex = i % venues.length;
    
    const artist = filteredArtists[artistIndex];
    const eventType = eventTypes[eventTypeIndex];
    const venue = venues[venueIndex];
    
    const futureDate = generateFutureDate();
    const dateStr = futureDate.toISOString().split('T')[0];
    const timeStr = `${18 + (i % 6)}:00:00`; // Events between 6pm and 11pm
    
    const event: Event = {
      id: `ticketmaster-mock-${i}`,
      source: 'ticketmaster',
      title: `${artist} ${eventType.name}`,
      description: `Join us for an amazing night with ${artist} at ${venue.name}! This ${eventType.name.toLowerCase()} will be an unforgettable experience.`,
      date: dateStr,
      time: timeStr,
      location: `${venue.name}, ${venue.address}, ${venue.city}, ${venue.state}`,
      venue: venue.name,
      category: eventType.category,
      image: `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop`,
      imageAlt: `${artist} at ${venue.name}`,
      coordinates: venue.coordinates as [number, number],
      url: `https://www.ticketmaster.com/event/mock-${i}`,
      price: `$${20 + (i * 5)} - $${50 + (i * 10)}`,
      ticketInfo: {
        price: `$${20 + (i * 5)} - $${50 + (i * 10)}`,
        minPrice: 20 + (i * 5),
        maxPrice: 50 + (i * 10),
        currency: 'USD',
        availability: 'available',
        purchaseUrl: `https://www.ticketmaster.com/event/mock-${i}`,
        provider: 'Ticketmaster'
      },
      websites: {
        official: `https://www.ticketmaster.com/event/mock-${i}`,
        tickets: `https://www.ticketmaster.com/event/mock-${i}`,
        venue: `https://www.ticketmaster.com/venue/${venue.name.toLowerCase().replace(/\s+/g, '-')}`
      }
    };
    
    events.push(event);
  }
  
  console.log(`[TICKETMASTER_MOCK] Generated ${events.length} mock events`);
  return events;
}