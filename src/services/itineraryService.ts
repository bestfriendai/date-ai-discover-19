import { supabase, isSupabaseAvailable } from '@/integrations/supabase/client';
import errorReporter from '../utils/errorReporter';
import type { Itinerary, ItineraryItem } from '@/types';
import { toast } from '@/hooks/use-toast';

// Error class for itinerary service errors
class ItineraryServiceError extends Error {
  code?: string;
  status?: number;
  source?: string;

  constructor(message: string, options?: { code?: string; status?: number; source?: string }) {
    super(message);
    this.name = 'ItineraryServiceError';
    this.code = options?.code;
    this.status = options?.status;
    this.source = options?.source;

    // Log all errors
    console.error('[ItineraryServiceError]', {
      message: this.message,
      code: this.code,
      status: this.status,
      source: this.source,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get all itineraries for the current user with improved error handling
 */
export async function getItineraries(): Promise<Itinerary[]> {
  console.log('[itineraryService] Getting all itineraries');

  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the database. Please try again later.',
      variant: 'destructive'
    });
    throw new ItineraryServiceError('Supabase connection is not available', {
      code: 'connection_error',
      status: 503,
      source: 'supabase'
    });
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[itineraryService] No authenticated user, returning empty itineraries');
      return [];
    }

    // Set timeout for the function call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    // Fetch itineraries
    const fetchPromise = supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    // Race the fetch against the timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    const { data, error } = result as Awaited<typeof fetchPromise>;

    if (error) {
      errorReporter('[itineraryService] Error fetching itineraries:', error);
      throw new ItineraryServiceError(`Database error: ${error.message}`, {
        code: error.code,
        status: 500,
        source: 'database'
      });
    }
    if (!data || data.length === 0) return [];

    // Get items for each itinerary with improved error handling
    const itinerariesWithItems: Itinerary[] = [];
    const fetchPromises = data.map(itinerary => {
      return supabase
        .from('itinerary_items')
        .select('*')
        .eq('itinerary_id', itinerary.id)
        .order('order', { ascending: true });
    });

    // Fetch all items in parallel
    const itemsResults = await Promise.allSettled(fetchPromises);

    // Process results
    for (let i = 0; i < data.length; i++) {
      const itinerary = data[i];
      const itemsResult = itemsResults[i];

      let formattedItems: ItineraryItem[] = [];

      if (itemsResult.status === 'fulfilled') {
        const { data: items, error: itemsError } = itemsResult.value;

        if (itemsError) {
          console.error(`[itineraryService] Error fetching items for itinerary ${itinerary.id}:`, itemsError);
          errorReporter('[itineraryService] Error fetching itinerary items:', itemsError);
          // Continue with empty items rather than skipping the itinerary
        } else if (items) {
          formattedItems = items.map(item => ({
            id: item.id,
            eventId: item.event_id,
            title: item.title || 'Untitled Item',
            description: item.description || '',
            startTime: item.start_time,
            endTime: item.end_time,
            location: item.location_name || '',
            coordinates: item.location_coordinates,
            notes: item.notes || '',
            type: item.type as "EVENT" | "CUSTOM",
            order: item.order !== undefined ? item.order : 0
          }));
        }
      } else {
        console.error(`[itineraryService] Failed to fetch items for itinerary ${itinerary.id}:`, itemsResult.reason);
      }

      itinerariesWithItems.push({
        id: itinerary.id,
        name: itinerary.name || 'Untitled Itinerary',
        description: itinerary.description || '',
        date: itinerary.date,
        items: formattedItems,
        isPublic: itinerary.is_public || false,
        createdAt: itinerary.created_at,
        updatedAt: itinerary.updated_at
      });
    }

    return itinerariesWithItems;
  } catch (error: any) {
    // Check for timeout error
    if (error.message === 'Request timeout') {
      toast({
        title: 'Request Timeout',
        description: 'The request is taking too long. Please try again later.',
        variant: 'destructive'
      });
    }

    console.error('Error getting itineraries:', error);
    errorReporter('Error getting itineraries:', error);

    // If it's already an ItineraryServiceError, rethrow it
    if (error instanceof ItineraryServiceError) {
      throw error;
    }

    // Otherwise, wrap it in an ItineraryServiceError
    throw new ItineraryServiceError(
      error.message || 'An unexpected error occurred while fetching itineraries',
      {
        code: 'unexpected_error',
        status: error.status || 500,
        source: 'getItineraries'
      }
    );
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
 * Generate an itinerary using AI with improved error handling
 */
export async function generateAIItinerary(prompt: string, date: string, location?: string): Promise<{ id: string } | null> {
  // Validate input
  if (!prompt) {
    toast({
      title: 'Missing Information',
      description: 'Please provide a description for your itinerary.',
      variant: 'destructive'
    });
    throw new ItineraryServiceError('Prompt is required', {
      code: 'invalid_input',
      status: 400,
      source: 'generateAIItinerary'
    });
  }

  if (!date) {
    toast({
      title: 'Missing Information',
      description: 'Please provide a date for your itinerary.',
      variant: 'destructive'
    });
    throw new ItineraryServiceError('Date is required', {
      code: 'invalid_input',
      status: 400,
      source: 'generateAIItinerary'
    });
  }

  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the AI service. Please try again later.',
      variant: 'destructive'
    });
    throw new ItineraryServiceError('Supabase connection is not available', {
      code: 'connection_error',
      status: 503,
      source: 'supabase'
    });
  }

  try {
    // Show loading toast
    toast({
      title: 'Generating Itinerary',
      description: 'Our AI is creating your personalized itinerary. This may take a moment...',
    });

    // Set timeout for the function call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 60000); // 60 second timeout for AI generation
    });

    // Call the Supabase function
    const fetchPromise = supabase.functions.invoke('generate-itinerary', {
      body: { prompt, date, location }
    });

    // Race the fetch against the timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    const { data, error } = result as Awaited<typeof fetchPromise>;

    if (error) {
      errorReporter('[itineraryService] Error generating AI itinerary:', error);
      throw new ItineraryServiceError(`AI generation error: ${error.message}`, {
        code: 'function_error',
        status: error.status || 500,
        source: 'generate-itinerary'
      });
    }

    if (!data || !data.id) {
      throw new ItineraryServiceError('No itinerary ID returned from AI service', {
        code: 'invalid_response',
        status: 500,
        source: 'generate-itinerary'
      });
    }

    // Show success toast
    toast({
      title: 'Itinerary Created',
      description: 'Your personalized itinerary has been generated successfully!',
    });

    return { id: data.id };
  } catch (error: any) {
    // Check for timeout error
    if (error.message === 'Request timeout') {
      toast({
        title: 'AI Generation Timeout',
        description: 'The AI is taking too long to generate your itinerary. Please try again with a simpler request.',
        variant: 'destructive'
      });
      throw new ItineraryServiceError('AI generation timed out', {
        code: 'timeout',
        status: 408,
        source: 'generate-itinerary'
      });
    }

    console.error('Error generating AI itinerary:', error);
    errorReporter('Error generating AI itinerary:', error);

    // Show error toast
    toast({
      title: 'Generation Failed',
      description: 'Failed to generate your itinerary. Please try again later.',
      variant: 'destructive'
    });

    // If it's already an ItineraryServiceError, rethrow it
    if (error instanceof ItineraryServiceError) {
      throw error;
    }

    // Otherwise, wrap it in an ItineraryServiceError
    throw new ItineraryServiceError(
      error.message || 'An unexpected error occurred while generating the itinerary',
      {
        code: 'unexpected_error',
        status: error.status || 500,
        source: 'generateAIItinerary'
      }
    );
  }
}
