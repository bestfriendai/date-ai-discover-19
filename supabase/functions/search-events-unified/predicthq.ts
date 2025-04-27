
import { Event, SearchParams } from "./types.ts";

export async function fetchPredictHQEvents(options: {
  apiKey: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number | string;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  location?: string;
  keyword?: string;
  limit?: number;
}): Promise<{ events: Event[], error?: string }> {
  try {
    if (!options.apiKey) {
      return { events: [], error: "PredictHQ API key is required" };
    }
    
    if ((!options.latitude || !options.longitude) && !options.location) {
      return { events: [], error: "Either coordinates or location is required" };
    }
    
    // Build the API request URL
    const baseUrl = "https://api.predicthq.com/v1/events/";
    const queryParams = new URLSearchParams();

    // Add location-based parameters
    if (options.latitude && options.longitude) {
      // PredictHQ uses "location around" format with distance in km
      const radiusKm = typeof options.radius === 'string' ? parseInt(options.radius) : options.radius || 10;
      queryParams.set('location.origin', `${options.latitude},${options.longitude}`);
      queryParams.set('location.radius', `${radiusKm}km`);
    } else if (options.location) {
      // Use place search instead
      queryParams.set('location.name', options.location);
    }

    // Add date range
    if (options.startDate) {
      const startDate = new Date(options.startDate);
      const formattedStartDate = startDate.toISOString().split('T')[0];
      
      if (options.endDate) {
        const endDate = new Date(options.endDate);
        const formattedEndDate = endDate.toISOString().split('T')[0];
        queryParams.set('date_from', formattedStartDate);
        queryParams.set('date_to', formattedEndDate);
      } else {
        // If no end date, use a range of 30 days from start date
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
        queryParams.set('date_from', formattedStartDate);
        queryParams.set('date_to', endDate.toISOString().split('T')[0]);
      }
    } else {
      // Default to events starting from today
      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      queryParams.set('date_from', today.toISOString().split('T')[0]);
      queryParams.set('date_to', thirtyDaysLater.toISOString().split('T')[0]);
    }

    // Add categories if provided
    // Map our standard categories to PredictHQ categories
    if (options.categories && options.categories.length > 0) {
      const categoryMapping: Record<string, string[]> = {
        'music': ['concerts', 'festivals'],
        'sports': ['sports'],
        'arts': ['expos', 'performing-arts'],
        'family': ['community', 'schools'],
        'food': ['food-and-drink'],
        'party': ['festivals']
      };

      const predicthqCategories: string[] = [];
      
      options.categories.forEach(category => {
        const mappedCategories = categoryMapping[category.toLowerCase()];
        if (mappedCategories) {
          predicthqCategories.push(...mappedCategories);
        }
      });
      
      if (predicthqCategories.length > 0) {
        queryParams.set('category', predicthqCategories.join(','));
      }
    }

    // Add keyword search
    if (options.keyword) {
      queryParams.set('q', options.keyword);
    }

    // Add result limit
    if (options.limit) {
      queryParams.set('limit', options.limit.toString());
    } else {
      queryParams.set('limit', '20'); // Default limit
    }

    // Add sorting - nearest start date first
    queryParams.set('sort', 'start');
    
    // Include local timezone
    queryParams.set('tz', 'local');

    // Always include airport codes to help with venue matching
    queryParams.set('include', 'airports');

    // Make the API request
    const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PredictHQ API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform the results to our standard Event format
    const events = data.results.map((event: any) => {
      // Map PredictHQ categories to our standard categories
      let category = 'event';
      
      // PredictHQ uses an array of categories
      if (event.category) {
        if (event.category === 'concerts') category = 'music';
        else if (event.category === 'sports') category = 'sports';
        else if (['expos', 'performing-arts'].includes(event.category)) category = 'arts';
        else if (['community', 'schools'].includes(event.category)) category = 'family';
        else if (event.category === 'food-and-drink') category = 'food';
        else if (event.category === 'festivals') {
          // Try to determine if it's a music festival or another type
          if (event.title.toLowerCase().includes('music') || 
              event.description?.toLowerCase().includes('music') ||
              event.labels?.includes('music')) {
            category = 'music';
          } else {
            category = 'party';
          }
        }
      }
      
      // Extract date and time
      const startDateTime = new Date(event.start);
      const date = startDateTime.toISOString().split('T')[0];
      const time = startDateTime.toTimeString().split(' ')[0].substring(0, 5);
      
      // Construct image URL if not provided
      // PredictHQ doesn't provide images, so we'll use placeholders based on category
      let image = '/placeholder.svg';
      
      // Format event ID with source prefix
      const id = `predicthq-${event.id}`;
      
      return {
        id,
        title: event.title,
        description: event.description || '',
        date,
        time,
        location: event.entities && event.entities.length > 0 ? event.entities[0].name : event.place_hierarchies?.[0]?.join(', ') || '',
        category,
        image,
        coordinates: event.location ? [event.location[1], event.location[0]] : undefined,
        latitude: event.location ? event.location[0] : undefined,
        longitude: event.location ? event.location[1] : undefined,
        venue: event.entities?.[0]?.name || '',
        url: event.url || '',
        source: 'predicthq'
      };
    });

    return { events };
  } catch (error) {
    console.error("[PREDICTHQ] Error fetching events:", error);
    return { 
      events: [],
      error: error instanceof Error ? error.message : "Unknown error fetching PredictHQ events"
    };
  }
}
