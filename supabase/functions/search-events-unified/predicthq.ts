/**
 * Simplified PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event } from './types.ts';

interface PredictHQParams {
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
}

/**
 * Fetch events from PredictHQ API
 */
export async function fetchPredictHQEvents(params: PredictHQParams): Promise<{ events: Event[], error: string | null }> {
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

    // Use start.gte to ensure we only get events that haven't started yet
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

    // Add include parameters for additional data
    queryParams.append('include', 'location,place,local_rank,category,description,timezone,geo,phq_attendance,ticket_info,url,images');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    console.log('[PREDICTHQ] API URL:', url);

    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PREDICTHQ] API error:', response.status, errorText);
      return {
        events: [],
        error: `PredictHQ API error: ${response.status} ${errorText}`
      };
    }

    const startTime = Date.now();
    
    // Parse the response
    const data = await response.json();
    console.log('[PREDICTHQ] API response:', {
      count: data.count,
      resultsCount: data.results?.length || 0
    });

    // Transform PredictHQ events to our format
    const transformedEvents = data.results?.map(normalizePredictHQEvent) || [];

    console.log(`[PREDICTHQ] Transformed ${transformedEvents.length} events`);
    
    // Browser console log for tracking successful events
    console.log('%c[PREDICTHQ] Successfully fetched events', 'color: #4CAF50; font-weight: bold', {
      totalCount: data.count,
      returnedCount: data.results?.length || 0,
      transformedCount: transformedEvents.length,
      eventsWithImages: transformedEvents.filter(e => e.image && e.image !== 'https://placehold.co/600x400?text=No+Image').length,
      eventsWithUrls: transformedEvents.filter(e => e.url).length,
      categories: transformedEvents.reduce((acc, event) => {
        if (event.category) {
          acc[event.category] = (acc[event.category] || 0) + 1;
        }
        return acc;
      }, {})
    });

    console.log(`[PREDICTHQ] Returning ${transformedEvents.length} events`);
    
    // Summary console log for tracking
    console.log('%c[PREDICTHQ] Summary', 'color: #2196F3; font-weight: bold', {
      eventsCount: transformedEvents.length,
      params: params,
      executionTime: Date.now() - startTime
    });
    
    return { events: transformedEvents, error: null };
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

    // Extract location
    let location = 'Location not specified';

    // Try to build a detailed location string
    const locationParts = [];

    // Add venue name if available
    const venueName = event.entities?.find((e: any) => e.type === 'venue')?.name || event.title;
    if (venueName) {
      locationParts.push(venueName);
    }

    // Add place name
    if (event.place?.name) {
      locationParts.push(event.place.name);
    }

    // Add state if available
    if (event.state) {
      locationParts.push(event.state);
    }

    // Build final location string
    if (locationParts.length > 0) {
      location = locationParts.join(', ');
    }

    // Extract coordinates
    let coordinates: [number, number] | undefined = undefined;

    // First try to get coordinates from the event.location field (most accurate)
    if (event.location && Array.isArray(event.location) && event.location.length === 2) {
      coordinates = [event.location[0], event.location[1]];
    }
    // If no coordinates yet, try to get them from the geo field
    else if (event.geo?.geometry?.coordinates && Array.isArray(event.geo.geometry.coordinates)) {
      coordinates = [event.geo.geometry.coordinates[0], event.geo.geometry.coordinates[1]];
    }
    // If no coordinates yet, try to get them from the place field
    else if (event.place?.location && Array.isArray(event.place.location)) {
      coordinates = [event.place.location[0], event.place.location[1]];
    }

    // Map category
    let category = 'other';
    if (event.category) {
      if (['concerts', 'festivals'].includes(event.category)) {
        category = 'music';
      } else if (['sports'].includes(event.category)) {
        category = 'sports';
      } else if (['performing-arts', 'expos', 'exhibitions'].includes(event.category)) {
        category = 'arts';
      } else if (['community'].includes(event.category)) {
        category = 'family';
      } else if (['food-drink'].includes(event.category)) {
        category = 'food';
      }
    }

    // Extract price
    let price: string | undefined = undefined;
    if (event.ticket_info) {
      if (event.ticket_info.minimum_price && event.ticket_info.maximum_price) {
        price = `${event.ticket_info.minimum_price} - ${event.ticket_info.maximum_price} ${event.ticket_info.currency || 'USD'}`;
      } else if (event.ticket_info.minimum_price) {
        price = `From ${event.ticket_info.minimum_price} ${event.ticket_info.currency || 'USD'}`;
      }
    }

    // Get image
    let image = '';
    if (event.images && Array.isArray(event.images) && event.images.length > 0) {
      image = event.images[0].url;
    } else {
      // Default placeholder based on category
      const categoryImages: Record<string, string> = {
        'music': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
        'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
        'arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
        'family': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
        'food': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'
      };

      image = categoryImages[category] || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
    }

    // Get URL
    let url = event.url;
    if (!url && event.ticket_info?.links && event.ticket_info.links.length > 0) {
      url = event.ticket_info.links[0].url;
    }

    // Get description
    let description = event.description || `${event.title} in ${location}`;

    // Remove any mention of predicthq
    description = description.replace(/\bpredicthq\b.*?(?=[.!?]|$)/gi, '').trim();
    description = description.replace(/\bpredicthq\.com\b.*?(?=[.!?]|$)/gi, '').trim();

    return {
      id: `predicthq-${event.id || Date.now()}`,
      source: 'predicthq',
      title: event.title,
      description,
      date,
      time,
      location,
      venue: venueName,
      category,
      image,
      coordinates,
      url,
      price
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);

    // Return a minimal valid event in case of error
    return {
      id: `predicthq-error-${Date.now()}`,
      source: 'predicthq',
      title: event?.title || 'Unknown Event',
      description: 'Error processing event details',
      date: event?.start?.split('T')[0] || new Date().toISOString().split('T')[0],
      time: event?.start?.split('T')[1]?.substring(0, 5) || '00:00',
      location: 'Location unavailable',
      category: 'other',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop'
    };
  }
}
