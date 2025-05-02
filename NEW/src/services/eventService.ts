import { Event, EventFilters, Coordinate, PartySubcategory } from "@/types";
import { env } from "@/env.mjs";
import { detectPartyEvent, detectPartySubcategory } from "@/utils/eventNormalizers";

const DEFAULT_EVENT_IMAGE = "/event-default.png";
const RAPIDAPI_KEY = env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = "real-time-events-search.p.rapidapi.com";

/**
 * Fetch events directly from RapidAPI
 */
export const fetchEvents = async (
  filters: EventFilters,
  coords?: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    console.log("Fetching events with filters:", filters);
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Handle location-based search
    if (coords?.latitude && coords?.longitude) {
      // Format for RapidAPI: "events near {lat},{lng}"
      queryParams.append("query", `events near ${coords.latitude},${coords.longitude}`);
    } else if (filters.location) {
      // Format for RapidAPI: "events in {location}"
      queryParams.append("query", `events in ${filters.location}`);
    } else {
      // Default search if no location provided
      queryParams.append("query", "events");
    }
    
    // Handle date range
    if (filters.dateRange?.from) {
      // RapidAPI supports: today, tomorrow, week, weekend, month
      const now = new Date();
      const diffDays = Math.ceil((filters.dateRange.from.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays <= 0) {
        queryParams.append("date", "today");
      } else if (diffDays === 1) {
        queryParams.append("date", "tomorrow");
      } else if (diffDays <= 7) {
        queryParams.append("date", "week");
      } else {
        queryParams.append("date", "month");
      }
    } else {
      // Default to month for more results
      queryParams.append("date", "month");
    }
    
    // Add keyword if provided
    if (filters.keyword) {
      // Modify the query to include the keyword
      const currentQuery = queryParams.get("query") || "events";
      queryParams.set("query", `${currentQuery} ${filters.keyword}`);
    }
    
    // Add category filtering if provided
    if (filters.categories && filters.categories.length > 0) {
      // RapidAPI doesn't directly support category filtering in the API
      // We'll filter the results after fetching
      console.log("Will filter by categories:", filters.categories);
    }
    
    // Only include in-person events
    queryParams.append("is_virtual", "false");
    
    // Pagination
    const start = filters.page ? (filters.page - 1) * (filters.limit || 20) : 0;
    queryParams.append("start", start.toString());
    
    // Limit results
    const limit = filters.limit || 100; // Get more results to allow for filtering
    queryParams.append("limit", limit.toString());
    
    // Add sort parameter for better results
    queryParams.append("sort", "relevance");
    
    // Build the complete URL
    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    
    console.log("Fetching events from RapidAPI:", url);
    
    // Make the API call
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
      }
    });
    
    if (!response.ok) {
      console.error("RapidAPI request failed with status:", response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error("Invalid response format from RapidAPI");
      return [];
    }
    
    // Transform the events
    let events = data.data.map(transformRapidAPIEvent);
    
    // Filter by categories if needed
    if (filters.categories && filters.categories.length > 0) {
      const categoryFilter = filters.categories.map(c => c.toLowerCase());
      
      // Special case for "party" category
      if (categoryFilter.includes("party")) {
        events = events.filter(event => event.isPartyEvent);
      } else {
        events = events.filter(event => 
          event.category && categoryFilter.includes(event.category.toLowerCase())
        );
      }
    }
    
    console.log(`Fetched ${events.length} events from RapidAPI`);
    return events;
  } catch (error) {
    console.error("Could not fetch events from RapidAPI:", error);
    return [];
  }
};

/**
 * Transform a RapidAPI event to our standard format
 */
function transformRapidAPIEvent(event: any): Event {
  try {
    // Generate a stable ID
    const id = event.id || event.event_id || `rapidapi-${Math.random().toString(36).substring(2, 15)}`;
    
    // Extract title
    const title = event.name || event.title || "Untitled Event";
    
    // Extract description
    const description = event.description || event.summary || "";
    
    // Extract date and time
    let date = "Date not specified";
    let time = "Time not specified";
    let rawDate = "";
    
    if (event.date) {
      if (typeof event.date === "string") {
        // Try to parse the date string
        try {
          const dateObj = new Date(event.date);
          date = dateObj.toLocaleDateString();
          time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          rawDate = event.date;
        } catch (e) {
          date = event.date;
        }
      } else if (event.date.start_time) {
        // Handle object format
        date = event.date.when || "Date not specified";
        time = event.date.start_time || "Time not specified";
        rawDate = `${date} ${time}`;
      }
    } else if (event.start_time) {
      // Alternative date format
      try {
        const dateObj = new Date(event.start_time);
        date = dateObj.toLocaleDateString();
        time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        rawDate = event.start_time;
      } catch (e) {
        date = "Date not specified";
        time = "Time not specified";
      }
    }
    
    // Extract location and venue
    let location = "Location not specified";
    let venue = "Venue not specified";
    
    if (event.venue) {
      venue = event.venue.name || "Venue not specified";
      location = event.venue.address || venue;
    } else if (event.address) {
      location = event.address;
    } else if (event.location) {
      location = event.location;
    }
    
    // Extract coordinates
    let coordinates: [number, number] | undefined = undefined;
    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;
    
    if (event.venue && event.venue.latitude && event.venue.longitude) {
      latitude = parseFloat(event.venue.latitude);
      longitude = parseFloat(event.venue.longitude);
      coordinates = [longitude, latitude];
    } else if (event.latitude && event.longitude) {
      latitude = parseFloat(event.latitude);
      longitude = parseFloat(event.longitude);
      coordinates = [longitude, latitude];
    }
    
    // Extract image
    const image = event.image || event.image_url || event.thumbnail || DEFAULT_EVENT_IMAGE;
    
    // Extract URL
    const url = event.url || event.event_url || "";
    
    // Extract price
    let price: string | undefined = undefined;
    if (event.price) {
      if (event.price === 0 || event.price === "0" || event.price === "free") {
        price = "Free";
      } else {
        price = `${event.price}`;
      }
    }
    
    // Extract tags
    const tags = event.tags || [];
    
    // Determine if this is a party event
    const isPartyEvent = detectPartyEvent(title, description);
    
    // Determine category and subcategory
    let category = "event";
    let partySubcategory: PartySubcategory | undefined = undefined;
    
    if (isPartyEvent) {
      category = "party";
      partySubcategory = detectPartySubcategory(title, description, time);
    }
    
    return {
      id,
      source: "rapidapi",
      title,
      description,
      date,
      time,
      location,
      venue,
      category,
      partySubcategory,
      image,
      imageAlt: `${title} event image`,
      coordinates,
      latitude,
      longitude,
      url,
      price,
      rawDate,
      isPartyEvent,
      tags
    };
  } catch (error) {
    console.error("Error transforming RapidAPI event:", error);
    return {
      id: `rapidapi-${Math.random().toString(36).substring(2, 15)}`,
      source: "rapidapi",
      title: "Error parsing event",
      description: "There was an error processing this event.",
      date: "Unknown date",
      time: "Unknown time",
      location: "Unknown location",
      category: "other",
      image: DEFAULT_EVENT_IMAGE
    };
  }
}

/**
 * Get event details from RapidAPI
 */
export const getEventDetails = async (eventId: string): Promise<Event | null> => {
  try {
    // Extract the actual event ID from our composite ID
    const actualEventId = eventId.startsWith("rapidapi-") ? eventId.substring(9) : eventId;
    
    // Build the query URL
    const url = `https://real-time-events-search.p.rapidapi.com/event-details?event_id=${encodeURIComponent(actualEventId)}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
      }
    });
    
    if (!response.ok) {
      console.error("RapidAPI event details request failed with status:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || !data.data) {
      console.error("Invalid response from RapidAPI event details endpoint");
      return null;
    }
    
    // Transform the event
    return transformRapidAPIEvent(data.data);
  } catch (error) {
    console.error("Could not fetch event details from RapidAPI:", error);
    return null;
  }
};
