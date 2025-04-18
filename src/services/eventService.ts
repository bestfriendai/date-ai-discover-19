
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
      const { data, error } = await supabase.functions.invoke('search-events', {
        body: searchParams
      });

      if (error) {
        console.error('[ERROR] Supabase function error:', error);
        throw error;
      }

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
      return { events: data?.events || [], sourceStats: data?.sourceStats };
    } catch (error) {
      console.error('[ERROR] Error calling Supabase function:', error);
      // Return mock data for development when Supabase function fails
      return { 
        events: [
          {
            id: '1',
            title: 'Hamilton',
            date: 'Sat, May 17',
            time: '07:00 PM',
            location: 'Richard Rodgers Theatre-NY',
            category: 'arts & theatre',
            image: '/lovable-uploads/hamilton.jpg',
            coordinates: [-73.9866, 40.7592],
            price: "$89.00"
          },
          {
            id: '2',
            title: 'Harry Potter and the Cursed Child',
            date: 'Mon, May 19',
            time: '07:00 PM',
            location: 'Lyric Theatre - NY',
            category: 'arts & theatre',
            image: '/lovable-uploads/harry-potter.jpg',
            coordinates: [-73.9876, 40.7562],
            price: "$69.00"
          },
          {
            id: '3',
            title: 'The Lion King',
            date: 'Tue, May 20',
            time: '08:00 PM',
            location: 'Minskoff Theatre - NY',
            category: 'arts & theatre',
            image: '/lovable-uploads/hamilton.jpg',
            coordinates: [-73.9856, 40.7582],
            price: "$119.00"
          },
          {
            id: '4',
            title: 'Aladdin',
            date: 'Wed, May 21',
            time: '07:30 PM',
            location: 'New Amsterdam Theatre - NY',
            category: 'arts & theatre',
            image: '/lovable-uploads/harry-potter.jpg',
            coordinates: [-73.9886, 40.7552],
            price: "$79.00"
          },
          {
            id: '5',
            title: 'Wicked',
            date: 'Thu, May 22',
            time: '07:00 PM',
            location: 'Gershwin Theatre - NY',
            category: 'arts & theatre',
            image: '/lovable-uploads/hamilton.jpg',
            coordinates: [-73.9846, 40.7602],
            price: "$99.00"
          }
        ],
        sourceStats: { 
          mock: { count: 5, error: null } 
        }
      };
    }
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
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

// This function has been moved to favoriteService.ts
// Keeping this comment as a reference

// This function has been moved to favoriteService.ts
// Keeping this comment as a reference
