import { supabase, isSupabaseAvailable } from '@/integrations/supabase/client';
import errorReporter from '@/utils/errorReporter';
import { toast } from '@/hooks/use-toast';

// Error class for notification service errors
class NotificationServiceError extends Error {
  code?: string;
  status?: number;
  source?: string;

  constructor(message: string, options?: { code?: string; status?: number; source?: string }) {
    super(message);
    this.name = 'NotificationServiceError';
    this.code = options?.code;
    this.status = options?.status;
    this.source = options?.source;

    // Log all errors
    console.error('[NotificationServiceError]', {
      message: this.message,
      code: this.code,
      status: this.status,
      source: this.source,
      timestamp: new Date().toISOString()
    });
  }
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reminder' | 'system' | 'social' | 'error';
  read: boolean;
  event_id?: string;
  itinerary_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Get notifications for the current user with improved error handling
 */
export async function getNotifications(limit = 20): Promise<Notification[]> {
  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    console.error('Supabase connection is not available for notifications');
    return [];
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Set timeout for the function call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
    });

    // Fetch notifications
    const fetchPromise = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Race the fetch against the timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    const { data, error } = result as Awaited<typeof fetchPromise>;

    if (error) {
      console.error('Error fetching notifications:', error);
      errorReporter('Error fetching notifications:', error);
      throw new NotificationServiceError(`Database error: ${error.message}`, {
        code: error.code,
        status: 500,
        source: 'database'
      });
    }

    return data || [];
  } catch (error: any) {
    // Check for timeout error
    if (error.message === 'Request timeout') {
      console.error('Notification fetch timeout');
    }

    console.error('Error in getNotifications:', error);
    errorReporter('Error in getNotifications:', error);

    // Create an error notification to show in the UI
    try {
      if (error.message && error.message !== 'Request timeout') {
        await createSystemNotification(
          'Error Loading Notifications',
          'There was a problem loading your notifications. Please try again later.',
          'error'
        );
      }
    } catch (e) {
      // Ignore errors from creating the error notification
    }

    return [];
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      errorReporter('Error fetching unread count:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    errorReporter('Error in getUnreadCount:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
      errorReporter('Error marking notification as read:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in markAsRead:', error);
    errorReporter('Error in markAsRead:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllAsRead(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      errorReporter('Error marking all notifications as read:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    errorReporter('Error in markAllAsRead:', error);
    return false;
  }
}

/**
 * Create a system notification
 */
export async function createSystemNotification(
  title: string,
  message: string,
  type: 'reminder' | 'system' | 'social' | 'error' = 'system',
  metadata?: Record<string, any>
): Promise<Notification | null> {
  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    console.error('Supabase connection is not available for creating notification');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      errorReporter('Error creating notification:', error);
      throw new NotificationServiceError(`Database error: ${error.message}`, {
        code: error.code,
        status: 500,
        source: 'database'
      });
    }

    return data;
  } catch (error) {
    console.error('Error in createSystemNotification:', error);
    errorReporter('Error in createSystemNotification:', error);
    return null;
  }
}

/**
 * Create a notification for an event
 */
export async function createEventNotification(
  title: string,
  message: string,
  eventId: string,
  type: 'reminder' | 'system' | 'social' = 'reminder'
): Promise<Notification | null> {
  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    console.error('Supabase connection is not available for creating event notification');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type,
        event_id: eventId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event notification:', error);
      errorReporter('Error creating event notification:', error);
      throw new NotificationServiceError(`Database error: ${error.message}`, {
        code: error.code,
        status: 500,
        source: 'database'
      });
    }

    return data;
  } catch (error) {
    console.error('Error in createEventNotification:', error);
    errorReporter('Error in createEventNotification:', error);
    return null;
  }
}

/**
 * Create a notification (for testing purposes)
 */
export async function createTestNotification(
  title: string,
  message: string,
  type: 'reminder' | 'system' | 'social' | 'error' = 'system',
  eventId?: string,
  itineraryId?: string
): Promise<Notification | null> {
  // Check if Supabase is available
  const supabaseAvailable = await isSupabaseAvailable();
  if (!supabaseAvailable) {
    toast({
      title: 'Connection Issue',
      description: 'Unable to connect to the notification service.',
      variant: 'destructive'
    });
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type,
        event_id: eventId,
        itinerary_id: itineraryId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test notification:', error);
      errorReporter('Error creating test notification:', error);
      throw new NotificationServiceError(`Database error: ${error.message}`, {
        code: error.code,
        status: 500,
        source: 'database'
      });
    }

    toast({
      title: 'Test Notification Created',
      description: 'A test notification has been created successfully.',
    });

    return data;
  } catch (error) {
    console.error('Error in createTestNotification:', error);
    errorReporter('Error in createTestNotification:', error);

    toast({
      title: 'Notification Error',
      description: 'Failed to create test notification.',
      variant: 'destructive'
    });

    return null;
  }
}

// Export default object for easier imports
const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createSystemNotification,
  createEventNotification,
  createTestNotification
};

export default notificationService;
