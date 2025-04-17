
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
      excludeIds: params.excludeIds || []
    };

    // Call Supabase function to fetch events from multiple sources
    const { data, error } = await supabase.functions.invoke('search-events', {
      body: searchParams
    });

    if (error) throw error;

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
