-- Add reminders_enabled column to favorites
ALTER TABLE public.favorites
ADD COLUMN reminders_enabled BOOLEAN DEFAULT FALSE;

-- Add reminder_sent_at column to favorites
ALTER TABLE public.favorites
ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
