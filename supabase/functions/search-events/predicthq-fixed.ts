/**
 * PredictHQ API integration for fetching events
 * Documentation: https://docs.predicthq.com/
 */

import { Event } from './types.ts';
import { detectPartyEvent, detectPartySubcategory } from './partyUtils.ts';

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
  withinParam?: string; // Pre-formatted within parameter
  keyword?: string;
  limit?: number;
}): Promise<{ events: Event[], error: string | null }> {
  const {
    apiKey,
    latitude,
    longitude,
    radius = 50, // Significantly increased default radius for more party events
    startDate,
    endDate,
    categories = [],
    location,
    withinParam,
    keyword,
    limit = 500 // Significantly increased limit for more party events
  } = params;

  try {
    // Validate API key
    if (!apiKey) {
      console.error('[PREDICTHQ] API key is missing');
      return { events: [], error: 'PredictHQ API key is missing' };
    }

    console.log('[PREDICTHQ] Fetching events with params:', {
      hasCoordinates: !!(latitude && longitude),
      radius,
      hasDateRange: !!(startDate && endDate),
      categories,
      location,
      locationProvided: !!location,
      locationLength: location ? location.length : 0,
      withinParam,
      keyword,
      limit,
      apiKeyProvided: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'N/A'
    });

    // Build the PredictHQ API URL
    let url = 'https://api.predicthq.com/v1/events/';

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Add location parameters (either coordinates or place name)
    if (withinParam) {
      // Use the pre-formatted within parameter directly
      queryParams.append('within', withinParam);
      console.log(`[PREDICTHQ] Using pre-formatted within parameter: ${withinParam}`);
    } else if (latitude && longitude) {
      // Convert radius from miles to km (PredictHQ uses km)
      // For party events, use a much larger radius
      let effectiveRadius = radius;
      if (categories && categories.includes('party')) {
        effectiveRadius = Math.max(radius, 75); // At least 75 miles for party events
        console.log(`[PREDICTHQ] Using significantly increased radius for party events: ${effectiveRadius} miles`);
      }
      const radiusKm = Math.round(effectiveRadius * 1.60934);
      queryParams.append('within', `${radiusKm}km@${latitude},${longitude}`);
      console.log(`[PREDICTHQ] Using coordinates: ${latitude},${longitude} with radius ${radiusKm}km`);
    } else if (location) {
      // Check if location is a comma-separated lat,lng string
      const latLngMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (latLngMatch) {
        const lat = parseFloat(latLngMatch[1]);
        const lng = parseFloat(latLngMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          // Convert radius from miles to km (PredictHQ uses km)
          // For party events, use a much larger radius
          let effectiveRadius = radius;
          if (categories && categories.includes('party')) {
            effectiveRadius = Math.max(radius, 75); // At least 75 miles for party events
            console.log(`[PREDICTHQ] Using significantly increased radius for party events: ${effectiveRadius} miles`);
          }
          const radiusKm = Math.round(effectiveRadius * 1.60934);
          queryParams.append('within', `${radiusKm}km@${lat},${lng}`);
          console.log(`[PREDICTHQ] Parsed coordinates from location string: ${lat},${lng} with radius ${radiusKm}km`);
        } else {
          console.log(`[PREDICTHQ] Invalid coordinates in location string: ${location}, using as place name`);
          queryParams.append('place.name', location);
        }
      } else {
        // Try to clean up the location string to improve matching
        const cleanLocation = location.replace(/\s+/g, ' ').trim();
        console.log(`[PREDICTHQ] Using location as place name: ${cleanLocation}`);
        queryParams.append('place.name', cleanLocation);
      }
    } else {
      // Default to a popular location if none provided
      console.log(`[PREDICTHQ] No location or coordinates provided, using default location`);
      queryParams.append('place.name', 'New York');
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

    // --- Ensure party events are prioritized in PredictHQ queries ---
    // If categories includes 'party', always add party-related PredictHQ categories and labels/keywords
    let categoriesForQuery = categories || [];
    let keywordForQuery = keyword;
    let labelsForQuery = [];
    if (categoriesForQuery.includes('party')) {
      // Add all party-related PredictHQ categories - only using valid PredictHQ categories
      // Prioritize categories that are most likely to contain party events
      const partyCategories = ['concerts','festivals','community','conferences','performing-arts','expos','sports'];
      categoriesForQuery = Array.from(new Set([...categoriesForQuery, ...partyCategories]));

      // Always include all these categories when searching for parties
      // This ensures we get the widest possible range of events that could be parties

      // Force the category parameter to include all party-related categories
      queryParams.append('category', partyCategories.join(','));

      // Add party-related labels - massively expanded for comprehensive coverage
      // We'll rely heavily on labels to identify potential party events
      labelsForQuery = [
        // Nightlife and club related
        'nightlife','party','club','nightclub','dance-club','disco','lounge','bar',
        'dance-party','dance-floor','dancing','dj-set','dj-night','dj-party',
        'after-hours','late-night','bottle-service','vip-tables','vip-section',
        'night-out','night-life','club-night','dance-night','party-night',

        // Social events
        'social-gathering','celebration','networking','mixer','social',
        'meetup','meet-and-greet','singles','speed-dating','social-event',
        'happy-hour','cocktail','cocktail-party','open-bar','drinks',
        'social-mixer','networking-event','singles-event','mingling',

        // Music and entertainment
        'music','live-music','concert','performance','show','entertainment',
        'dance','dj','electronic-music','hip-hop','edm','house-music',
        'techno','rave','festival','music-festival','dance-music',
        'live-dj','live-band','live-performance','music-event','concert-event',

        // Special events
        'gala','reception','vip','exclusive','launch-party','opening',
        'premiere','after-party','release-party','album-release',
        'birthday-party','anniversary-party','celebration-event',
        'special-event','exclusive-event','vip-event','private-event',

        // Day parties
        'day-party','pool-party','beach-party','brunch','day-club',
        'afternoon-party','rooftop-party','outdoor-party','bbq-party',
        'daytime-event','pool-event','rooftop-event','outdoor-event',

        // Venue types
        'venue','club-venue','event-space','rooftop','terrace',
        'warehouse-party','underground-party','pop-up-party',
        'lounge-venue','bar-venue','nightclub-venue','dance-venue',

        // Additional party types
        'themed-party','costume-party','masquerade','holiday-party',
        'new-years-party','halloween-party','summer-party','winter-party',
        'spring-party','fall-party','seasonal-party','annual-party'
      ];

      // Add comprehensive party-related keywords if not present - strengthened for better party detection
      if (!keywordForQuery) {
        // Create a very comprehensive party keyword search to compensate for category limitations
        keywordForQuery = 'party OR club OR nightclub OR social OR celebration OR dance OR dj OR nightlife OR festival OR mixer OR gathering OR gala OR reception OR meetup OR "happy hour" OR cocktail OR rave OR "live music" OR concert OR lounge OR venue OR vip OR exclusive OR "pool party" OR "day party" OR "dance party" OR "after party" OR "launch party" OR "birthday party" OR "singles party" OR "warehouse party" OR "underground party" OR "rooftop party" OR "beach party" OR "brunch party" OR "dj set" OR "bottle service" OR "vip tables" OR "open bar" OR "night out" OR "dance floor" OR "dancing" OR "electronic music" OR "hip hop" OR "edm" OR "house music" OR "techno" OR "disco" OR "bar crawl" OR "pub crawl" OR "social event" OR "networking event" OR "mixer event" OR "celebration event" OR "vip event" OR "exclusive event" OR "special event" OR "dance event" OR "music event" OR "nightlife event" OR "themed party" OR "costume party" OR "masquerade" OR "holiday party" OR "new years party" OR "halloween party" OR "summer party" OR "winter party" OR "spring party" OR "fall party" OR "seasonal party" OR "annual party" OR "live dj" OR "live band" OR "live performance" OR "music venue" OR "dance venue" OR "nightclub venue" OR "lounge venue" OR "bar venue" OR "club night" OR "dance night" OR "party night" OR "night life" OR "social mixer" OR "networking event" OR "singles event" OR "mingling" OR "daytime event" OR "pool event" OR "rooftop event" OR "outdoor event"';
      }

      // Increase the limit for party events
      if (limit < 500) {
        limit = 500;
        console.log('[PREDICTHQ] Increased limit for party events to 500');
      }

      console.log('[PARTY_DEBUG] Enhanced PredictHQ filters for party events');
    }
    // --- END party events prioritization ---

    // Add category filters
    if (categoriesForQuery && categoriesForQuery.length > 0) {
      // Map our categories to PredictHQ categories
      const categoryMap: Record<string, string[]> = {
        'music': ['concerts', 'festivals'],
        'sports': ['sports'],
        'arts': ['performing-arts', 'community', 'expos'],
        'family': ['community', 'expos'],
        'food': ['community', 'expos'],
        // Include categories that might contain party events - only using valid PredictHQ categories
        'party': ['festivals', 'community', 'conferences', 'concerts', 'expos', 'performing-arts', 'sports', 'community']
      };

      // Log the categories for debugging
      console.log(`[CATEGORY_DEBUG] Requested categories: ${categoriesForQuery.join(', ')}`);
      console.log(`[CATEGORY_DEBUG] Mapped PredictHQ categories: ${categoriesForQuery.flatMap(cat => categoryMap[cat] || []).join(', ')}`);

      // Make sure 'party' is included in the categories if requested
      if (categoriesForQuery.includes('party')) {
        console.log('[CATEGORY_DEBUG] Party category requested, ensuring party-related categories are included');
      }

      const predictHQCategories = categoriesForQuery
        .flatMap(cat => categoryMap[cat] || [])
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

      if (predictHQCategories.length > 0) {
        queryParams.append('category', predictHQCategories.join(','));
      }
    }
    // Add labels if present
    if (labelsForQuery.length > 0) {
      queryParams.append('labels', labelsForQuery.join(','));
    }
    // Add keyword search
    if (keywordForQuery) {
      queryParams.append('q', keywordForQuery);
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
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
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
      } else if (response.status === 400) {
        // Bad request - likely an issue with the parameters
        console.error('[PREDICTHQ] Bad request - check parameters');
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            console.error('[PREDICTHQ] Error details:', errorJson.error);
          }
        } catch (e) {
          // If it's not valid JSON, just log the raw text
          console.error('[PREDICTHQ] Error details (raw):', errorText);
        }
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
      resultsCount: data.results?.length || 0,
      next: !!data.next,
      previous: !!data.previous
    });

    // Log the first result for debugging if available
    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      console.log('[PREDICTHQ] First result sample:', {
        id: firstResult.id,
        title: firstResult.title,
        start: firstResult.start,
        location: firstResult.location,
        hasCoordinates: Array.isArray(firstResult.location) && firstResult.location.length === 2
      });
    } else {
      console.log('[PREDICTHQ] No results returned');
    }

    // Transform PredictHQ events to our format
    const events = data.results?.map(normalizePredictHQEvent) || [];

    return { events, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PREDICTHQ] Error fetching events:', errorMessage);

    // Provide more detailed error information
    let detailedError = errorMessage;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        detailedError = 'PredictHQ API request timed out after 10 seconds';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        detailedError = 'Network error when connecting to PredictHQ API';
      } else if (error.stack) {
        console.error('[PREDICTHQ] Error stack:', error.stack);
      }
    }

    return { events: [], error: detailedError };
  }
}

/**
 * Normalize a PredictHQ event to our standard format
 */
function normalizePredictHQEvent(event: any): Event {
  try {
    // Validate event object
    if (!event || typeof event !== 'object') {
      console.error('[PREDICTHQ] Invalid event object:', event);
      throw new Error('Invalid event object');
    }

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

    // If no coordinates yet, try to get them from the venue entity
    if (!coordinates && event.entities) {
      const venueEntity = event.entities.find((e: any) => e.type === 'venue');
      if (venueEntity && venueEntity.coordinates && Array.isArray(venueEntity.coordinates) &&
          venueEntity.coordinates.length === 2) {
        coordinates = [venueEntity.coordinates[0], venueEntity.coordinates[1]];
      }
    }

    // If no coordinates yet, try to get them from the place field
    if (!coordinates && event.place && event.place.location &&
        Array.isArray(event.place.location) && event.place.location.length === 2) {
      coordinates = [event.place.location[0], event.place.location[1]];
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

    // Check for party events using party detection utilities

    // Check if this is a party event based on title and description
    let partySubcategory: any = undefined;
    const isPartyByDetection = detectPartyEvent(event.title, event.description);

    // Also check if the event has party-related labels
    // Check if the event has party-related labels - expanded list for better detection
    const hasPartyLabels = event.labels && Array.isArray(event.labels) && event.labels.some(label => {
      const partyLabels = [
        'nightlife', 'party', 'club', 'nightclub', 'dance-club', 'disco', 'lounge',
        'dance-party', 'dj-set', 'dj-night', 'dj-party', 'social-gathering', 'celebration',
        'mixer', 'happy-hour', 'cocktail', 'rave', 'festival', 'gala', 'reception',
        'day-party', 'pool-party', 'beach-party', 'brunch', 'day-club', 'rooftop-party',
        'night-out', 'night-life', 'club-night', 'dance-night', 'party-night',
        'social-mixer', 'networking-event', 'singles-event', 'mingling',
        'live-dj', 'live-band', 'live-performance', 'music-event', 'concert-event',
        'special-event', 'exclusive-event', 'vip-event', 'private-event',
        'daytime-event', 'pool-event', 'rooftop-event', 'outdoor-event',
        'lounge-venue', 'bar-venue', 'nightclub-venue', 'dance-venue',
        'themed-party', 'costume-party', 'masquerade', 'holiday-party',
        'new-years-party', 'halloween-party', 'summer-party', 'winter-party',
        'spring-party', 'fall-party', 'seasonal-party', 'annual-party'
      ];
      return partyLabels.includes(label);
    });

    // Check if the event is in a venue that suggests it's a party - expanded venue types
    const hasPartyVenue = event.entities && Array.isArray(event.entities) && event.entities.some(entity => {
      if (entity.type === 'venue' && entity.name) {
        const partyVenueTerms = [
          'club', 'lounge', 'bar', 'nightclub', 'disco', 'party', 'dance', 'dj',
          'venue', 'hall', 'ballroom', 'terrace', 'rooftop', 'warehouse', 'underground',
          'event space', 'event-space', 'social', 'mixer', 'gathering', 'celebration'
        ];
        return partyVenueTerms.some(term => entity.name.toLowerCase().includes(term));
      }
      return false;
    });

    // Check if the event title or description contains party-related terms - massively expanded list
    const partyTerms = [
      // Basic party terms
      'party', 'club', 'nightclub', 'dance', 'dj', 'nightlife', 'festival', 'mixer',
      'gathering', 'gala', 'reception', 'happy hour', 'cocktail', 'rave', 'live music',
      'concert', 'lounge', 'vip', 'exclusive', 'pool party', 'day party', 'dance party',
      'after party', 'launch party', 'birthday party', 'singles', 'warehouse', 'underground',
      'rooftop', 'beach party', 'brunch', 'dj set', 'bottle service', 'open bar',

      // Additional party terms
      'night out', 'night life', 'club night', 'dance night', 'party night',
      'social mixer', 'networking event', 'singles event', 'mingling',
      'live dj', 'live band', 'live performance', 'music event', 'concert event',
      'special event', 'exclusive event', 'vip event', 'private event',
      'daytime event', 'pool event', 'rooftop event', 'outdoor event',

      // Venue types
      'lounge venue', 'bar venue', 'nightclub venue', 'dance venue',
      'event space', 'ballroom', 'terrace', 'hall',

      // Themed parties
      'themed party', 'costume party', 'masquerade', 'holiday party',
      'new years party', 'halloween party', 'summer party', 'winter party',
      'spring party', 'fall party', 'seasonal party', 'annual party',

      // Music genres common at parties
      'electronic', 'hip hop', 'hip-hop', 'edm', 'house', 'techno', 'disco',
      'dance music', 'dance floor', 'dancing'
    ];

    const hasPartyTerms = partyTerms.some(term => {
      const lowerTitle = (event.title || '').toLowerCase();
      const lowerDesc = (event.description || '').toLowerCase();
      return lowerTitle.includes(term) || lowerDesc.includes(term);
    });

    // Check if the event is in a party-related category - expanded categories
    const partyCategories = ['concerts', 'festivals', 'community', 'performing-arts', 'expos'];
    const hasPartyCategory = event.category && partyCategories.includes(event.category);

    // Log party detection for debugging
    console.log(`[PARTY_DEBUG] PredictHQ Event: ${event.title}, Category: ${category}, IsPartyByDetection: ${isPartyByDetection}, HasPartyLabels: ${hasPartyLabels}, HasPartyVenue: ${hasPartyVenue}, HasPartyTerms: ${hasPartyTerms}, HasPartyCategory: ${hasPartyCategory}`);

    // If any of our party detection methods return true, categorize as a party
    // We're being more aggressive with party detection to compensate for category limitations
    if (isPartyByDetection || hasPartyLabels || hasPartyVenue || hasPartyTerms || hasPartyCategory) {
      category = 'party';
      partySubcategory = detectPartySubcategory(event.title, event.description, time);
      console.log(`[PARTY_DEBUG] PredictHQ event categorized as party with subcategory: ${partySubcategory}`);
    }

    // For events from PredictHQ with certain categories, be more aggressive about categorizing as parties
    // This ensures we get more party events from PredictHQ
    if (event.category === 'concerts' || event.category === 'festivals' || event.category === 'performing-arts') {
      // Check if the title or description contains music-related terms that suggest a party
      const musicPartyTerms = [
        'dj', 'dance', 'club', 'party', 'nightlife', 'electronic', 'hip hop', 'hip-hop', 'edm', 'house', 'techno',
        'disco', 'rave', 'festival', 'concert', 'live music', 'performance', 'show', 'night', 'evening',
        'weekend', 'friday', 'saturday', 'sunday', 'entertainment', 'venue', 'lounge', 'bar'
      ];
      const lowerTitle = (event.title || '').toLowerCase();
      const lowerDesc = (event.description || '').toLowerCase();

      const hasMusicPartyTerms = musicPartyTerms.some(term => lowerTitle.includes(term) || lowerDesc.includes(term));

      // Be more aggressive - if it's a concert or festival with any of these terms, it's likely a party
      if (hasMusicPartyTerms) {
        category = 'party';
        partySubcategory = partySubcategory || 'club';
        console.log(`[PARTY_DEBUG] PredictHQ music event categorized as party: ${event.title}`);
      }

      // For concerts and festivals, even without specific terms, there's a good chance it's party-like
      // This helps us catch more potential party events
      if (event.category === 'concerts' || event.category === 'festivals') {
        // Check if it has a high rank, which suggests it's a significant event
        if (event.rank && event.rank > 50) {
          category = 'party';
          partySubcategory = partySubcategory || 'general';
          console.log(`[PARTY_DEBUG] PredictHQ high-ranked music event categorized as party: ${event.title}`);
        }
      }
    }

    // Generate a unique ID
    const id = `predicthq-${event.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Get the description and ensure it's clean
    let description = '';

    // Safely get description
    if (event.description && typeof event.description === 'string') {
      description = event.description;
    } else {
      // Create a fallback description
      description = `${event.title || 'Event'} in ${location}`;
    }

    // Remove any mention of predicthq anywhere in the text
    if (description) {
      description = description.replace(/\bpredicthq\b.*?(?=[.!?]|$)/gi, '').trim();
      description = description.replace(/\bpredicthq\.com\b.*?(?=[.!?]|$)/gi, '').trim();

      // Clean up any double spaces or trailing punctuation
      description = description.replace(/\s{2,}/g, ' ').trim();
      description = description.replace(/[.,;:\s]+$/, '').trim();
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
      partySubcategory,
      image: imageUrl,
      coordinates,
      url: event.url,
      price: event.ticket_info?.price
    };
  } catch (error) {
    console.error('Error normalizing PredictHQ event:', error);
    console.error('Problem event:', JSON.stringify(event, null, 2).substring(0, 500) + '...');

    // Instead of throwing, return a minimal valid event
    return {
      id: `predicthq-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: 'predicthq',
      title: event?.title || 'Unknown Event',
      description: 'Error processing event details',
      date: new Date().toISOString().split('T')[0],
      time: '00:00',
      location: 'Location unavailable',
      category: 'other',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop'
    };
  }
}
