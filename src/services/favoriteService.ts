import { supabase, isSupabaseAvailable } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { toast } from '@/hooks/use-toast';

// Enhanced in-memory cache with improved functionality
const cache = {
  data: {} as Record<string, { value: any, expiry: number }>,
  set(key: string, value: any, ttl = 60000) {
    this.data[key] = {
      value,
      expiry: Date.now() + ttl
    };
    console.log(`[Cache] Set: ${key}, expires in ${ttl/1000}s`);
  },
  get(key: string) {
    const item = this.data[key];
    if (!item) return null;
    if (Date.now() > item.expiry) {
      console.log(`[Cache] Expired: ${key}`);
      delete this.data[key];
      return null;
    }
    console.log(`[Cache] Hit: ${key}`);
    return item.value;
  },
  invalidate(key: string) {
    if (this.data[key]) {
      console.log(`[Cache] Invalidated: ${key}`);
      delete this.data[key];
      return true;
    }
    return false;
  },
  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    let count = 0;
    Object.keys(this.data).forEach(key => {
      if (regex.test(key)) {
        delete this.data[key];
        count++;
      }
    });
    if (count > 0) {
      console.log(`[Cache] Invalidated ${count} entries matching pattern: ${pattern}`);
    }
    return count;
  },
  clear() {
    const count = Object.keys(this.data).length;
    this.data = {};
    console.log(`[Cache] Cleared all ${count} entries`);
    return count;
  }
};
// Define the Favorite type
export interface Favorite {
  id: string; // From favorites table
  user_id: string; // From favorites table
  event_id: string; // From favorites table
  reminders_enabled: boolean; // From favorites table
  reminder_sent_at: string | null; // From favorites table
  created_at: string; // From favorites table
  events: Event; // Nested event data from events table
}

// Get all favorite events for the current user with improved error handling
export const getFavorites = async (): Promise<Event[]> => {
  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the database. Please try again later.',
      variant: 'destructive'
    });
    throw new DatabaseError('Supabase connection is not available', 'connection_error');
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // If no user, return empty array and don't throw, as this is a valid state
      console.log('[FavoriteService] No authenticated user, returning empty favorites');
      return [];
    }

    // Generate cache key
    const cacheKey = `favorites_${user.id}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch favorites with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    const fetchPromise = supabase
      .from('favorites')
      .select('*, events(*)')
      .eq('user_id', user.id);

    // Race the fetch against the timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    const { data, error } = result as Awaited<typeof fetchPromise>;

    if (error) {
      console.error('[FavoriteService] Database error fetching favorites:', error.message);
      throw new DatabaseError(error.message, error.code);
    }

    // Transform the data to match the Event type and include favorite-specific info
    const favoritesData = data.map((favorite: any) => {
      // Format date and time from date_start if available
      let date = '';
      let time = '';
      if (favorite.events?.date_start) {
        try {
          const dateObj = new Date(favorite.events.date_start);
          date = dateObj.toISOString().split('T')[0];
          time = dateObj.toTimeString().slice(0, 5);
        } catch (e) {
          // Fallback to raw value if date parsing fails
          date = favorite.events.date_start?.split('T')[0] || '';
        }
      }

      return {
        id: favorite.event_id,
        title: favorite.events?.title || 'Untitled Event',
        description: favorite.events?.description || '',
        date,
        time,
        location: favorite.events?.location_address || favorite.events?.location_name || '',
        venue: favorite.events?.venue_name || '',
        category: favorite.events?.category || 'other',
        image: favorite.events?.image_url || '',
        coordinates: favorite.events?.location_coordinates,
        url: favorite.events?.url || '',
        price: favorite.events?.price,
        source: favorite.events?.source || 'database',
        favorited: true, // Mark as favorited
        // Add reminder information from the favorites table
        _favoriteId: favorite.id,
        _remindersEnabled: favorite.reminders_enabled,
        _reminderSentAt: favorite.reminder_sent_at
      };
    });

    // Cache the result for 5 minutes
    cache.set(cacheKey, favoritesData, 5 * 60 * 1000);

    return favoritesData;
  } catch (error: any) {
    // Check for timeout error
    if (error.message === 'Request timeout') {
      toast({
        title: 'Request Timeout',
        description: 'The favorites request timed out. Please try again later.',
        variant: 'destructive'
      });
    }

    // Log detailed error information
    console.error('[FavoriteService] Error getting favorites:', {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // Rethrow with user-friendly message
    throw new DatabaseError(
      error.message || 'Failed to fetch favorites. Please try again.',
      error.code
    );
  }
};

// Add an event to favorites with improved error handling and validation
export const addFavorite = async (event: Event): Promise<boolean> => {
  // Validate input
  if (!event || !event.id) {
    throw new DatabaseError('Invalid event data', 'invalid_input');
  }

  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the database. Please try again later.',
      variant: 'destructive'
    });
    throw new DatabaseError('Supabase connection is not available', 'connection_error');
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add favorites.',
        variant: 'destructive'
      });
      throw new DatabaseError('User not authenticated', 'auth_required');
    }

    // First, ensure the event exists in the events table
    // Prepare event data with validation
    const eventData = {
      id: event.id, // Use as primary key
      external_id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description || '',
      date_start: event.date || new Date().toISOString().split('T')[0],
      date_end: null,
      location_name: event.venue || '',
      location_address: event.location || '',
      venue_name: event.venue || '',
      category: event.category || 'other',
      image_url: event.image || '',
      location_coordinates: event.coordinates || null,
      source: event.source || 'user',
      url: event.url || '',
      // Add any other required fields with defaults
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Use upsert to update if exists or insert if not
    const { error: eventError } = await supabase
      .from('events')
      .upsert(eventData, {
        onConflict: 'external_id', // Use external_id as the conflict key
        ignoreDuplicates: false // Update if exists
      });

    if (eventError) {
      console.error('[FavoriteService] Database error ensuring event exists:', eventError);
      throw new DatabaseError(eventError.message, eventError.code);
    }

    // Then add to favorites with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
    });

    // First check if the favorite already exists
    const checkPromise = supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', event.id)
      .maybeSingle();

    const checkResult = await Promise.race([checkPromise, timeoutPromise]);
    const { data: existingFavorite, error: checkError } = checkResult as Awaited<typeof checkPromise>;

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error('[FavoriteService] Error checking existing favorite:', checkError);
      throw new DatabaseError(checkError.message, checkError.code);
    }

    // If favorite already exists, just return success
    if (existingFavorite) {
      console.log('[FavoriteService] Favorite already exists, skipping insert');

      // Still show success toast
      toast({
        title: 'Added to Favorites',
        description: 'Event is in your favorites.',
      });

      return true;
    }

    // Prepare favorite data
    const favoriteData = {
      user_id: user.id,
      event_id: event.id,
      reminders_enabled: false, // Default to reminders disabled
      created_at: new Date().toISOString()
    };

    // Insert the favorite
    const insertPromise = supabase
      .from('favorites')
      .insert(favoriteData);

    // Race the insert against the timeout
    const result = await Promise.race([insertPromise, timeoutPromise]);
    const { error: favoriteError } = result as Awaited<typeof insertPromise>;

    if (favoriteError) {
      console.error('[FavoriteService] Database error adding favorite:', favoriteError);
      throw new DatabaseError(favoriteError.message, favoriteError.code);
    }

    // Invalidate all cache entries for this user's favorites
    cache.invalidatePattern(`favorites?_${user.id}`);

    // Show success toast
    toast({
      title: 'Added to Favorites',
      description: 'Event has been added to your favorites.',
    });

    return true;
  } catch (error: any) {
    // Check for timeout error
    if (error.message === 'Request timeout') {
      toast({
        title: 'Request Timeout',
        description: 'The request timed out. Please try again later.',
        variant: 'destructive'
      });
    }

    console.error('[FavoriteService] Error adding favorite:', {
      eventId: event.id,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    throw new DatabaseError(
      error.message || 'Failed to add favorite. Please try again.',
      error.code
    );
  }
};

// Remove an event from favorites with improved error handling
export const removeFavorite = async (eventId: string): Promise<boolean> => {
  // Validate input
  if (!eventId) {
    throw new DatabaseError('Event ID is required', 'invalid_input');
  }

  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the database. Please try again later.',
      variant: 'destructive'
    });
    throw new DatabaseError('Supabase connection is not available', 'connection_error');
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to manage favorites.',
        variant: 'destructive'
      });
      throw new DatabaseError('User not authenticated', 'auth_required');
    }

    // Delete with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
    });

    const deletePromise = supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    // Race the delete against the timeout
    const result = await Promise.race([deletePromise, timeoutPromise]);
    const { error } = result as Awaited<typeof deletePromise>;

    if (error) {
      console.error('[FavoriteService] Database error removing favorite:', error);
      throw new DatabaseError(error.message, error.code);
    }

    // Invalidate all cache entries for this user's favorites
    cache.invalidatePattern(`favorites?_${user.id}`);

    // Show success toast
    toast({
      title: 'Removed from Favorites',
      description: 'Event has been removed from your favorites.',
    });

    return true;
  } catch (error: any) {
    // Check for timeout error
    if (error.message === 'Request timeout') {
      toast({
        title: 'Request Timeout',
        description: 'The request timed out. Please try again later.',
        variant: 'destructive'
      });
    }

    console.error('[FavoriteService] Error removing favorite:', {
      eventId,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    throw new DatabaseError(
      error.message || 'Failed to remove favorite. Please try again.',
      error.code || 'unknown'
    );
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

// Get a favorite by event ID
export const getFavorite = async (eventId: string): Promise<Favorite | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[FavoriteService] No authenticated user, cannot get favorite');
      return null;
    }

    // Generate cache key for single favorite (optional, but can be useful)
    const cacheKey = `favorite_${user.id}_${eventId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[FavoriteService] Using cached favorite data for key: ${cacheKey}`);
      return cachedData;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*, events(*)')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - not an error, just means it's not favorited
        console.log(`[FavoriteService] Favorite not found for event ${eventId} and user ${user.id}`);
        return null;
      }
      console.error('[FavoriteService] Database error getting favorite:', error.message);
      throw new DatabaseError(error.message, error.code);
    }

    // Cache the result (optional)
    cache.set(cacheKey, data, 5 * 60 * 1000); // Cache for 5 minutes
    console.log(`[FavoriteService] Cached favorite data for key: ${cacheKey}`);

    // The data structure should match the Favorite interface if the select is correct
    return data as unknown as Favorite; // Keep cast for now, but ideally types would align
  } catch (error: any) {
    console.error('[FavoriteService] Error getting favorite:', {
      userId: (await supabase.auth.getUser()).data.user?.id,
      eventId,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw new DatabaseError(
      error.message || 'Failed to fetch favorite details. Please try again.',
      error.code
    );
  }
};

// Toggle reminders for a favorite
export const toggleReminders = async (favoriteId: string, enabled: boolean): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[FavoriteService] Attempted to toggle reminders without authenticated user');
      throw new DatabaseError('User not authenticated', 401);
    }

    // Explicitly type the update payload
    const updatePayload: Partial<Favorite> = { reminders_enabled: enabled };

    const { error } = await supabase
      .from('favorites')
      .update(updatePayload)
      .eq('id', favoriteId)
      .eq('user_id', user.id); // Ensure the user owns this favorite

    if (error) {
      console.error('[FavoriteService] Database error toggling reminders:', error.message);
      throw new DatabaseError(error.message, error.code);
    }

    // Invalidate cache for this user's favorites as reminder status changed
    cache.invalidate(`favorites_${user.id}`);
    // If caching single favorites, also invalidate the specific favorite's cache
    // cache.invalidate(`favorite_${user.id}_${favoriteId}`); // Uncomment if caching single favorites

    console.log(`[FavoriteService] Successfully toggled reminders for favorite ${favoriteId} to ${enabled}`);
    return true;
  } catch (error: any) {
    console.error('[FavoriteService] Error toggling reminders:', {
      userId: (await supabase.auth.getUser()).data.user?.id,
      favoriteId,
      enabled,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw new DatabaseError(
      error.message || 'Failed to toggle reminders. Please try again.',
      error.code
    );
  }
};
// Enhanced error class for database errors
class DatabaseError extends Error {
  code: string | number;
  status?: number;
  source?: string;
  timestamp: string;

  constructor(message: string, code: string | number = 'unknown', options?: { status?: number; source?: string }) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.status = options?.status;
    this.source = options?.source;
    this.timestamp = new Date().toISOString();

    // Log all database errors for monitoring
    console.error('[DatabaseError]', {
      message: this.message,
      code: this.code,
      status: this.status,
      source: this.source,
      timestamp: this.timestamp
    });
  }
}
