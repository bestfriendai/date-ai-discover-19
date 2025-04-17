-- Create itineraries table
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  location TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create itinerary_items table
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE NOT NULL,
  event_id TEXT REFERENCES public.events(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- Create policies for itineraries table
-- Users can view their own itineraries
CREATE POLICY "Users can view own itineraries" 
  ON public.itineraries 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own itineraries
CREATE POLICY "Users can insert own itineraries" 
  ON public.itineraries 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own itineraries
CREATE POLICY "Users can update own itineraries" 
  ON public.itineraries 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own itineraries
CREATE POLICY "Users can delete own itineraries" 
  ON public.itineraries 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create policies for itinerary_items table
-- Users can view items from their own itineraries
CREATE POLICY "Users can view own itinerary items" 
  ON public.itinerary_items 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.itineraries 
    WHERE itineraries.id = itinerary_items.itinerary_id 
    AND itineraries.user_id = auth.uid()
  ));

-- Users can insert items into their own itineraries
CREATE POLICY "Users can insert own itinerary items" 
  ON public.itinerary_items 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.itineraries 
    WHERE itineraries.id = itinerary_items.itinerary_id 
    AND itineraries.user_id = auth.uid()
  ));

-- Users can update items in their own itineraries
CREATE POLICY "Users can update own itinerary items" 
  ON public.itinerary_items 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.itineraries 
    WHERE itineraries.id = itinerary_items.itinerary_id 
    AND itineraries.user_id = auth.uid()
  ));

-- Users can delete items from their own itineraries
CREATE POLICY "Users can delete own itinerary items" 
  ON public.itinerary_items 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.itineraries 
    WHERE itineraries.id = itinerary_items.itinerary_id 
    AND itineraries.user_id = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER set_itineraries_updated_at
BEFORE UPDATE ON public.itineraries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_itinerary_items_updated_at
BEFORE UPDATE ON public.itinerary_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
