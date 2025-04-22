-- Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'system', 'social')),
  read BOOLEAN DEFAULT false NOT NULL,
  event_id TEXT,
  itinerary_id UUID REFERENCES public.itineraries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Only service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Create function to send event reminders
CREATE OR REPLACE FUNCTION public.send_event_reminders()
RETURNS void AS $$
DECLARE
  favorite_record RECORD;
BEGIN
  -- Find favorites with reminders enabled and event date within 24 hours
  FOR favorite_record IN
    SELECT
      f.id,
      f.user_id,
      f.event_id,
      f.event_title,
      f.event_date,
      f.event_time,
      f.event_location
    FROM
      public.favorites f
    WHERE
      f.reminders_enabled = true
      AND f.event_date IS NOT NULL
      -- Check if event is within the next 24 hours
      AND (
        (f.event_date::date = CURRENT_DATE AND f.event_time::time > CURRENT_TIME)
        OR
        (f.event_date::date = CURRENT_DATE + INTERVAL '1 day' AND f.event_time::time <= CURRENT_TIME)
      )
      -- Check if we haven't already sent a reminder for this event
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.event_id = f.event_id::text
        AND n.user_id = f.user_id
        AND n.type = 'reminder'
        AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    -- Insert notification for this event
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      event_id
    ) VALUES (
      favorite_record.user_id,
      'Event Reminder',
      'Your event "' || favorite_record.event_title || '" is coming up ' ||
      CASE
        WHEN favorite_record.event_date::date = CURRENT_DATE THEN 'today'
        ELSE 'tomorrow'
      END ||
      ' at ' || favorite_record.event_time || ' at ' || COALESCE(favorite_record.event_location, 'the venue') || '.',
      'reminder',
      favorite_record.event_id::text
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send itinerary reminders
CREATE OR REPLACE FUNCTION public.send_itinerary_reminders()
RETURNS void AS $$
DECLARE
  itinerary_record RECORD;
BEGIN
  -- Find itineraries with date within 24 hours
  FOR itinerary_record IN
    SELECT
      i.id,
      i.user_id,
      i.name,
      i.date
    FROM
      public.itineraries i
    WHERE
      i.date IS NOT NULL
      -- Check if itinerary is within the next 24 hours
      AND (
        (i.date::date = CURRENT_DATE)
        OR
        (i.date::date = CURRENT_DATE + INTERVAL '1 day')
      )
      -- Check if we haven't already sent a reminder for this itinerary
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.itinerary_id = i.id
        AND n.user_id = i.user_id
        AND n.type = 'reminder'
        AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    -- Insert notification for this itinerary
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      itinerary_id
    ) VALUES (
      itinerary_record.user_id,
      'Itinerary Reminder',
      'Your itinerary "' || itinerary_record.name || '" is scheduled for ' ||
      CASE
        WHEN itinerary_record.date::date = CURRENT_DATE THEN 'today'
        ELSE 'tomorrow'
      END || '.',
      'reminder',
      itinerary_record.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications (read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);
