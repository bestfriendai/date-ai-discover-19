import { supabase } from '@/integrations/supabase/client';
import errorReporter from '@/utils/errorReporter';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reminder' | 'system' | 'social';
  read: boolean;
  event_id?: string;
  itinerary_id?: string;
  created_at: string;
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 20): Promise<Notification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      errorReporter('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getNotifications:', error);
    errorReporter('Error in getNotifications:', error);
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
 * Create a notification (for testing purposes)
 */
export async function createTestNotification(
  title: string,
  message: string,
  type: 'reminder' | 'system' | 'social' = 'system',
  eventId?: string,
  itineraryId?: string
): Promise<Notification | null> {
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
      console.error('Error creating notification:', error);
      errorReporter('Error creating notification:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createTestNotification:', error);
    errorReporter('Error in createTestNotification:', error);
    return null;
  }
}

// Export default object for easier imports
const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createTestNotification
};

export default notificationService;
