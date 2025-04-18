import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { normalizeTicketmasterEvent, normalizeSerpApiEvent } from '@/utils/eventNormalizers';

interface SearchParams {
  keyword?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  limit?: number;
  excludeIds?: string[];
  fields?: string[];
}

// Fetch events from multiple sources
export async function searchEvents(params: SearchParams): Promise<{ events: Event[]; sourceStats?: any }> {
  try {
    // Prepare parameters for API calls
    const searchParams = {
      keyword: params.keyword || '',
      lat: params.latitude,
      lng: params.longitude,
      location: params.location,
      radius: params.radius || 30, // Default radius set to 30 miles
      startDate: params.startDate,
      endDate: params.endDate,
      categories: params.categories,
      limit: params.limit || 50, // Default limit
      excludeIds: params.excludeIds || [],
      fields: params.fields || []
    };

    console.log('[DEBUG] Sending search params to search-events function:', searchParams);

    try {
      // Call Supabase function to fetch events from multiple sources
      console.log('[DEBUG] About to call supabase.functions.invoke("search-events")');
      const { data, error } = await supabase.functions.invoke('search-events', {
        body: searchParams
      });

      if (error) {
        console.error('[ERROR] Supabase function error:', error);
        throw error;
      }

      console.log('[DEBUG] Supabase function response:', data);

      if (data?.sourceStats) {
        console.log(
          `[Events] Ticketmaster: ${data.sourceStats.ticketmaster.count} ${data.sourceStats.ticketmaster.error ? `(Error: ${data.sourceStats.ticketmaster.error})` : ''}`
        );
        console.log(
          `[Events] Eventbrite: ${data.sourceStats.eventbrite.count} ${data.sourceStats.eventbrite.error ? `(Error: ${data.sourceStats.eventbrite.error})` : ''}`
        );
        console.log(
          `[Events] Serpapi: ${data.sourceStats.serpapi.count} ${data.sourceStats.serpapi.error ? `(Error: ${data.sourceStats.serpapi.error})` : ''}`
        );
      }
      
      // Check if we have events before returning
      if (!data?.events || data.events.length === 0) {
        console.log('[DEBUG] No events returned from API, using mock data');
        // If no events were returned, use mock data for testing
        return getMockEvents(searchParams);
      }
      
      return { events: data.events || [], sourceStats: data?.sourceStats };
    } catch (error) {
      console.error('[ERROR] Error calling Supabase function:', error);
      console.log('[DEBUG] Falling back to mock data');
      // Return mock data for development when Supabase function fails
      return getMockEvents(searchParams);
    }
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
}

// Helper function to get mock data around the provided coordinates
function getMockEvents(params: any): { events: Event[]; sourceStats?: any } {
  console.log('[DEBUG] Generating mock events around', params.lat, params.lng);
  
  // Generate mock events around the specified coordinates
  const centerLat = params.lat || 40.7128;
  const centerLng = params.lng || -74.0060;
  const mockEvents: Event[] = [];
  
  // Generate events in a grid around the center
  for (let i = 0; i < 10; i++) {
    // Create a variation from the center point (about 0.01 degrees is roughly 1 km)
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;
    
    mockEvents.push({
      id: `mock-${i}`,
      title: `Mock Event ${i}`,
      date: 'Sat, May 17',
      time: '07:00 PM',
      location: 'Mock Location',
      category: ['music', 'sports', 'arts & theatre', 'family', 'food'][i % 5],
      image: '/lovable-uploads/hamilton.jpg',
      coordinates: [centerLng + lngOffset, centerLat + latOffset],
      price: `$${Math.floor(Math.random() * 100)}.00`,
      description: 'This is a mock event for testing purposes'
    });
  }
  
  return { 
    events: mockEvents,
    sourceStats: { 
      mock: { count: mockEvents.length, error: null } 
    }
  };
}

// Get event details by ID
export async function getEventById(id: string): Promise<Event | null> {
  try {
    const { data: localEvent } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (localEvent) {
      let coordinates: [number, number] | undefined;

      if (localEvent.location_coordinates) {
        const coordStr = typeof localEvent.location_coordinates === 'string'
          ? localEvent.location_coordinates
          : '';

        const matches = coordStr.match(/\(([-\d.]+)\s+([-\d.]+)\)/);
        if (matches) {
          coordinates = [parseFloat(matches[1]), parseFloat(matches[2])];
        }
      }

      const metadata = localEvent.metadata || {};
      const price = typeof metadata === 'object' && 'price' in metadata
        ? metadata.price as string
        : undefined;

      return {
        id: localEvent.external_id,
        source: localEvent.source,
        title: localEvent.title,
        description: localEvent.description,
        date: new Date(localEvent.date_start).toISOString().split('T')[0],
        time: new Date(localEvent.date_start).toTimeString().slice(0, 5),
        location: localEvent.location_name,
        venue: localEvent.venue_name,
        category: localEvent.category,
        image: localEvent.image_url,
        url: localEvent.url,
        coordinates,
        price
      };
    }

    // If not in local database, fetch from API
    const { data, error } = await supabase.functions.invoke('get-event', {
      body: JSON.stringify({ id })
    });

    if (error) throw error;
    if (!data?.event) return null;

    return data.event;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    throw error;
  }
}
