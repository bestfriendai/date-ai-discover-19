
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Event, SearchEventsResponse } from "../search-events/types.ts";

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Request received');

    // Parse the request body
    let params;
    try {
      if (req.body) {
        const bodyText = new TextDecoder().decode(await req.arrayBuffer());
        console.log('Request body:', bodyText);
        if (bodyText && bodyText.trim()) {
          params = JSON.parse(bodyText);
        } else {
          params = {};
        }
      } else {
        params = {};
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', details: e.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Parsed params:', params);

    const startTime = Date.now();
    const searchParams = {
      keyword: params.keyword || '',
      latitude: params.lat || params.latitude,
      longitude: params.lng || params.longitude,
      radius: params.radius || 30,
      location: params.location || '',
      startDate: params.startDate,
      endDate: params.endDate,
      categories: params.categories || [],
      limit: params.limit || 100,
      predicthqLocation: params.predicthqLocation || ''
    };

    // Create mock response since this is a simplified version
    const mockEvents: Event[] = generateMockEvents(searchParams);

    const response: SearchEventsResponse = {
      events: mockEvents,
      sourceStats: {
        ticketmaster: { count: mockEvents.length / 4, error: null },
        eventbrite: { count: mockEvents.length / 4, error: null },
        serpapi: { count: mockEvents.length / 4, error: null },
        predicthq: { count: mockEvents.length / 4, error: null }
      },
      meta: {
        executionTime: Date.now() - startTime,
        totalEvents: mockEvents.length,
        eventsWithCoordinates: mockEvents.filter(e => e.coordinates).length,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        events: [],
        sourceStats: {
          ticketmaster: { count: 0, error: 'Service error' },
          eventbrite: { count: 0, error: 'Service error' },
          serpapi: { count: 0, error: 'Service error' },
          predicthq: { count: 0, error: 'Service error' }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateMockEvents(params: any): Event[] {
  const mockEvents: Event[] = [];
  const centerLat = params.latitude || 40.7128;
  const centerLng = params.longitude || -74.0060;
  const count = Math.min(params.limit || 50, 100); // Cap at 100 events

  const categories = ['music', 'sports', 'arts', 'family', 'food', 'party'];
  const venues = ['City Hall', 'Central Park', 'Convention Center', 'Sports Arena', 'Community Center', 'Museum', 'Nightclub', 'The Venue'];
  const eventNames = [
    'Summer Festival', 'Live Concert', 'Art Exhibition',
    'Family Fun Day', 'Food Tasting Event', 'Sports Tournament',
    'Dance Party', 'Night Club Event', 'Comedy Show', 'Theater Performance',
    'Music Festival', 'Cultural Celebration', 'Farmers Market'
  ];

  for (let i = 0; i < count; i++) {
    // Create variation from center point
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Create random dates within the next 30 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30));
    const dateStr = futureDate.toISOString().split('T')[0];

    // Random time
    const hours = String(Math.floor(Math.random() * 24)).padStart(2, '0');
    const minutes = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Generate price with some free events
    const isFree = Math.random() < 0.2; // 20% chance of free event
    const price = isFree ? 'Free' : `$${(Math.random() * 100).toFixed(2)}`;

    // Random venue from the list
    const venue = venues[Math.floor(Math.random() * venues.length)];

    // Event title with category influence
    const baseEventName = eventNames[Math.floor(Math.random() * eventNames.length)];
    const title = `${baseEventName} - ${i + 1}`;

    // Generate description
    const description = `This is a ${category} event happening at ${venue}. Join us for a great time!`;

    // Generate random coordinates near the center point
    const coordinates: [number, number] = [
      centerLng + lngOffset,
      centerLat + latOffset
    ];

    // Calculate mock rank and relevance
    const rank = Math.floor(Math.random() * 100);
    const localRelevance = Math.floor(Math.random() * 100);

    // Set random source
    const sources = ['ticketmaster', 'eventbrite', 'serpapi', 'predicthq'];
    const source = sources[Math.floor(Math.random() * sources.length)];

    // Set random URL
    const url = `https://example.com/events/${i}`;

    // Add random attendance forecast
    const attendance = {
      forecast: Math.floor(Math.random() * 1000),
      actual: Math.random() > 0.7 ? Math.floor(Math.random() * 800) : undefined
    };

    mockEvents.push({
      id: `mock-${source}-${i}`,
      source,
      title,
      description,
      date: dateStr,
      time: timeStr,
      location: `${venue}, New York, NY`,
      venue,
      category,
      image: `https://picsum.photos/seed/${i}/800/400`,
      coordinates,
      url,
      price,
      rank,
      localRelevance,
      attendance,
      demandSurge: Math.random() > 0.8 ? 1 : 0
    });
  }

  return mockEvents;
}
