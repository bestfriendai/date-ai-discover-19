
import { Event, SearchParams } from "./types.ts";

export async function fetchTicketmasterEvents(options: {
  apiKey: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number | string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  location?: string;
  segmentName?: string;
  size?: number;
}): Promise<{ events: Event[], error?: string }> {
  try {
    if (!options.apiKey) {
      return { events: [], error: "Ticketmaster API key is required" };
    }
    
    // Build the API request URL
    const baseUrl = "https://app.ticketmaster.com/discovery/v2/events.json";
    const queryParams = new URLSearchParams();
    
    // Add the API key
    queryParams.set('apikey', options.apiKey);
    
    // Add location parameters
    if (options.latitude && options.longitude) {
      queryParams.set('latlong', `${options.latitude},${options.longitude}`);
      
      // Add radius if specified (default to 10 miles)
      const radius = options.radius || 10;
      queryParams.set('radius', radius.toString());
      queryParams.set('unit', 'miles');
    } else if (options.location) {
      // If no coordinates but location string is provided
      queryParams.set('city', options.location);
    }
    
    // Add date range
    if (options.startDate) {
      queryParams.set('startDateTime', `${options.startDate}T00:00:00Z`);
      
      if (options.endDate) {
        queryParams.set('endDateTime', `${options.endDate}T23:59:59Z`);
      }
    }
    
    // Add keyword search
    if (options.keyword) {
      queryParams.set('keyword', options.keyword);
    }
    
    // Add category/segment filter
    if (options.segmentName) {
      queryParams.set('segmentName', options.segmentName);
    }
    
    // Set result size
    queryParams.set('size', (options.size || 20).toString());
    
    // Make the API request
    const response = await fetch(`${baseUrl}?${queryParams.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ticketmaster API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Check if we have events
    if (!data._embedded?.events) {
      return { events: [] };
    }
    
    // Transform the results to our standard Event format
    const events = data._embedded.events.map((event: any) => {
      // Map Ticketmaster categories to our standard categories
      let category = 'event';
      
      if (event.classifications && event.classifications[0]?.segment) {
        const segmentName = event.classifications[0].segment.name.toLowerCase();
        
        if (segmentName === 'music') category = 'music';
        else if (segmentName === 'sports') category = 'sports';
        else if (segmentName === 'arts & theatre') category = 'arts';
        else if (segmentName === 'family' || segmentName === 'family & education') category = 'family';
        else if (segmentName === 'food & drink') category = 'food';
        else if (segmentName === 'festivals') category = 'party';
      }
      
      // Extract date and time
      const date = event.dates?.start?.localDate;
      const time = event.dates?.start?.localTime;
      
      // Get price range if available
      let price;
      if (event.priceRanges && event.priceRanges.length > 0) {
        const priceRange = event.priceRanges[0];
        price = `${priceRange.min} - ${priceRange.max} ${priceRange.currency}`;
      }
      
      // Format event ID with source prefix
      const id = `ticketmaster-${event.id}`;
      
      // Get coordinates from venue
      let coordinates;
      let latitude;
      let longitude;
      
      if (event._embedded?.venues?.[0]?.location) {
        const venue = event._embedded.venues[0];
        longitude = parseFloat(venue.location.longitude);
        latitude = parseFloat(venue.location.latitude);
        coordinates = [longitude, latitude];
      }
      
      return {
        id,
        title: event.name,
        description: event.description || event.info || '',
        date,
        time,
        location: event._embedded?.venues?.[0]?.name || '',
        category,
        image: event.images?.[0]?.url || '/placeholder.svg',
        coordinates,
        latitude,
        longitude,
        venue: event._embedded?.venues?.[0]?.name || '',
        url: event.url || '',
        price,
        source: 'ticketmaster'
      };
    });
    
    return { events };
  } catch (error) {
    console.error("[TICKETMASTER] Error fetching events:", error);
    return { 
      events: [],
      error: error instanceof Error ? error.message : "Unknown error fetching Ticketmaster events"
    };
  }
}
