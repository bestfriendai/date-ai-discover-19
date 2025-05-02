import { supabase } from '@/integrations/supabase/client';
import { invokeFunctionWithRetry } from '@/integrations/supabase/functions-client';
import type { Event } from '@/types';

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
  page?: number;
  excludeIds?: string[];
  fields?: string[];
}

// Fetch events from multiple sources
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  sourceStats?: any;
  meta?: any;
}> {
  console.log('[EVENT_SERVICE] searchEvents called with params:', params);

  try {
    // Ensure all required parameters are present
    const searchParams = {
      startDate: params.startDate || new Date().toISOString(),
      endDate: params.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: params.location || 'New York', // Default location if none provided
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 30, // Default to 30 miles radius
      categories: params.categories || [],
      keyword: params.keyword || '',
      limit: params.limit || 100
    };

    console.log('[EVENT_SERVICE] Processed search params:', searchParams);
    console.log('[EVENT_SERVICE] Calling local search-events-simple function with params:', JSON.stringify(searchParams));

    try {
      // Use our local server instead of the deployed function
      const LOCAL_SERVER_URL = 'http://localhost:3001/functions/v1/search-events-simple';
      
      console.log(`[EVENTS] Calling local server at: ${LOCAL_SERVER_URL}`);
      
      const response = await fetch(LOCAL_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (functionError) {
      console.error('[EVENTS] Error from local server:', functionError);

      // Fallback to direct fetch if the local server fails
      console.log('[EVENTS] Attempting direct fetch fallback...');
      
      // Get the anon key for authorization
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

      const response = await fetch(`https://akwvmljopucsnorvdwuu.supabase.co/functions/v1/search-events-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    }
  } catch (error) {
    console.error('[ERROR] Error searching events:', error);
    return {
      events: [],
      sourceStats: {
        rapidapi: { count: 0, error: String(error) }
      },
      meta: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
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
      const data = await invokeFunctionWithRetry('get-event', { id });

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