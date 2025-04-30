import { Event } from '../types';
import { supabase } from '../lib/supabase';

export interface SearchEventsParams {
  keyword?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  limit?: number;
  page?: number;
  excludeIds?: string[];
  fields?: string[]; // Added this missing field
}

export interface SearchEventsResponse {
  events: Event[];
  sourceStats?: {
    rapidapi?: {
      count: number;
      error: string | null;
    };
    ticketmaster?: {
      count: number;
      error: string | null;
    };
    eventbrite?: {
      count: number;
      error: string | null;
    };
  };
  meta?: {
    timestamp: string;
    totalEvents?: number;
    hasMore?: boolean;
  };
  error?: string;
}

// Unified function to search for events
export async function searchEvents(params: SearchEventsParams): Promise<SearchEventsResponse> {
  console.log('[EVENT_SERVICE] Searching for events with params:', params);
  
  try {
    // Call our Supabase edge function
    const { data, error } = await supabase.functions.invoke('fetch-events', {
      body: params,
    });

    // Check for errors
    if (error) {
      console.error('[EVENT_SERVICE] Error searching events:', error);
      return { events: [], error: `Error searching events: ${error.message}` };
    }

    // Log the response for debugging
    console.log(`[EVENT_SERVICE] Received ${data?.events?.length || 0} events`);
    
    // If we have source stats, log them
    if (data?.sourceStats) {
      console.log('[EVENT_SERVICE] Source stats:', data.sourceStats);
      
      // Log RapidAPI specific info if available
      if (data.sourceStats.rapidapi) {
        console.log(
          `[EVENT_SERVICE] RapidAPI: ${data.sourceStats.rapidapi.count} events ${
            data.sourceStats.rapidapi.error ? `(Error: ${data.sourceStats.rapidapi.error})` : ''
          }`
        );
      }
    }

    return data;
  } catch (error) {
    console.error('[EVENT_SERVICE] Exception searching events:', error);
    return { 
      events: [], 
      error: `Exception searching events: ${error instanceof Error ? error.message : String(error)}` 
    };
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

    // If not in local database, fetch from API with our custom function client
    try {
      console.log(`[EVENT] Fetching event details for ID: ${id}`);
      const { data } = await supabase.functions.invoke('get-event', { 
        body: { id } 
      });

      if (!data?.event) {
        console.warn(`[EVENT] No event data returned for ID: ${id}`);
        return null;
      }

      return data.event;
    } catch (error) {
      console.error('[ERROR] Error fetching event by ID:', error);
      return null;
    }
  } catch (error) {
    console.error('Error getting event by ID:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}
