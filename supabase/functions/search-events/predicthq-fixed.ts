/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event } from './types.ts';

/**
 * Fetch events from PredictHQ API with improved error handling
 */
export async function fetchPredictHQEvents(params: {
  apiKey: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  location?: string;
  keyword?: string;
  limit?: number;
}): Promise<{ events: Event[], error: string | null }> {
  const {
    apiKey,
    latitude,
    longitude,
    radius = 10,
    startDate,
    endDate,
    categories = [],
    location,
    keyword,
    limit = 100
  } = params;

  try {
    console.log('[PREDICTHQ] Fetching events with params:', {
      hasCoordinates: !!(latitude && longitude),
      radius,
      hasDateRange: !!(startDate && endDate),
      categories,
      location,
      keyword,
      limit
    });

    // Build the PredictHQ API URL
    let url = 'https://api.predicthq.com/v1/events/';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add location parameters (either coordinates or place name)
    if (latitude && longitude) {
      // Convert radius from miles to km (PredictHQ uses km)
      const radiusKm = Math.round(radius * 1.60934);
      queryParams.append('within', `${radiusKm}km@${latitude},${longitude}`);
    } else if (location) {
      queryParams.append('place.name', location);
    }

    // Always filter for future events
    const now = new Date();
    // Add a small buffer (subtract 1 hour) to avoid missing events that just started
    now.setHours(now.getHours() - 1);
    const today = now.toISOString().split('T')[0];

    // Use start.gte instead of active.gte to ensure we only get events that haven't started yet
    // or are currently happening (more reliable than active.gte)
    queryParams.append('start.gte', startDate || today);

    // Also add a sort parameter to get the soonest events first
    queryParams.append('sort', 'start');

    // Add end date if provided
    if (endDate) {
      queryParams.append('active.lte', endDate);
    }

    // Add keyword search
    if (keyword) {
      queryParams.append('q', keyword);
    }

    // Add category filters
    if (categories && categories.length > 0) {
      // Map our categories to PredictHQ categories
      const categoryMap: Record<string, string[]> = {
        'music': ['concerts', 'festivals'],
        'sports': ['sports'],
        'arts': ['performing-arts', 'community', 'expos'],
        'family': ['community', 'expos'],
        'food': ['food-drink']
      };

      const predictHQCategories = categories
        .flatMap(cat => categoryMap[cat] || [])
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

      if (predictHQCategories.length > 0) {
        queryParams.append('category', predictHQCategories.join(','));
      }
    }

    // Add limit parameter
    queryParams.append('limit', limit.toString());

    // Add include parameters for additional data - request all available fields for rich event data
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images,websites,entities.entity.websites,entities.entity.images');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    console.log('[PREDICTHQ] API URL:', url);

    // Make the API request with proper error handling
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PREDICTHQ] API error:', response.status, errorText);
      
      // More detailed error logging
      if (response.status === 401) {
        console.error('[PREDICTHQ] Authentication error - check API key');
      } else if (response.status === 429) {
        console.error('[PREDICTHQ] Rate limit exceeded');
      }
      
      return {
        events: [],
        error: `PredictHQ API error: ${response.status} ${errorText}`
      };
    }

    // Parse the response
    const data = await response.json();
    console.log('[PREDICTHQ] API response:', {
      count: data.count,
      resultsCount: data.results?.length || 0
    });

    // Transform PredictHQ events to our format
    const events = data.results?.map(normalizePredictHQEvent) || [];

    return { events, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PREDICTHQ] Error fetching events:', errorMessage);
    return { events: [], error: errorMessage };
  }
}

/**
 * Normalize a PredictHQ event to our standard format
 */
function normalizePredictHQEvent(event: any): Event {
  try {
    // Extract date and time
    const startDate = event.start || new Date().toISOString();
    const date = startDate.split('T')[0];
    const time = startDate.split('T')[1]?.substring(0, 5) || '00:00';

    // Extract location with more detail
    let location = 'Location not specified';

    // Try to build a detailed location string
    const locationParts = [];

    // Add venue name if available from entities
    const venueEntity = event.entities?.find((e: any) => e.type === 'venue');
    const venueName = venueEntity?.name || event.phq_venue?.name;
    if (venueName) {
      locationParts.push(venueName);
    }

    // Add address if available
    if (venueEntity?.formatted_address) {
      locationParts.push(venueEntity.formatted_address);
    } else if (event.phq_venue?.address) {
      locationParts.push(event.phq_venue.address);
    }

    // Add location_name if available
    if (event.location_name) {
      locationParts.push(event.location_name);
    }

    // Add city/place name
    if (event.place?.name) {
      locationParts.push(event.place.name);
    }

    // Add state if available
    if (event.state) {
      locationParts.push(event.state);
    }

    // Add country if available
    if (event.country) {
      locationParts.push(event.country);
    }

    // Build final location string, removing duplicates and filtering empty strings
    if (locationParts.length > 0) {
      // Filter out empty strings and remove duplicates while preserving order
      const uniqueParts = [];
      for (const part of locationParts) {
        if (part && typeof part === 'string' && part.trim() !== '' && !uniqueParts.includes(part)) {
          uniqueParts.push(part);
        }
      }

      // If we have a venue and a city, we can simplify to "Venue, City, State"
      if (uniqueParts.length > 3) {
        // If we have venue name and city, we can simplify
        const hasVenue = venueName && uniqueParts.includes(venueName);
        const hasCity = event.place?.name && uniqueParts.includes(event.place.name);

        if (hasVenue && hasCity) {
          // Create a simplified location with just venue, city, state/country
          const simpleParts = [];

          // Add venue
          simpleParts.push(venueName);

          // Add city
          simpleParts.push(event.place.name);

          // Add state or country (not both)
          if (event.state) {
            simpleParts.push(event.state);
          } else if (event.country) {
            simpleParts.push(event.country);
          }

          location = simpleParts.join(', ');
        } else {
          // Use the full location string if we can't simplify
          location = uniqueParts.join(', ');
        }
      } else {
        // Use the full location string for simpler locations
        location = uniqueParts.join(', ');
      }
    }

    // Extract venue
    const venue = event.entities?.find((e: any) => e.type === 'venue')?.name || event.title;

    // Extract coordinates if available
    let coordinates: [number, number] | undefined = undefined;

    // First try to get coordinates from the event.location field (most accurate)
    if (event.location && Array.isArray(event.location) && event.location.length === 2 &&
        typeof event.location[0] === 'number' && typeof event.location[1] === 'number') {
      // PredictHQ returns [longitude, latitude] which matches our format
      coordinates = [event.location[0], event.location[1]];
    }

    // If no coordinates yet, try to get them from the geo field
    if (!coordinates && event.geo && event.geo.geometry &&
        event.geo.geometry.coordinates && Array.isArray(event.geo.geometry.coordinates) &&
        event.geo.geometry.coordinates.length === 2) {
      coordinates = [event.geo.geometry.coordinates[0], event.geo.geometry.coordinates[1]];
    }

    // Map category with improved detection
    let category = 'other';

    // First check the event's category (most reliable source)
    if (event.category) {
      if (['concerts', 'festivals', 'music'].includes(event.category)) {
        category = 'music';
      } else if (['sports', 'sport'].includes(event.category)) {
        category = 'sports';
      } else if (['performing-arts', 'expos', 'exhibitions', 'arts', 'theatre', 'theater'].includes(event.category)) {
        category = 'arts';
      } else if (['community', 'family', 'children'].includes(event.category)) {
        category = 'family';
      } else if (['food-drink', 'food', 'dining', 'culinary'].includes(event.category)) {
        category = 'food';
      }
    }

    // Generate a unique ID
    const id = `predicthq-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Get the description and ensure it's clean
    let description = event.description || `${event.title} in ${location}`;

    // Remove any mention of predicthq anywhere in the text
    if (description) {
      description = description.replace(/\bpredicthq\b.*?(?=[.!?]|$)/gi, '').trim();
      description = description.replace(/\bpredicthq\.com\b.*?(?=[.!?]|$)/gi, '').trim();
    }

    // Get image URL
    let imageUrl = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
    
    // Try to get image from event
    if (event.images && Array.isArray(event.images) && event.images.length > 0) {
      imageUrl = event.images[0].url;
    }
    
    // Category-based fallback images
    const categoryImages = {
      'music': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
      'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
      'arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
      'family': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
      'food': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'
    };
    
    // Use category image if no event image
    if (!event.images && category !== 'other' && categoryImages[category]) {
      imageUrl = categoryImages[category];
    }

    return {
      id,
      source: 'predicthq',
      title: event.title,
      description,
      date,
      time,
      location,
      venue,
      category,
      image: imageUrl,
      coordinates,
      url: event.url,
      price: event.ticket_info?.price
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);
    throw error;
  }
}
