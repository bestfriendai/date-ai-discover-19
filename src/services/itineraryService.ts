import { supabase } from '@/integrations/supabase/client';
import errorReporter from '../utils/errorReporter';
import type { Itinerary, ItineraryItem } from '@/types';

/**
 * Get all itineraries for the current user
 */
export async function getItineraries(): Promise<Itinerary[]> {
  console.log('[itineraryService] Getting all itineraries');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) {
      errorReporter('[itineraryService] Error fetching itineraries:', error);
      throw error;
    }
    if (!data) return [];

    // Get items for each itinerary
    const itinerariesWithItems: Itinerary[] = [];

    for (const itinerary of data) {
      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('itinerary_id', itinerary.id)
        .order('order', { ascending: true });

      if (itemsError) {
        errorReporter('[itineraryService] Error fetching itinerary items:', itemsError);
        continue;
      }

      const formattedItems: ItineraryItem[] = (items || []).map(item => ({
        id: item.id,
        eventId: item.event_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        endTime: item.end_time,
        location: item.location_name,
        coordinates: item.location_coordinates,
        notes: item.notes,
        type: item.type as "EVENT" | "CUSTOM",
        order: item.order
      }));

      itinerariesWithItems.push({
        id: itinerary.id,
        name: itinerary.name,
        description: itinerary.description,
        date: itinerary.date,
        items: formattedItems,
        isPublic: itinerary.is_public,
        createdAt: itinerary.created_at,
        updatedAt: itinerary.updated_at
      });
    }

    return itinerariesWithItems;
  } catch (error) {
    console.error('Error getting itineraries:', error);
    errorReporter('Error getting itineraries:', error);
    return [];
  }
}

/**
 * Get a specific itinerary by ID
 */
export async function getItinerary(id: string): Promise<Itinerary | null> {
  console.log('[itineraryService] Getting itinerary with ID:', id);
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      errorReporter('[itineraryService] Error fetching itinerary:', error);
      throw error;
    }
    if (!data) {
      console.log('[itineraryService] No itinerary found with ID:', id);
      return null;
    }
    console.log('[itineraryService] Found itinerary:', data);

    const { data: items, error: itemsError } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('itinerary_id', id)
      .order('order', { ascending: true });

    if (itemsError) {
      errorReporter('[itineraryService] Error fetching itinerary items:', itemsError);
      throw itemsError;
    }
    console.log('[itineraryService] Found itinerary items:', items?.length || 0);

    const formattedItems: ItineraryItem[] = (items || []).map(item => ({
      id: item.id,
      eventId: item.event_id,
      title: item.title,
      description: item.description,
      startTime: item.start_time,
      endTime: item.end_time,
      location: item.location_name,
      coordinates: item.location_coordinates,
      notes: item.notes,
      type: item.type as "EVENT" | "CUSTOM",
      order: item.order
    }));

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      date: data.date,
      items: formattedItems,
      isPublic: data.is_public,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error getting itinerary:', error);
    errorReporter('Error getting itinerary:', error);
    return null;
  }
}

/**
 * Create a new itinerary
 */
export async function createItinerary(data: {
  name: string;
  description?: string;
  date: string;
  items?: ItineraryItem[];
  isPublic?: boolean;
}): Promise<Itinerary | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .insert({
        name: data.name,
        description: data.description || '',
        date: data.date,
        is_public: data.isPublic || false,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      errorReporter('[itineraryService] Error creating itinerary:', error);
      throw error;
    }
    if (!itinerary) return null;

    // Insert items if provided
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map((item, index) => ({
        itinerary_id: itinerary.id,
        event_id: item.eventId,
        title: item.title,
        description: item.description || '',
        start_time: item.startTime,
        end_time: item.endTime,
        location: item.location || '',
        coordinates: item.coordinates,
        notes: item.notes || '',
        type: item.type,
        order: index
      }));

      const { error: itemsError } = await supabase
        .from('itinerary_items')
        .insert(itemsToInsert);

      if (itemsError) {
        errorReporter('[itineraryService] Error creating itinerary items:', itemsError);
        throw itemsError;
      }
    }

    return {
      id: itinerary.id,
      name: itinerary.name,
      description: itinerary.description,
      date: itinerary.date,
      items: data.items || [],
      isPublic: itinerary.is_public,
      createdAt: itinerary.created_at,
      updatedAt: itinerary.updated_at
    };
  } catch (error) {
    console.error('Error creating itinerary:', error);
    errorReporter('Error creating itinerary:', error);
    return null;
  }
}

/**
 * Update an existing itinerary
 */
export async function updateItinerary(
  id: string,
  data: {
    name?: string;
    description?: string;
    date?: string;
    items?: ItineraryItem[];
    isPublic?: boolean;
    preserveItems?: boolean; // If true, don't delete existing items when updating
  }
): Promise<Itinerary | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, get the current itinerary to verify ownership
    const { data: currentItinerary, error: getError } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (getError || !currentItinerary) {
      throw new Error('Itinerary not found or access denied');
    }

    // Update the itinerary
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('itineraries')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        errorReporter('[itineraryService] Error updating itinerary:', updateError);
        throw updateError;
      }
    }

    // Update items if provided
    if (data.items !== undefined) {
      if (!data.preserveItems) {
        // First, delete all existing items
        const { error: deleteError } = await supabase
          .from('itinerary_items')
          .delete()
          .eq('itinerary_id', id);

        if (deleteError) {
          errorReporter('[itineraryService] Error deleting itinerary items:', deleteError);
          throw deleteError;
        }
      }

      // Then insert the new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => {
          // For existing items that have a real UUID, we'll upsert them
          // For new items with custom IDs (e.g., custom-123456), we'll generate new IDs
          const isExistingItem = item.id && !item.id.startsWith('custom-');

          return {
            id: isExistingItem ? item.id : undefined, // Let Supabase generate ID for new items
            itinerary_id: id,
            event_id: item.eventId,
            title: item.title,
            description: item.description || '',
            start_time: item.startTime,
            end_time: item.endTime,
            location: item.location || '',
            coordinates: item.coordinates,
            notes: item.notes || '',
            type: item.type,
            order: item.order !== undefined ? item.order : index
          };
        });

        const { error: insertError } = await supabase
          .from('itinerary_items')
          .upsert(itemsToInsert, { onConflict: 'id' });

        if (insertError) {
          errorReporter('[itineraryService] Error inserting itinerary items:', insertError);
          throw insertError;
        }
      }
    }

    // Get the updated itinerary with items
    return await getItinerary(id);
  } catch (error) {
    console.error('Error updating itinerary:', error);
    errorReporter('Error updating itinerary:', error);
    return null;
  }
}

/**
 * Delete an itinerary
 */
export async function deleteItinerary(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, delete all items (will cascade, but let's be explicit)
    const { error: deleteItemsError } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('itinerary_id', id);

    if (deleteItemsError) {
      errorReporter('[itineraryService] Error deleting itinerary items:', deleteItemsError);
      throw deleteItemsError;
    }

    // Then delete the itinerary
    const { error: deleteItineraryError } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteItineraryError) {
      errorReporter('[itineraryService] Error deleting itinerary:', deleteItineraryError);
      throw deleteItineraryError;
    }

    return true;
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    errorReporter('Error deleting itinerary:', error);
    return false;
  }
}

/**
 * Update a single itinerary item
 */
export async function updateItineraryItem(
  itineraryId: string,
  itemId: string,
  data: Partial<ItineraryItem>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, verify the user owns the itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id')
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .single();

    if (itineraryError || !itinerary) {
      throw new Error('Itinerary not found or access denied');
    }

    // Prepare the update data
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || '';
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.location !== undefined) updateData.location_name = data.location || '';
    if (data.coordinates !== undefined) updateData.location_coordinates = data.coordinates;
    if (data.notes !== undefined) updateData.notes = data.notes || '';
    if (data.order !== undefined) updateData.order = data.order;
    updateData.updated_at = new Date().toISOString();

    // Update the item
    const { error: updateError } = await supabase
      .from('itinerary_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('itinerary_id', itineraryId);

    if (updateError) {
      errorReporter('[itineraryService] Error updating itinerary item:', updateError);
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error('Error updating itinerary item:', error);
    errorReporter('Error updating itinerary item:', error);
    return false;
  }
}

/**
 * Reorder itinerary items
 */
export async function reorderItineraryItems(
  itineraryId: string,
  itemIds: string[]
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, verify the user owns the itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id')
      .eq('id', itineraryId)
      .eq('user_id', user.id)
      .single();

    if (itineraryError || !itinerary) {
      throw new Error('Itinerary not found or access denied');
    }

    // Update the order of each item
    for (let i = 0; i < itemIds.length; i++) {
      const { error } = await supabase
        .from('itinerary_items')
        .update({ order: i })
        .eq('id', itemIds[i])
        .eq('itinerary_id', itineraryId);

      if (error) {
        errorReporter('[itineraryService] Error reordering itinerary items:', error);
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('Error reordering itinerary items:', error);
    errorReporter('Error reordering itinerary items:', error);
    return false;
  }
}

// Add an alias for backward compatibility
export const getItineraryById = getItinerary;

/**
 * Generate an itinerary using AI
 */
export async function generateAIItinerary(prompt: string, date: string, location?: string): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-itinerary', {
      body: { prompt, date, location }
    });

    if (error) {
      errorReporter('[itineraryService] Error generating AI itinerary:', error);
      throw error;
    }

    return { id: data.id };
  } catch (error) {
    console.error('Error generating AI itinerary:', error);
    errorReporter('Error generating AI itinerary:', error);
    return null;
  }
}
