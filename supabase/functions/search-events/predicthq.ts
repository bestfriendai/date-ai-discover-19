/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event } from './types.ts';

/**
 * Fetch events from PredictHQ API
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
    const today = new Date().toISOString().split('T')[0];
    queryParams.append('active.gte', startDate || today);

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

    // Add sort parameter (sort by start date ascending)
    queryParams.append('sort', 'start');

    // Add include parameters for additional data
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images');

    // Append query parameters to URL
    url += `?${queryParams.toString()}`;

    console.log('[PREDICTHQ] API URL:', url);

    // Make the API request
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
 * Get a rich description for the event
 */
function getEventDescription(event: any, location: string): string {
  // If the event has a description, use it
  if (event.description && event.description.trim().length > 0) {
    return event.description;
  }

  // Otherwise, build a description from available data
  const parts = [];

  // Add basic info
  parts.push(`${event.title} in ${location}`);

  // Add category if available
  if (event.category) {
    const categoryMap: Record<string, string> = {
      'concerts': 'Concert',
      'festivals': 'Festival',
      'performing-arts': 'Performing Arts Event',
      'sports': 'Sports Event',
      'community': 'Community Event',
      'expos': 'Expo',
      'conferences': 'Conference',
      'food-drink': 'Food & Drink Event'
    };

    const categoryName = categoryMap[event.category] || event.category;
    parts.push(`Event type: ${categoryName}`);
  }

  // Add attendance if available
  if (event.phq_attendance) {
    parts.push(`Expected attendance: ${event.phq_attendance}`);
  }

  // Add labels if available
  if (event.labels && Array.isArray(event.labels) && event.labels.length > 0) {
    parts.push(`Tags: ${event.labels.join(', ')}`);
  }

  // Add ticket info if available
  if (event.ticket_info) {
    if (event.ticket_info.minimum_price && event.ticket_info.maximum_price) {
      if (event.ticket_info.minimum_price === event.ticket_info.maximum_price) {
        parts.push(`Ticket price: ${event.ticket_info.minimum_price} ${event.ticket_info.currency || 'USD'}`);
      } else {
        parts.push(`Ticket price: ${event.ticket_info.minimum_price} - ${event.ticket_info.maximum_price} ${event.ticket_info.currency || 'USD'}`);
      }
    } else if (event.ticket_info.minimum_price) {
      parts.push(`Ticket price from: ${event.ticket_info.minimum_price} ${event.ticket_info.currency || 'USD'}`);
    } else if (event.ticket_info.maximum_price) {
      parts.push(`Ticket price up to: ${event.ticket_info.maximum_price} ${event.ticket_info.currency || 'USD'}`);
    }

    if (event.ticket_info.free) {
      parts.push('This is a free event');
    }
  }

  // Add source attribution
  parts.push('Sourced from predicthq.com');

  return parts.join('. ');
}

/**
 * Get the best available URL for an event (ticket link or event page)
 */
function getEventUrl(event: any): string | undefined {
  // Check for ticket info first
  if (event.ticket_info && event.ticket_info.links && Array.isArray(event.ticket_info.links) && event.ticket_info.links.length > 0) {
    // Return the first ticket link
    return event.ticket_info.links[0].url;
  }

  // If no ticket links, check for event URL
  if (event.url) {
    return event.url;
  }

  // If no URL is available, check for entities with URLs
  if (event.entities && Array.isArray(event.entities)) {
    // Look for entities with URLs
    const entityWithUrl = event.entities.find((entity: any) => entity.url);
    if (entityWithUrl) {
      return entityWithUrl.url;
    }
  }

  // If no URL is found, return undefined
  return undefined;
}

/**
 * Get the best available image for an event
 */
function getEventImage(event: any): string {
  // Check if the event has images
  if (event.images && Array.isArray(event.images) && event.images.length > 0) {
    // Find the largest image
    const sortedImages = [...event.images].sort((a, b) => {
      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize; // Sort by size (largest first)
    });

    // Return the URL of the largest image
    return sortedImages[0].url;
  }

  // If no images are available, use a category-based placeholder
  const categoryImages = {
    'concerts': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop',
    'festivals': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
    'performing-arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop',
    'sports': 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop',
    'community': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop',
    'expos': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
    'conferences': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop',
    'food-drink': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop'
  };

  // Return category-specific image if available
  if (event.category && categoryImages[event.category]) {
    return categoryImages[event.category];
  }

  // Default placeholder
  return 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
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

    // Add venue name if available
    const venueName = event.entities?.find((e: any) => e.type === 'venue')?.name;
    if (venueName) {
      locationParts.push(venueName);
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

    // Build final location string, removing duplicates
    if (locationParts.length > 0) {
      // Remove duplicates while preserving order
      const uniqueParts = [];
      for (const part of locationParts) {
        if (!uniqueParts.includes(part)) {
          uniqueParts.push(part);
        }
      }
      location = uniqueParts.join(', ');
    }

    // Extract venue
    const venue = event.entities?.find((e: any) => e.type === 'venue')?.name || event.title;

    // Extract coordinates if available
    let coordinates: [number, number] | undefined = undefined;
    if (event.location && Array.isArray(event.location) && event.location.length === 2) {
      // PredictHQ returns [longitude, latitude] which matches our format
      coordinates = [event.location[0], event.location[1]];
    }

    // Map category with improved detection
    let category = 'other';

    // First check the event's category
    if (event.category) {
      if (['concerts', 'festivals'].includes(event.category)) {
        category = 'music';
      } else if (event.category === 'sports') {
        category = 'sports';
      } else if (['performing-arts', 'expos'].includes(event.category)) {
        category = 'arts';
      } else if (event.category === 'community') {
        category = 'family';
      } else if (event.category === 'food-drink') {
        category = 'food';
      }
    }

    // If category is still 'other', try to determine from labels
    if (category === 'other' && event.labels && Array.isArray(event.labels)) {
      const labels = event.labels.map((label: string) => label.toLowerCase());

      // Check for music-related labels
      if (labels.some(label => [
        'music', 'concert', 'festival', 'band', 'performance', 'dj', 'live music',
        'singer', 'musician', 'orchestra', 'symphony'
      ].includes(label))) {
        category = 'music';
      }
      // Check for sports-related labels
      else if (labels.some(label => [
        'sports', 'game', 'match', 'tournament', 'competition', 'athletics',
        'football', 'soccer', 'basketball', 'baseball', 'hockey', 'tennis'
      ].includes(label))) {
        category = 'sports';
      }
      // Check for arts-related labels
      else if (labels.some(label => [
        'art', 'exhibition', 'gallery', 'museum', 'theater', 'theatre', 'dance',
        'ballet', 'opera', 'play', 'performance art', 'cultural'
      ].includes(label))) {
        category = 'arts';
      }
      // Check for family-related labels
      else if (labels.some(label => [
        'family', 'kids', 'children', 'child-friendly', 'family-friendly',
        'educational', 'workshop', 'school'
      ].includes(label))) {
        category = 'family';
      }
      // Check for food-related labels
      else if (labels.some(label => [
        'food', 'drink', 'dining', 'restaurant', 'culinary', 'tasting',
        'wine', 'beer', 'festival', 'market'
      ].includes(label))) {
        category = 'food';
      }
    }

    // If still 'other', check title and description
    if (category === 'other') {
      const titleLower = event.title.toLowerCase();
      const descLower = (event.description || '').toLowerCase();

      // Check for keywords in title and description
      if (titleLower.includes('concert') || titleLower.includes('music') ||
          titleLower.includes('festival') || descLower.includes('band') ||
          descLower.includes('music')) {
        category = 'music';
      } else if (titleLower.includes('game') || titleLower.includes('match') ||
                titleLower.includes('sports') || descLower.includes('tournament')) {
        category = 'sports';
      } else if (titleLower.includes('art') || titleLower.includes('exhibit') ||
                titleLower.includes('theatre') || titleLower.includes('theater') ||
                descLower.includes('gallery')) {
        category = 'arts';
      } else if (titleLower.includes('family') || titleLower.includes('kids') ||
                titleLower.includes('children') || descLower.includes('family-friendly')) {
        category = 'family';
      } else if (titleLower.includes('food') || titleLower.includes('drink') ||
                titleLower.includes('tasting') || titleLower.includes('dinner') ||
                descLower.includes('culinary')) {
        category = 'food';
      }
    }

    // Extract price (if available)
    let price: string | undefined = undefined;
    if (event.entities) {
      const priceEntity = event.entities.find((e: any) => e.type === 'price');
      if (priceEntity && priceEntity.formatted_value) {
        price = priceEntity.formatted_value;
      }
    }

    // Generate a unique ID
    const id = `predicthq-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      id,
      source: 'predicthq',
      title: event.title,
      description: getEventDescription(event, location),
      date,
      time,
      location,
      venue,
      category,
      image: getEventImage(event),
      coordinates,
      url: getEventUrl(event),
      price
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);
    throw error;
  }
}
