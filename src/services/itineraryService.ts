import { supabase } from '@/integrations/supabase/client';
import type { Itinerary, ItineraryItem } from '@/types';

// Get all itineraries for the current user
export async function getUserItineraries(): Promise<Itinerary[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('itineraries')
      .select(`
        id,
        name,
        description,
        date,
        is_public,
        created_at,
        updated_at,
        itinerary_items (
          id,
          event_id,
          title,
          description,
          start_time,
          end_time,
          location_name,
          location_coordinates,
          notes,
          type,
          order
        )
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    return data.map(itinerary => ({
      id: itinerary.id,
      name: itinerary.name,
      description: itinerary.description,
      date: itinerary.date,
      isPublic: itinerary.is_public,
      createdAt: itinerary.created_at,
      updatedAt: itinerary.updated_at,
      items: itinerary.itinerary_items.map(item => ({
        id: item.id,
        eventId: item.event_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        endTime: item.end_time,
        location: item.location_name,
        coordinates: item.location_coordinates ? 
          [
            parseFloat(item.location_coordinates.split('(')[1].split(' ')[0]),
            parseFloat(item.location_coordinates.split(' ')[1].split(')')[0])
          ] : undefined,
        notes: item.notes,
        type: item.type,
        order: item.order
      })).sort((a, b) => a.order - b.order)
    }));
  } catch (error) {
    console.error('Error getting user itineraries:', error);
    return [];
  }
}

// Get a single itinerary by ID
export async function getItineraryById(id: string): Promise<Itinerary | null> {
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .select(`
        id,
        name,
        description,
        date,
        is_public,
        created_at,
        updated_at,
        itinerary_items (
          id,
          event_id,
          title,
          description,
          start_time,
          end_time,
          location_name,
          location_coordinates,
          notes,
          type,
          order
        )
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      date: data.date,
      isPublic: data.is_public,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      items: data.itinerary_items.map(item => ({
        id: item.id,
        eventId: item.event_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        endTime: item.end_time,
        location: item.location_name,
        coordinates: item.location_coordinates ? 
          [
            parseFloat(item.location_coordinates.split('(')[1].split(' ')[0]),
            parseFloat(item.location_coordinates.split(' ')[1].split(')')[0])
          ] : undefined,
        notes: item.notes,
        type: item.type,
        order: item.order
      })).sort((a, b) => a.order - b.order)
    };
  } catch (error) {
    console.error('Error getting itinerary by ID:', error);
    return null;
  }
}

// Create or update an itinerary
export async function saveItinerary(itinerary: Itinerary): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    let itineraryId = itinerary.id;
    
    if (itinerary.id.startsWith('new-')) {
      // Create new itinerary
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          name: itinerary.name,
          description: itinerary.description || '',
          date: itinerary.date,
          is_public: itinerary.isPublic || false
        })
        .select('id')
        .single();
        
      if (error) throw error;
      itineraryId = data.id;
    } else {
      // Update existing itinerary
      const { error } = await supabase
        .from('itineraries')
        .update({
          name: itinerary.name,
          description: itinerary.description || '',
          date: itinerary.date,
          is_public: itinerary.isPublic || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', itinerary.id);
        
      if (error) throw error;
    }
    
    // Delete existing items
    await supabase
      .from('itinerary_items')
      .delete()
      .eq('itinerary_id', itineraryId);
      
    // Insert new items
    if (itinerary.items.length > 0) {
      const itemsToInsert = itinerary.items.map((item, index) => ({
        itinerary_id: itineraryId,
        event_id: item.eventId,
        title: item.title,
        description: item.description || '',
        start_time: item.startTime,
        end_time: item.endTime,
        location_name: item.location || '',
        location_coordinates: item.coordinates ? 
          `POINT(${item.coordinates[0]} ${item.coordinates[1]})` : null,
        notes: item.notes || '',
        type: item.type,
        order: item.order || index
      }));
      
      const { error } = await supabase
        .from('itinerary_items')
        .insert(itemsToInsert);
        
      if (error) throw error;
    }
    
    return itineraryId;
  } catch (error) {
    console.error('Error saving itinerary:', error);
    throw error;
  }
}

// Delete an itinerary
export async function deleteItinerary(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Delete itinerary items first
    const { error: itemsError } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('itinerary_id', id);
      
    if (itemsError) throw itemsError;
    
    // Delete the itinerary
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    throw error;
  }
}
