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

    // Sort parameter already added above

    // Add include parameters for additional data - request all available fields for rich event data
    queryParams.append('include', 'location,entities,place,local_rank,rank,category,labels,description,timezone,parent_event,child_events,country,state,location_name,geo,brand,phq_attendance,phq_organizer,phq_venue,ticket_info,url,images,websites,entities.entity.websites,entities.entity.images');

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
  // If the event has a description, use it without any source attribution
  if (event.description && event.description.trim().length > 0) {
    // Remove any existing source attribution patterns with a more comprehensive approach
    let cleanedDescription = event.description;

    // Array of patterns to remove
    const attributionPatterns = [
      /\bsourced from predicthq\b.*?$/i,
      /\bsourced from predicthq\.com\b.*?$/i,
      /\bdata from predicthq\b.*?$/i,
      /\bdata from predicthq\.com\b.*?$/i,
      /\bfrom predicthq\b.*?$/i,
      /\bfrom predicthq\.com\b.*?$/i,
      /\bvia predicthq\b.*?$/i,
      /\bvia predicthq\.com\b.*?$/i,
      /\bpredicthq\.com\b.*?$/i,
      /\bpredicthq\b.*?$/i,
      /\bprovided by predicthq\b.*?$/i,
      /\bprovided by predicthq\.com\b.*?$/i,
      /\bcourtesy of predicthq\b.*?$/i,
      /\bcourtesy of predicthq\.com\b.*?$/i
    ];

    // Apply each pattern
    for (const pattern of attributionPatterns) {
      cleanedDescription = cleanedDescription.replace(pattern, '');
    }

    // Trim any trailing punctuation and whitespace
    cleanedDescription = cleanedDescription.replace(/[.,;:\s]+$/, '').trim();

    // If the description is now empty, return a generic description
    if (!cleanedDescription) {
      return `${event.title} in ${location}`;
    }

    return cleanedDescription;
  }

  // Otherwise, build a rich description from available data
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

  // Return the description without any source attribution
  return parts.join('. ');
}

/**
 * Get the best available URL for an event (ticket link or event page)
 * Prioritizes Eventbrite links when available
 */
function getEventUrl(event: any): string | undefined {
  // Try multiple sources for URLs in order of preference
  let bestUrl: string | undefined = undefined;
  let eventbriteUrl: string | undefined = undefined;

  // Log all potential URLs for debugging
  const allUrls: {source: string, url: string, isEventbrite: boolean}[] = [];

  // Helper function to check if a URL is from Eventbrite
  const isEventbriteUrl = (url: string): boolean => {
    // More comprehensive check for Eventbrite URLs
    return url.includes('eventbrite.com') ||
           url.includes('eventbrite.') ||
           url.includes('evbtn.') || // Eventbrite shortened URLs
           url.includes('evnt.is/'); // Eventbrite shortened URLs
  };

  // Helper function to add a URL to our collection and check if it's from Eventbrite
  const addUrl = (source: string, url: string) => {
    const isFromEventbrite = isEventbriteUrl(url);
    allUrls.push({source, url, isEventbrite: isFromEventbrite});

    // If it's an Eventbrite URL and we don't have one yet, save it
    if (isFromEventbrite && !eventbriteUrl) {
      eventbriteUrl = url;
      console.log(`[PREDICTHQ] Found Eventbrite URL: ${url}`);
    }

    // If we don't have any URL yet, use this one
    if (!bestUrl) {
      bestUrl = url;
    }
  };

  // 1. Check for ticket info links first (highest priority - direct purchase links)
  if (event.ticket_info && event.ticket_info.links && Array.isArray(event.ticket_info.links)) {
    // First look specifically for Eventbrite links
    const eventbriteLink = event.ticket_info.links.find((link: any) =>
      link.url && isEventbriteUrl(link.url));

    if (eventbriteLink && eventbriteLink.url) {
      addUrl('ticket_info.links.eventbrite', eventbriteLink.url);
    }

    // If no Eventbrite link, use the first ticket link
    else if (event.ticket_info.links.length > 0 && event.ticket_info.links[0].url) {
      addUrl('ticket_info.links[0]', event.ticket_info.links[0].url);
    }
  }

  // 2. Check for websites array (official event websites)
  if (event.websites && Array.isArray(event.websites)) {
    // First look specifically for Eventbrite websites
    const eventbriteWebsite = event.websites.find((site: any) =>
      site.url && isEventbriteUrl(site.url));

    if (eventbriteWebsite && eventbriteWebsite.url) {
      addUrl('websites.eventbrite', eventbriteWebsite.url);
    }

    // Then look for ticket website
    const ticketWebsite = event.websites.find((site: any) => site.type === 'tickets');
    if (ticketWebsite && ticketWebsite.url) {
      addUrl('websites.tickets', ticketWebsite.url);
    }

    // Then look for official website
    const officialWebsite = event.websites.find((site: any) => site.type === 'official');
    if (officialWebsite && officialWebsite.url) {
      addUrl('websites.official', officialWebsite.url);
    }

    // If no specific type found, check the first website
    if (event.websites.length > 0 && event.websites[0].url) {
      addUrl('websites[0]', event.websites[0].url);
    }
  }

  // 3. Check for direct event URL
  if (event.url) {
    addUrl('event.url', event.url);
  }

  // 4. Check for entity websites (performers, venues, etc.)
  if (event.entities && Array.isArray(event.entities)) {
    // First look for entities with Eventbrite websites
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.websites && Array.isArray(entity.entity.websites)) {
        const eventbriteSite = entity.entity.websites.find((site: any) =>
          site.url && isEventbriteUrl(site.url));

        if (eventbriteSite && eventbriteSite.url) {
          addUrl('entity.websites.eventbrite', eventbriteSite.url);
        }
      }
    }

    // Then look for entities with ticket websites
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.websites && Array.isArray(entity.entity.websites)) {
        const ticketSite = entity.entity.websites.find((site: any) => site.type === 'tickets');
        if (ticketSite && ticketSite.url) {
          addUrl('entity.websites.tickets', ticketSite.url);
        }
      }
    }

    // Then look for entities with official websites
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.websites && Array.isArray(entity.entity.websites)) {
        const officialSite = entity.entity.websites.find((site: any) => site.type === 'official');
        if (officialSite && officialSite.url) {
          addUrl('entity.websites.official', officialSite.url);
        }
      }
    }

    // Then look for any entity URL
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.websites && Array.isArray(entity.entity.websites) && entity.entity.websites.length > 0) {
        const entityUrl = entity.entity.websites[0].url;
        if (entityUrl) {
          addUrl('entity.websites[0]', entityUrl);
        }
      }
    }

    // Finally check for simple entity URLs
    const entityWithUrl = event.entities.find((entity: any) => entity.url);
    if (entityWithUrl && entityWithUrl.url) {
      addUrl('entity.url', entityWithUrl.url);
    }
  }

  // Log all found URLs for debugging
  if (allUrls.length > 0) {
    console.log(`[PREDICTHQ] Found ${allUrls.length} potential URLs for event ${event.id || 'unknown'}:`, allUrls);
  } else {
    console.log(`[PREDICTHQ] No URLs found for event ${event.id || 'unknown'}`);
  }

  // Prioritize Eventbrite URLs if available
  if (eventbriteUrl) {
    console.log(`[PREDICTHQ] Using Eventbrite URL for event ${event.id || 'unknown'}: ${eventbriteUrl}`);
    return eventbriteUrl;
  }

  // Otherwise use the best URL we found
  if (bestUrl) {
    return bestUrl;
  }

  // If no URL is found, try to construct a search URL
  if (event.title) {
    // Try to construct an Eventbrite search URL with location information
    let searchLocation = '';

    // Try to extract location information for a better search
    if (location && location !== 'Location not specified') {
      // Extract city or state from location
      const locationParts = location.split(',');
      if (locationParts.length > 0) {
        // Use the first part (usually the venue) if it's short, otherwise use the second part (usually the city)
        if (locationParts[0].trim().split(' ').length <= 3) {
          searchLocation = locationParts[0].trim();
        } else if (locationParts.length > 1) {
          searchLocation = locationParts[1].trim();
        } else {
          searchLocation = locationParts[0].trim();
        }
      }
    }

    // Create a more specific search query with title and location
    let eventbriteSearchQuery;
    if (searchLocation) {
      eventbriteSearchQuery = encodeURIComponent(`${event.title} ${searchLocation}`);
    } else {
      eventbriteSearchQuery = encodeURIComponent(event.title);
    }

    // Use the more specific Eventbrite search URL format with date parameters
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const eventbriteSearchUrl = `https://www.eventbrite.com/d/united-states/${eventbriteSearchQuery}/?start_date=${today}`;

    console.log(`[PREDICTHQ] Created Eventbrite search URL for event ${event.id || 'unknown'}: ${eventbriteSearchUrl}`);
    return eventbriteSearchUrl;
  }

  // If all else fails, return undefined
  return undefined;
}

/**
 * Get the best available image for an event
 */
function getEventImage(event: any): string {
  // Try multiple sources for images in order of preference

  // 1. Check if the event has images directly
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

  // 2. Check for images in entities (performers, venues, etc.)
  if (event.entities && Array.isArray(event.entities)) {
    // Look for entities with images
    for (const entity of event.entities) {
      if (entity.entity && entity.entity.images && Array.isArray(entity.entity.images) && entity.entity.images.length > 0) {
        // Find the largest image
        const sortedImages = [...entity.entity.images].sort((a, b) => {
          const aSize = (a.width || 0) * (a.height || 0);
          const bSize = (b.width || 0) * (b.height || 0);
          return bSize - aSize; // Sort by size (largest first)
        });

        return sortedImages[0].url;
      }
    }
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

    // If we still don't have a good location, try to extract from the title
    if (location === 'Location not specified' && event.title) {
      // Look for patterns like "Event Name at Venue" or "Event Name in City"
      const atMatch = event.title.match(/\s+at\s+([^,]+)(,|$)/);
      const inMatch = event.title.match(/\s+in\s+([^,]+)(,|$)/);

      if (atMatch && atMatch[1]) {
        location = atMatch[1].trim();
        console.log(`[PREDICTHQ] Extracted location from title (at): ${location}`);
      } else if (inMatch && inMatch[1]) {
        location = inMatch[1].trim();
        console.log(`[PREDICTHQ] Extracted location from title (in): ${location}`);
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
      console.log(`[PREDICTHQ] Found coordinates from event.location: [${coordinates[0]}, ${coordinates[1]}]`);
    }

    // If no coordinates yet, try to get them from the geo field
    if (!coordinates && event.geo && event.geo.geometry &&
        event.geo.geometry.coordinates && Array.isArray(event.geo.geometry.coordinates) &&
        event.geo.geometry.coordinates.length === 2) {
      coordinates = [event.geo.geometry.coordinates[0], event.geo.geometry.coordinates[1]];
      console.log(`[PREDICTHQ] Found coordinates from event.geo: [${coordinates[0]}, ${coordinates[1]}]`);
    }

    // If no coordinates yet, try to get them from the venue entity
    if (!coordinates && event.entities) {
      const venueEntity = event.entities.find((e: any) => e.type === 'venue');
      if (venueEntity && venueEntity.coordinates && Array.isArray(venueEntity.coordinates) &&
          venueEntity.coordinates.length === 2) {
        coordinates = [venueEntity.coordinates[0], venueEntity.coordinates[1]];
        console.log(`[PREDICTHQ] Found coordinates from venue entity: [${coordinates[0]}, ${coordinates[1]}]`);
      }
    }

    // If no coordinates yet, try to get them from the place field
    if (!coordinates && event.place && event.place.location &&
        Array.isArray(event.place.location) && event.place.location.length === 2) {
      coordinates = [event.place.location[0], event.place.location[1]];
      console.log(`[PREDICTHQ] Found coordinates from place.location: [${coordinates[0]}, ${coordinates[1]}]`);
    }

    // If we still don't have coordinates, try to geocode the location
    if (!coordinates && location && location !== 'Location not specified') {
      // For now, we'll use approximate coordinates based on the state or country
      // In a production environment, you might want to use a geocoding service here

      // Check if we have a state in the location
      const stateMatch = location.match(/([A-Z]{2})$/); // Look for 2-letter state code at end
      if (stateMatch && stateMatch[1]) {
        const state = stateMatch[1];
        // Use approximate state coordinates (this is a simplified approach)
        const stateCoordinates: Record<string, [number, number]> = {
          'NY': [-74.0060, 40.7128], // New York
          'CA': [-118.2437, 34.0522], // Los Angeles
          'TX': [-97.7431, 30.2672], // Austin
          'FL': [-80.1918, 25.7617], // Miami
          'IL': [-87.6298, 41.8781], // Chicago
          'PA': [-75.1652, 39.9526], // Philadelphia
          'MA': [-71.0589, 42.3601], // Boston
          'WA': [-122.3321, 47.6062], // Seattle
          'DC': [-77.0369, 38.9072], // Washington DC
          'CO': [-104.9903, 39.7392], // Denver
          'GA': [-84.3880, 33.7490], // Atlanta
          'TN': [-86.7816, 36.1627], // Nashville
          'NV': [-115.1398, 36.1699], // Las Vegas
          'OR': [-122.6765, 45.5231], // Portland
          'AZ': [-112.0740, 33.4484], // Phoenix
          'OH': [-82.9988, 39.9612], // Columbus
          'NC': [-80.8431, 35.2271], // Charlotte
          'MI': [-83.0458, 42.3314], // Detroit
          'MO': [-90.1994, 38.6270], // St. Louis
          'MN': [-93.2650, 44.9778], // Minneapolis
        };

        if (stateCoordinates[state]) {
          coordinates = stateCoordinates[state];
          console.log(`[PREDICTHQ] Using approximate coordinates for state ${state}: [${coordinates[0]}, ${coordinates[1]}]`);
        }
      }

      // If still no coordinates, check for country
      if (!coordinates && location.includes('United States')) {
        // Default to center of US
        coordinates = [-98.5795, 39.8283];
        console.log(`[PREDICTHQ] Using approximate coordinates for US: [${coordinates[0]}, ${coordinates[1]}]`);
      } else if (!coordinates && location.includes('Canada')) {
        coordinates = [-106.3468, 56.1304];
        console.log(`[PREDICTHQ] Using approximate coordinates for Canada: [${coordinates[0]}, ${coordinates[1]}]`);
      } else if (!coordinates && location.includes('UK') || location.includes('United Kingdom')) {
        coordinates = [-0.1278, 51.5074];
        console.log(`[PREDICTHQ] Using approximate coordinates for UK: [${coordinates[0]}, ${coordinates[1]}]`);
      }
    }

    // If we still don't have coordinates, use the search coordinates as a fallback
    if (!coordinates) {
      console.log(`[PREDICTHQ] No coordinates found for event ${event.id || 'unknown'}, using fallback`);
      // This will be replaced with the search coordinates in the final processing
      coordinates = [-98.5795, 39.8283]; // Center of US as absolute fallback
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

    // Get the description and ensure it's clean
    let description = getEventDescription(event, location);

    // Double-check for any remaining predicthq mentions
    if (description) {
      // Remove any mention of predicthq anywhere in the text
      description = description.replace(/\bpredicthq\b.*?(?=[.!?]|$)/gi, '').trim();
      description = description.replace(/\bpredicthq\.com\b.*?(?=[.!?]|$)/gi, '').trim();

      // Clean up any double spaces or trailing punctuation
      description = description.replace(/\s{2,}/g, ' ').trim();
      description = description.replace(/[.,;:\s]+$/, '').trim();

      // If description is now empty, use a generic one
      if (!description) {
        description = `${event.title} in ${location}`;
      }
    }

    // Get the URL with preference for Eventbrite
    const url = getEventUrl(event);

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
      image: getEventImage(event),
      coordinates,
      url,
      price
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);
    throw error;
  }
}
