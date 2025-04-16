import { supabase } from '@/integrations/supabase/client';
import type { Itinerary, ItineraryItem } from '@/types';

export async function getItineraries(): Promise<Itinerary[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('itineraries')
      .select(`
        *,
        items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(itinerary => ({
      id: itinerary.id,
      name: itinerary.name,
      description: itinerary.description || '',
      date: itinerary.date,
      items: (itinerary.items || []).map(item => {
        let coords: [number, number] | undefined;
        if (item.coordinates && Array.isArray(item.coordinates) && item.coordinates.length === 2) {
          coords = [item.coordinates[0], item.coordinates[1]];
        }
        
        return {
          id: item.id,
          eventId: item.event_id,
          title: item.title,
          description: item.description || '',
          startTime: item.start_time,
          endTime: item.end_time,
          location: item.location || '',
          coordinates: coords,
          notes: item.notes || '',
          type: item.type,
          order: item.order || 0
        };
      }).sort((a, b) => a.order - b.order),
      isPublic: itinerary.is_public || false,
      createdAt: itinerary.created_at,
      updatedAt: itinerary.updated_at
    }));
  } catch (error) {
    console.error('Error getting itineraries:', error);
    return [];
  }
}

export async function getItineraryById(id: string): Promise<Itinerary | null> {
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .select(`
        *,
        items (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting itinerary by ID:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      date: data.date,
      items: (data.items || []).map(item => {
        let coords: [number, number] | undefined;
        if (item.coordinates && Array.isArray(item.coordinates) && item.coordinates.length === 2) {
          coords = [item.coordinates[0], item.coordinates[1]];
        }
        return {
          id: item.id,
          eventId: item.event_id,
          title: item.title,
          description: item.description || '',
          startTime: item.start_time,
          endTime: item.end_time,
          location: item.location || '',
          coordinates: coords,
          notes: item.notes || '',
          type: item.type,
          order: item.order || 0
        };
      }).sort((a, b) => a.order - b.order),
      isPublic: data.is_public || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error getting itinerary by ID:', error);
    return null;
  }
}

export async function createItinerary(itinerary: Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'>): Promise<Itinerary | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('itineraries')
      .insert({
        user_id: user.id,
        name: itinerary.name,
        description: itinerary.description,
        date: itinerary.date,
        is_public: itinerary.isPublic,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      date: data.date,
      items: [],
      isPublic: data.is_public || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error creating itinerary:', error);
    return null;
  }
}

export async function updateItinerary(id: string, updates: Partial<Itinerary>): Promise<Itinerary | null> {
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      date: data.date,
      items: [],
      isPublic: data.is_public || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error updating itinerary:', error);
    return null;
  }
}

export async function deleteItinerary(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    return false;
  }
}

export async function addItineraryItem(itineraryId: string, item: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem | null> {
  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        itinerary_id: itineraryId,
        event_id: item.eventId,
        title: item.title,
        description: item.description,
        start_time: item.startTime,
        end_time: item.endTime,
        location: item.location,
        coordinates: item.coordinates,
        notes: item.notes,
        type: item.type,
        order: item.order
      })
      .select()
      .single();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      eventId: data.event_id,
      title: data.title,
      description: data.description || '',
      startTime: data.start_time,
      endTime: data.end_time,
      location: data.location || '',
      coordinates: data.coordinates,
      notes: data.notes || '',
      type: data.type,
      order: data.order || 0
    };
  } catch (error) {
    console.error('Error adding itinerary item:', error);
    return null;
  }
}

export async function updateItineraryItem(id: string, updates: Partial<ItineraryItem>): Promise<ItineraryItem | null> {
  try {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

     if (!data) return null;

    return {
      id: data.id,
      eventId: data.event_id,
      title: data.title,
      description: data.description || '',
      startTime: data.start_time,
      endTime: data.end_time,
      location: data.location || '',
      coordinates: data.coordinates,
      notes: data.notes || '',
      type: data.type,
      order: data.order || 0
    };
  } catch (error) {
    console.error('Error updating itinerary item:', error);
    return null;
  }
}

export async function deleteItineraryItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting itinerary item:', error);
    return false;
  }
}
