-- Create followers table
CREATE TABLE public.followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) NOT NULL,
  following_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Add RLS policies
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view followers
CREATE POLICY "Followers are viewable by everyone" ON public.followers
  FOR SELECT USING (true);

-- Users can only follow others themselves
CREATE POLICY "Users can only create their own follows" ON public.followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can only unfollow others themselves
CREATE POLICY "Users can only delete their own follows" ON public.followers
  FOR DELETE USING (auth.uid() = follower_id);

-- Add profile_visibility column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers', 'private'));

-- Add bio column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add social_links column to profiles table (as JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS followers_follower_id_idx ON public.followers (follower_id);
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON public.followers (following_id);
