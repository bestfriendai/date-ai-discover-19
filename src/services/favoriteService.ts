import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';

// Get all favorite events for the current user
export const getFavorites = async (): Promise<Event[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .select('*, events(*)')
      .eq('user_id', user.id);
    
    if (error) {
      throw error;
    }
    
    // Transform the data to match the Event type
    return data.map((favorite: any) => ({
      id: favorite.event_id,
      title: favorite.events.title,
      description: favorite.events.description,
      date: favorite.events.date,
      time: favorite.events.time,
      location: favorite.events.location,
      venue: favorite.events.venue,
      category: favorite.events.category,
      image: favorite.events.image,
      coordinates: favorite.events.coordinates,
      url: favorite.events.url,
      price: favorite.events.price,
      source: favorite.events.source,
      favorited: true
    }));
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
};

// Add an event to favorites
export const addFavorite = async (event: Event): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // First, ensure the event exists in the events table
    const { error: eventError } = await supabase
      .from('events')
      .upsert({
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time,
        location: event.location,
        venue: event.venue || '',
        category: event.category,
        image: event.image,
        coordinates: event.coordinates,
        url: event.url || '',
        price: event.price || '',
        source: event.source || ''
      }, { onConflict: 'id' });
    
    if (eventError) {
      throw eventError;
    }
    
    // Then add to favorites
    const { error: favoriteError } = await supabase
      .from('favorites')
      .upsert({
        user_id: user.id,
        event_id: event.id
      }, { onConflict: 'user_id, event_id' });
    
    if (favoriteError) {
      throw favoriteError;
    }
    
    return true;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return false;
  }
};

// Remove an event from favorites
export const removeFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
};

// Check if an event is favorited
export const isFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - this is fine
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};
