import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseAvailable } from '@/integrations/supabase/client';
import notificationService, { Notification } from '@/services/notificationService';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RealtimeChannel } from '@supabase/supabase-js';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Reference to the realtime channel
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Set up realtime subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      if (!user) return;

      // Check if Supabase is available
      const available = await isSupabaseAvailable();
      if (!available) {
        console.error('Supabase connection is not available for notifications');
        setConnectionStatus('error');
        return;
      }

      try {
        // Clean up any existing subscription
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Create a new channel with a unique name
        const channelName = `notifications-${user.id}-${Date.now()}`;
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(count => count + 1);

            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          })
          .on('system', { event: 'connected' }, () => {
            console.log('Notifications realtime connected');
            setConnectionStatus('connected');
          })
          .on('system', { event: 'disconnected' }, () => {
            console.log('Notifications realtime disconnected');
            setConnectionStatus('disconnected');
          })
          .on('system', { event: 'error' }, (error) => {
            console.error('Notifications realtime error:', error);
            setConnectionStatus('error');
          });

        // Subscribe to the channel
        const { error } = await channel.subscribe((status) => {
          console.log(`Notification subscription status: ${status}`);
        });

        if (error) {
          console.error('Error subscribing to notifications:', error);
          setConnectionStatus('error');
        } else {
          channelRef.current = channel;
        }
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
        setConnectionStatus('error');
      }
    };

    // Fetch notifications and set up subscription
    if (user) {
      fetchNotifications();
      setupRealtimeSubscription();
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  // Fetch notifications with improved error handling
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const notifications = await notificationService.getNotifications(20);
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Notification Error',
        description: 'Unable to load notifications. Please try again later.',
        variant: 'destructive'
      });
    }
  };

  // Retry connection if it fails
  useEffect(() => {
    if (connectionStatus === 'error' && user) {
      const retryTimeout = setTimeout(() => {
        console.log('Retrying notification subscription...');
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        // This will trigger the main useEffect to run again
        setConnectionStatus('disconnected');
      }, 10000); // Retry after 10 seconds

      return () => clearTimeout(retryTimeout);
    }
  }, [connectionStatus, user]);

  const markAsRead = async (id: string) => {
    try {
      const success = await notificationService.markAsRead(id);

      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(count => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;

    try {
      const success = await notificationService.markAllAsRead();

      if (success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.event_id) {
      navigate(`/map?selectedEventId=${notification.event_id}`);
    } else if (notification.itinerary_id) {
      navigate(`/plan/edit/${notification.itinerary_id}`);
    }

    // Close notification center
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'system':
        return <Bell className="h-4 w-4 text-purple-500" />;
      case 'social':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Format notification date
  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
            variant="destructive"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {unreadCount} unread
              </span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  <p>No notifications</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div key={notification.id}>
                      <div
                        className={cn(
                          "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          !notification.read && "bg-muted/20"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{notification.title}</div>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatNotificationDate(notification.created_at)}
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1" />
                          )}
                        </div>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;
