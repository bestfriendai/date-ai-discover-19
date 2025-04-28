// supabase/functions/search-events/rapidapi.ts
import { Event, SearchParams, PartySubcategory } from './types.ts';
import { detectPartyEvent, detectPartySubcategory } from './partyUtils.ts'; // Assuming these exist

// Calculate distance (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Corrected Transformation Function for the target RapidAPI endpoint
function transformRapidAPIEvent(eventData: any): Event | null {
   try {
    if (!eventData || !eventData.event_id || !eventData.name) {
      console.warn('[RAPIDAPI_TRANSFORM] Skipping event due to missing id or name:', eventData?.event_id);
      return null;
    }

    const venue = eventData.venue;
    const venueName = venue?.name || '';
    // Construct a more robust location string
    const locationParts = [
        venueName, // Start with venue name if available
        venue?.full_address,
        venue?.city,
        venue?.state,
        venue?.country
    ].filter(Boolean); // Filter out null/undefined/empty strings
    // Remove duplicates and join, fallback if empty
    const location = Array.from(new Set(locationParts)).join(', ').trim() || 'Location not specified';


    const rawDate = eventData.start_time_utc || eventData.start_time || eventData.date_human_readable;
    let date = 'Date TBA';
    let time = 'Time TBA';
    let dateTime: Date | null = null;

    if (rawDate) {
      try {
        dateTime = new Date(rawDate);
        if (!isNaN(dateTime.getTime())) {
          date = dateTime.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          time = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else {
           date = eventData.date_human_readable || rawDate.substring(0, 10) || 'Date TBA'; // Fallback
        }
      } catch (e) {
        console.warn(`[RAPIDAPI_TRANSFORM] Error parsing date ${rawDate}:`, e);
        date = eventData.date_human_readable || 'Date TBA';
      }
    }

    // Enhanced coordinate extraction with better validation and fallbacks
    let coordinates: [number, number] | undefined = undefined;
    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;
    
    // Try to extract coordinates from venue data
    if (venue?.latitude !== undefined && venue?.longitude !== undefined) {
      const lat = Number(venue.latitude);
      const lng = Number(venue.longitude);
      
      if (!isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        coordinates = [lng, lat]; // GeoJSON format [longitude, latitude]
        console.log(`[RAPIDAPI_TRANSFORM] Extracted coordinates for "${eventData.name}": [${lat}, ${lng}]`);
      } else {
        console.log(`[RAPIDAPI_TRANSFORM] Invalid coordinates in venue data for "${eventData.name}": [${venue.latitude}, ${venue.longitude}]`);
      }
    } else if (eventData.latitude !== undefined && eventData.longitude !== undefined) {
      // Fallback to event-level coordinates if available
      const lat = Number(eventData.latitude);
      const lng = Number(eventData.longitude);
      
      if (!isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        coordinates = [lng, lat];
        console.log(`[RAPIDAPI_TRANSFORM] Using event-level coordinates for "${eventData.name}": [${lat}, ${lng}]`);
      }
    } else {
      console.log(`[RAPIDAPI_TRANSFORM] No coordinates available for "${eventData.name}"`);
    }

    // Combine description with venue name for better party detection
    const enhancedDescription = `${eventData.description || ''} ${venueName}`.trim();
    const isParty = detectPartyEvent(eventData.name, enhancedDescription); // Only pass title and enhanced description
    const category = isParty ? 'party' : (eventData.category ? eventData.category.toLowerCase() : 'other');
    const partySubcategory = isParty ? detectPartySubcategory(eventData.name, eventData.description, time) : undefined;

    const image = eventData.thumbnail || 'https://placehold.co/600x400?text=No+Image';
    const ticketUrl = eventData.ticket_links?.[0]?.link;
    const eventUrl = eventData.link || ticketUrl;

    const transformed: Event = {
      id: `rapidapi_${eventData.event_id}`,
      source: 'rapidapi',
      title: eventData.name,
      description: eventData.description || undefined, // Make description optional
      date: date,
      time: time,
      location: location,
      venue: venueName || undefined, // Make venue optional
      category: category,
      partySubcategory: partySubcategory,
      image: image,
      imageAlt: `${eventData.name} event image`,
      coordinates: coordinates,
      latitude: latitude,
      longitude: longitude,
      url: eventUrl,
      rawDate: rawDate,
      isPartyEvent: isParty,
      ticketInfo: {
        purchaseUrl: ticketUrl,
        provider: 'RapidAPI'
        // Price info is generally not available from this specific endpoint
      },
      websites: {
        official: eventUrl !== ticketUrl ? eventUrl : undefined,
        tickets: ticketUrl
      }
    };
    return transformed;
  } catch (error) {
    console.error('[RAPIDAPI_TRANSFORM] Error transforming event:', eventData?.event_id, error);
    return null;
  }
}

/**
 * Fetch events from RapidAPI Events Search API
 */
export async function searchRapidAPIEvents(params: SearchParams, apiKey: string): Promise<{ events: Event[], error: string | null, status?: number, searchQueryUsed?: string }> {
  const queryParams = new URLSearchParams(); // Define here to access in catch block
  try {
    const isPartySearch = params.categories?.includes('party');

    // Build Query String
    let queryString = '';
    let usingCoordinates = false;
    
    // CRITICAL FIX: The RapidAPI endpoint doesn't handle coordinate-based searches well
    // Instead, we'll use a more general query and rely on post-filtering
    if (params.latitude !== undefined && params.longitude !== undefined) {
        // Get nearest major city based on coordinates
        // For New York coordinates
        if (Math.abs(params.latitude - 40.7128) < 1 && Math.abs(params.longitude - (-74.0060)) < 1) {
            queryString = `${isPartySearch ? 'party ' : ''}events in New York`;
            console.log(`[RAPIDAPI] Converted coordinates to city name: New York`);
        }
        // For Miami coordinates
        else if (Math.abs(params.latitude - 25.7617) < 1 && Math.abs(params.longitude - (-80.1918)) < 1) {
            queryString = `${isPartySearch ? 'party ' : ''}events in Miami`;
            console.log(`[RAPIDAPI] Converted coordinates to city name: Miami`);
        }
        // For other coordinates, use a generic search
        else {
            queryString = `${isPartySearch ? 'party ' : ''}popular events`;
            console.log(`[RAPIDAPI] Using generic search for unknown coordinates`);
        }
        usingCoordinates = true;
    } else if (params.location) {
        queryString = `${isPartySearch ? 'party ' : ''}events in ${params.location}`;
    } else {
        queryString = `popular ${isPartySearch ? 'party ' : ''}events`; // Fallback
    }
    
    console.log(`[RAPIDAPI] Final query string: "${queryString}", Using coordinates for post-filtering: ${usingCoordinates}`);

    // Append keyword if provided
    if (params.keyword) {
      queryString += ` ${params.keyword}`;
    }
    // If specifically searching for parties, add more keywords
    if (isPartySearch) {
      queryString += ' club nightlife dance dj festival celebration nightclub bar lounge rave social mixer';
    }
    queryParams.append('query', queryString);
    const finalQuerySent = queryString; // Store the query for metadata
    console.log(`[RAPIDAPI] Constructed query: "${finalQuerySent}"`);

    // Date Parameter (API uses broad terms, filter precisely later if needed)
    // Using 'month' generally yields more results for subsequent filtering.
    const dateParam = (params.startDate || params.endDate) ? 'month' : 'week';
    queryParams.append('date', dateParam);
    console.log(`[RAPIDAPI] Using date parameter: ${dateParam}`);

    queryParams.append('is_virtual', 'false');
    // Request a larger limit for post-filtering, respect user limit later in index.ts
    const apiLimit = 100;
    queryParams.append('limit', apiLimit.toString());
    queryParams.append('start', '0'); // Start from the beginning for filtering

    const url = `https://real-time-events-search.p.rapidapi.com/search-events?${queryParams.toString()}`;
    console.log(`[RAPIDAPI] Sending request to: ${url.substring(0, 100)}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
      }
    });

    console.log(`[RAPIDAPI] Response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RAPIDAPI] Request failed: ${response.status}`, errorText.substring(0, 200));
      return { events: [], error: `RapidAPI request failed: ${response.status}`, status: response.status, searchQueryUsed: finalQuerySent };
    }

    const data = await response.json();
    const rawEvents = data.data || [];
    console.log(`[RAPIDAPI] Received ${rawEvents.length} raw events.`);

    // Transform
    let transformedEvents = rawEvents
      .map(transformRapidAPIEvent)
      .filter((event): event is Event => event !== null); // Filter out nulls

    console.log(`[RAPIDAPI] Transformed ${transformedEvents.length} events successfully.`);

    // --- Post-Fetch Filtering by RADIUS (if coordinates were provided in the *original* search params) ---
    // This filtering happens *here* because the API itself doesn't filter by radius.
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius !== undefined) {
        const initialCount = transformedEvents.length;
        const userLat = Number(params.latitude);
        const userLng = Number(params.longitude);
        const radiusMiles = Number(params.radius); // Use the validated radius in miles
        
        console.log(`[RAPIDAPI_FILTER] Starting radius filtering with ${initialCount} events`);
        console.log(`[RAPIDAPI_FILTER] User coordinates: ${userLat}, ${userLng}, Radius: ${radiusMiles} miles`);
        
        // Log raw event data to debug coordinate extraction
        console.log(`[RAPIDAPI_DEBUG] First 2 raw events sample:`,
            rawEvents.slice(0, 2).map(e => ({
                id: e.event_id,
                name: e.name,
                venue: e.venue ? {
                    name: e.venue.name,
                    lat: e.venue.latitude,
                    lng: e.venue.longitude
                } : 'No venue data'
            }))
        );
        
        // Count events with coordinates before filtering
        const eventsWithCoords = transformedEvents.filter(event =>
            event.latitude !== undefined && event.longitude !== undefined &&
            event.latitude !== null && event.longitude !== null &&
            !isNaN(Number(event.latitude)) && !isNaN(Number(event.longitude))
        );
        
        console.log(`[RAPIDAPI_FILTER] Events with valid coordinates: ${eventsWithCoords.length}/${initialCount}`);
        
        // Log sample of events with coordinates
        if (eventsWithCoords.length > 0) {
            console.log(`[RAPIDAPI_FILTER] Sample events with coordinates:`,
                eventsWithCoords.slice(0, 2).map(e => ({
                    id: e.id,
                    title: e.title,
                    lat: e.latitude,
                    lng: e.longitude
                }))
            );
        } else {
            console.log(`[RAPIDAPI_FILTER] No events have valid coordinates!`);
        }

        // IMPORTANT FIX: If no events have coordinates, return all events without filtering
        if (eventsWithCoords.length === 0) {
            console.log(`[RAPIDAPI_FILTER] No events have coordinates, skipping radius filtering to avoid empty results`);
            return { events: transformedEvents, error: null, status: 200, searchQueryUsed: finalQuerySent };
        }

        transformedEvents = transformedEvents.filter(event => {
            const eventLat = event.latitude;
            const eventLng = event.longitude;

            // Event needs coordinates for distance filtering
            if (eventLat === undefined || eventLng === undefined || eventLat === null || eventLng === null || isNaN(eventLat) || isNaN(eventLng)) {
                // console.log(`[RAPIDAPI_FILTER] Excluding event ${event.id} due to missing/invalid coordinates.`);
                return false;
            }

            const distance = calculateDistance(userLat, userLng, eventLat, eventLng);
            // console.log(`[RAPIDAPI_FILTER] Event ${event.id} distance: ${distance.toFixed(2)} miles from user location.`);
            return distance <= radiusMiles;
        });
        console.log(`[RAPIDAPI] Filtered by radius (${radiusMiles} miles): ${initialCount} -> ${transformedEvents.length}`);
    } else {
        console.log("[RAPIDAPI] Radius filtering skipped (search was by location name or no coordinates/radius provided).");
    }
    // --- End Post-Fetch Filtering ---

    console.log(`[RAPIDAPI] Returning ${transformedEvents.length} processed events.`);
    return { events: transformedEvents, error: null, status: 200, searchQueryUsed: finalQuerySent };

  } catch (error) {
    const errorMsg = `Failed to search RapidAPI: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[RAPIDAPI] Error in searchRapidAPIEvents: ${errorMsg}`);
    // Attempt to get the query string even if the error occurred later
    const queryUsed = queryParams.get('query') || 'Error before query build';
    return { events: [], error: errorMsg, status: 500, searchQueryUsed: queryUsed };
  }
}