import { Event } from "@/types"
import { getApiKey, getApiEndpoint } from "@/config/env"
import { supabase } from "@/integrations/supabase/client"

export type Coordinate = {
  latitude: number
  longitude: number
}

export type EventFilters = {
  categories?: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
  location?: string
  radius?: number
  keyword?: string
  page?: number
  limit?: number
  latitude?: number
  longitude?: number
  partySubcategory?: string
  isPartyEvent?: boolean
}

const DEFAULT_EVENT_IMAGE = "/event-default.png"

const getApiUrl = () => {
  // Get the Supabase URL from environment
  const supabaseUrl = getApiKey('supabase-url');
  if (supabaseUrl) {
    return supabaseUrl;
  }
  
  return "http://localhost:3000"
}

const constructQueryParams = (filters: EventFilters): string => {
  const params = new URLSearchParams()

  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach((category) => params.append("categories", category))
  }

  if (filters.dateRange) {
    if (filters.dateRange.from) {
      params.append("startDate", filters.dateRange.from.toISOString())
    }
    if (filters.dateRange.to) {
      params.append("endDate", filters.dateRange.to.toISOString())
    }
  }

  if (filters.location) {
    params.append("location", filters.location)
  }

  if (filters.radius) {
    params.append("radius", filters.radius.toString())
  }

  if (filters.keyword) {
    params.append("keyword", filters.keyword)
  }

  if (filters.page) {
    params.append("page", filters.page.toString())
  }

  if (filters.limit) {
    params.append("limit", filters.limit.toString())
  }

  if (filters.latitude && filters.longitude) {
    params.append("latitude", filters.latitude.toString())
    params.append("longitude", filters.longitude.toString())
  }

  return params.toString()
}

export const fetchEvents = async (
  filters: EventFilters,
  coords: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    const apiUrl = `${getApiUrl()}/api/events?${constructQueryParams(filters)}`
    console.log("Fetching events from API:", apiUrl)

    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      console.error("HTTP error!", res.status)
      return []
    }

    const data = (await res.json()) as Event[]

    return data
  } catch (error) {
    console.error("Could not fetch events!", error)
    return []
  }
}

export const fetchEventsFromSupabase = async (
  filters: EventFilters,
  coords: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    // Use the supabase client from integrations
    if (!supabase) {
      console.error("Supabase client is not initialized!")
      return []
    }

    let supabaseFunctionName = "search-events"

    // Check if we should use the unified function
    const useUnifiedFunction = import.meta.env.VITE_USE_UNIFIED_FUNCTION === "true";
    if (useUnifiedFunction) {
      supabaseFunctionName = "search-events-unified"
      console.log("Using unified search-events function")
    }

    // Combine filters with coordinates
    const requestParams = {
      ...filters,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius: radius || filters.radius || 10000 // Default to 10km if not specified
    }

    console.log(`Fetching events from Supabase Function: ${supabaseFunctionName}`)
    console.log("Request Parameters:", requestParams)

    // Use the supabase client to invoke the function
    const { data, error } = await supabase.functions.invoke(supabaseFunctionName, {
      body: requestParams
    });

    if (error) {
      console.error("Error from Supabase Function!", error)
      return []
    }

    if (!data || !data.events || !Array.isArray(data.events)) {
      console.warn("No events found or invalid format in Supabase Function response.")
      return []
    }

    let events: Event[] = data.events.map((event: any) => ({
      id: event.id || Math.random().toString(36).substring(2, 15),
      source: event.source || "supabase",
      title: event.title || "Untitled Event",
      description: event.description || "No description provided.",
      date: event.date || "Date not specified",
      time: event.time || "Time not specified",
      location: event.location || "Location not specified",
      venue: event.venue || "Venue not specified",
      category: event.category || "other",
      image: event.image || DEFAULT_EVENT_IMAGE,
      imageAlt: event.imageAlt || "Event Image",
      coordinates: event.coordinates || undefined,
      url: event.url || undefined,
      isPartyEvent: event.isPartyEvent || false,
      partySubcategory: event.partySubcategory || undefined,
      rawDate: event.rawDate || undefined,
      latitude: event.latitude || undefined,
      longitude: event.longitude || undefined,
    }))

    console.log(`Fetched ${events.length} events from Supabase Function.`)
    return events
  } catch (error) {
    console.error("Could not fetch events from Supabase!", error)
    return []
  }
}

export const fetchEventsFromRapidAPI = async (
  filters: EventFilters,
  coords: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    // First try direct RapidAPI call
    const rapidApiKey = getApiKey('rapidapi');
    const rapidApiEndpoint = getApiEndpoint('rapidapi_events');
    
    if (!rapidApiKey) {
      console.error("RapidAPI key is missing! Falling back to Supabase function.")
      return fetchEventsViaSupabaseRapidAPI(filters, coords, radius);
    }
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add keyword/query parameter
    const queryString = filters.keyword || 'events';
    queryParams.append('query', queryString);
    console.log(`[RAPIDAPI] Using query string: "${queryString}"`);
    
    // Add date parameter
    const dateParam = filters.dateRange?.from ? 'month' : 'today';
    queryParams.append('date', dateParam);
    console.log(`[RAPIDAPI] Using date parameter: ${dateParam}`);
    
    // Add location parameters if provided
    if (coords.latitude && coords.longitude) {
      queryParams.append('lat', coords.latitude.toString());
      queryParams.append('lon', coords.longitude.toString());
      
      // Add radius if provided (convert to km)
      const radiusInKm = radius ? Math.round(radius / 1000) : 10;
      queryParams.append('radius', radiusInKm.toString());
      console.log(`[RAPIDAPI] Using location: [${coords.latitude}, ${coords.longitude}] with radius ${radiusInKm}km`);
    }
    
    // Add limit parameter (max 100 for RapidAPI)
    queryParams.append('limit', '100');
    console.log(`[RAPIDAPI] Requesting 100 events`);
    
    // Build the complete URL
    const url = `${rapidApiEndpoint}?${queryParams.toString()}`;
    console.log(`[RAPIDAPI] Sending request to: ${url}`);
    
    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      console.error(`[RAPIDAPI] Request failed with status: ${response.status}`);
      return fetchEventsViaSupabaseRapidAPI(filters, coords, radius);
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      console.error('[RAPIDAPI] Invalid response format');
      return fetchEventsViaSupabaseRapidAPI(filters, coords, radius);
    }
    
    console.log(`[RAPIDAPI] Received ${data.length} raw events from RapidAPI`);
    
    // Transform the events to our format
    const events: Event[] = data.map((event: any) => ({
      id: `rapidapi_${event.id || Math.random().toString(36).substring(2, 15)}`,
      source: "rapidapi",
      title: event.name || "Untitled Event",
      description: event.description || "No description provided.",
      date: event.date || "Date not specified",
      time: event.time || "Time not specified",
      location: event.venue?.address || event.location || "Location not specified",
      venue: event.venue?.name || "Venue not specified",
      category: event.category || "other",
      image: event.image || DEFAULT_EVENT_IMAGE,
      imageAlt: event.name || "Event Image",
      coordinates: event.location?.coordinates || undefined,
      url: event.url || undefined,
      isPartyEvent: event.category?.toLowerCase().includes('party') || false,
      partySubcategory: undefined,
      rawDate: event.start_time || event.date || undefined,
      latitude: event.location?.lat || event.venue?.lat || undefined,
      longitude: event.location?.lon || event.venue?.lon || undefined,
    }));
    
    console.log(`[RAPIDAPI] Transformed ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error("Error fetching from RapidAPI directly:", error);
    // Fall back to Supabase function
    return fetchEventsViaSupabaseRapidAPI(filters, coords, radius);
  }
}

// Helper function to fetch events via Supabase's RapidAPI integration
const fetchEventsViaSupabaseRapidAPI = async (
  filters: EventFilters,
  coords: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    // Use the supabase client from integrations
    if (!supabase) {
      console.error("Supabase client is not initialized!")
      return []
    }

    // Use the fetch-events edge function
    const fetchEventsFunctionName = "fetch-events"

    // Combine filters with coordinates
    const requestParams = {
      ...filters,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius: radius || filters.radius || 10000 // Default to 10km if not specified
    }

    console.log("Fetching events from RapidAPI via Supabase Function:", fetchEventsFunctionName)
    console.log("Request Parameters:", requestParams)

    // Use the supabase client to invoke the function
    const { data, error } = await supabase.functions.invoke(fetchEventsFunctionName, {
      body: requestParams
    });

    if (error) {
      console.error("Error from Supabase Function!", error)
      return []
    }

    if (!data || !data.events || !Array.isArray(data.events)) {
      console.warn("No events found or invalid format in Supabase Function response.")
      return []
    }

    let events: Event[] = data.events.map((event: any) => ({
      id: `rapidapi_${event.id || Math.random().toString(36).substring(2, 15)}`,
      source: event.source || "rapidapi",
      title: event.title || "Untitled Event",
      description: event.description || "No description provided.",
      date: event.date || "Date not specified",
      time: event.time || "Time not specified",
      location: event.location || "Location not specified",
      venue: event.venue || "Venue not specified",
      category: event.category || "other",
      image: event.image || DEFAULT_EVENT_IMAGE,
      imageAlt: event.imageAlt || "Event Image",
      coordinates: event.coordinates || undefined,
      url: event.url || undefined,
      isPartyEvent: event.isPartyEvent || false,
      partySubcategory: event.partySubcategory || undefined,
      rawDate: event.rawDate || undefined,
      latitude: event.latitude || undefined,
      longitude: event.longitude || undefined,
    }))

    console.log(`Fetched ${events.length} events from RapidAPI via Supabase Function.`)
    return events
  } catch (error) {
    console.error("Could not fetch events from RapidAPI via Supabase!", error)
    return []
  }
}
