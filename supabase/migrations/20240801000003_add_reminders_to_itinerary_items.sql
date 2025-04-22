-- Add reminders_enabled column to itinerary_items
ALTER TABLE public.itinerary_items
ADD COLUMN reminders_enabled BOOLEAN DEFAULT FALSE;

-- Add reminder_sent_at column to itinerary_items
ALTER TABLE public.itinerary_items
ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
