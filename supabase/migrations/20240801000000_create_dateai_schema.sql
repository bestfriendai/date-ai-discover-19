-- Create extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_end TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  location_address TEXT,
  location_coordinates GEOMETRY(POINT, 4326),
  category TEXT,
  image_url TEXT,
  url TEXT,
  price_min DECIMAL,
  price_max DECIMAL,
  price_currency TEXT,
  venue_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(source, external_id)
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, event_id)
);

-- Create itineraries table
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create itinerary_items table
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location_name TEXT,
  location_coordinates GEOMETRY(POINT, 4326),
  notes TEXT,
  type TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at
BEFORE UPDATE ON public.itineraries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itinerary_items_updated_at
BEFORE UPDATE ON public.itinerary_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS) policies
-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- Events table (public read)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly viewable" 
ON public.events FOR SELECT 
TO authenticated, anon
USING (true);

-- Favorites table
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" 
ON public.favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Itineraries table
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own itineraries" 
ON public.itineraries FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own itineraries" 
ON public.itineraries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itineraries" 
ON public.itineraries FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itineraries" 
ON public.itineraries FOR DELETE 
USING (auth.uid() = user_id);

-- Itinerary items table
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items from their own or public itineraries" 
ON public.itinerary_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.itineraries i 
    WHERE i.id = itinerary_id 
    AND (i.user_id = auth.uid() OR i.is_public = true)
  )
);

CREATE POLICY "Users can insert items to their own itineraries" 
ON public.itinerary_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.itineraries i 
    WHERE i.id = itinerary_id 
    AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items in their own itineraries" 
ON public.itinerary_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.itineraries i 
    WHERE i.id = itinerary_id 
    AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items from their own itineraries" 
ON public.itinerary_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.itineraries i 
    WHERE i.id = itinerary_id 
    AND i.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS events_location_idx ON public.events USING GIST (location_coordinates);
CREATE INDEX IF NOT EXISTS events_date_start_idx ON public.events (date_start);
CREATE INDEX IF NOT EXISTS events_category_idx ON public.events (category);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS itineraries_user_id_idx ON public.itineraries (user_id);
CREATE INDEX IF NOT EXISTS itineraries_date_idx ON public.itineraries (date);
CREATE INDEX IF NOT EXISTS itinerary_items_itinerary_id_idx ON public.itinerary_items (itinerary_id);
CREATE INDEX IF NOT EXISTS itinerary_items_order_idx ON public.itinerary_items (itinerary_id, "order");
