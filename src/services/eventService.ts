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
      categories: params.categories
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
        const coordStr = localEvent.location_coordinates as string;
        const matches = coordStr.match(/\(([-\d.]+)\s+([-\d.]+)\)/);
        if (matches) {
          coordinates = [parseFloat(matches[1]), parseFloat(matches[2])];
        }
      }

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
        price: typeof localEvent.metadata === 'object' ? localEvent.metadata.price : undefined
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

// Get user's favorite events
export async function getFavoriteEvents(): Promise<Event[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        events (*)
      `)
      .eq('user_id', user.id);
      
    if (error) throw error;
    
    return data.map(favorite => {
      const event = favorite.events;
      return {
        id: event.external_id,
        source: event.source,
        title: event.title,
        description: event.description,
        date: new Date(event.date_start).toISOString().split('T')[0],
        time: new Date(event.date_start).toTimeString().slice(0, 5),
        location: event.location_name,
        venue: event.venue_name,
        category: event.category,
        image: event.image_url,
        url: event.url,
        coordinates: event.location_coordinates ? 
          [
            parseFloat(event.location_coordinates.split('(')[1].split(' ')[0]),
            parseFloat(event.location_coordinates.split(' ')[1].split(')')[0])
          ] : undefined,
        price: event.metadata?.price
      };
    });
  } catch (error) {
    console.error('Error getting favorite events:', error);
    return [];
  }
}

// Toggle favorite status for an event
export async function toggleFavorite(eventId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();
      
    if (existingFavorite) {
      // Remove favorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existingFavorite.id);
        
      if (error) throw error;
      return false;
    } else {
      // Add favorite
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          event_id: eventId
        });
        
      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}
