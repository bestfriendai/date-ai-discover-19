-- Create event_reviews table
CREATE TABLE public.event_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL, -- Link to the event
  user_id UUID REFERENCES auth.users(id) NOT NULL, -- Link to the user who wrote the review
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL, -- Star rating (e.g., 1 to 5)
  review_text TEXT, -- The written review
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id) -- Ensure a user can only review an event once
);

ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Users can view all reviews (public)
CREATE POLICY "Reviews are publicly viewable" ON public.event_reviews FOR SELECT USING (true);
-- Users can insert their own reviews
CREATE POLICY "Users can insert own reviews" ON public.event_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON public.event_reviews FOR UPDATE USING (auth.uid() = user_id);
-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON public.event_reviews FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_event_reviews_updated_at BEFORE UPDATE ON public.event_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
