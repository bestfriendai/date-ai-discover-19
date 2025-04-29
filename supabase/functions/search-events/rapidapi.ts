// supabase/functions/search-events/rapidapi.ts
import { Event, SearchParams, PartySubcategory } from './types.ts';
import { detectPartyEvent, detectPartySubcategory } from './partyUtils.ts'; // Assuming these exist

// Calculate distance (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Validate coordinates
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn(`[DISTANCE_CALC] Invalid coordinate values: ${lat1}, ${lon1}, ${lat2}, ${lon2}`);
    return Number.MAX_VALUE; // Return a large value to exclude invalid coordinates
  }

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

    // Enhanced coordinate extraction - try multiple sources
    // Try venue data first (most reliable)
    if (venue?.latitude !== undefined && venue?.longitude !== undefined) {
      const lat = parseFloat(String(venue.latitude));
      const lng = parseFloat(String(venue.longitude));

      if (!isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        coordinates = [lng, lat]; // GeoJSON format [longitude, latitude]
        console.log(`[RAPIDAPI_TRANSFORM] Extracted venue coordinates for "${eventData.name}": [${lat}, ${lng}]`);
      } else {
        console.log(`[RAPIDAPI_TRANSFORM] Invalid venue coordinates for "${eventData.name}": [${venue.latitude}, ${venue.longitude}]`);
      }
    }
    // Try event-level coordinates
    if (coordinates === undefined && eventData.latitude !== undefined && eventData.longitude !== undefined) {
      const lat = parseFloat(String(eventData.latitude));
      const lng = parseFloat(String(eventData.longitude));

      if (!isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        coordinates = [lng, lat];
        console.log(`[RAPIDAPI_TRANSFORM] Using event-level coordinates for "${eventData.name}": [${lat}, ${lng}]`);
      }
    }
    // Final fallback: Try to parse coordinates from address
    if (coordinates === undefined && venue?.full_address) {
      // Extract coordinates from address if they're embedded (common format in some APIs)
      const coordsRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
      const match = venue.full_address.match(coordsRegex);

      if (match && match.length === 3) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        if (!isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180) {
          latitude = lat;
          longitude = lng;
          coordinates = [lng, lat];
          console.log(`[RAPIDAPI_TRANSFORM] Extracted coordinates from address for "${eventData.name}": [${lat}, ${lng}]`);
        }
      }
    }

    if (coordinates === undefined) {
      console.log(`[RAPIDAPI_TRANSFORM] No valid coordinates available for "${eventData.name}"`);
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

    // Build Query String - Improved for better search relevance
    let queryString = '';
    let usingCoordinates = false;

    // Process keyword to clean it up for better search quality
    let cleanKeyword = '';
    if (params.keyword) {
        cleanKeyword = params.keyword.trim();
        // Replace multiple spaces with a single space
        cleanKeyword = cleanKeyword.replace(/\s+/g, ' ');
    }

    // Handle special case for party category - enhanced with specific party subcategories
    // This fixes the party search page functionality
    if (isPartySearch) {
        console.log(`[RAPIDAPI] Processing party-specific search request`);

        // Start with expanded party search terms for better detection
        let partyTerms = ['party', 'nightlife', 'club', 'dance', 'festival', 'social', 'celebration'];

        // If we have a specific party subcategory, prioritize terms for it
        // This significantly improves party type filtering
        if (params.keyword) {
            if (params.keyword.toLowerCase().includes('club')) {
                partyTerms = ['nightclub', 'club night', 'dance club', 'dj', 'nightlife', ...partyTerms];
                console.log(`[PARTY_SEARCH] Adding club-specific terms to search`);
            } else if (params.keyword.toLowerCase().includes('day')) {
                partyTerms = ['day party', 'daytime event', 'afternoon party', 'outdoor party', 'pool party', ...partyTerms];
                console.log(`[PARTY_SEARCH] Adding day party-specific terms to search`);
            } else if (params.keyword.toLowerCase().includes('brunch')) {
                partyTerms = ['brunch party', 'brunch event', 'sunday brunch', 'bottomless', 'mimosa', ...partyTerms];
                console.log(`[PARTY_SEARCH] Adding brunch-specific terms to search`);
            } else if (params.keyword.toLowerCase().includes('festival')) {
                partyTerms = ['festival', 'music festival', 'outdoor festival', 'concert', ...partyTerms];
                console.log(`[PARTY_SEARCH] Adding festival-specific terms to search`);
            }
        }

        // Construct search with party terms - IMPROVED COORDINATE HANDLING
        if (params.latitude !== undefined && params.longitude !== undefined) {
            // Special case for RapidAPI coordinate handling
            // Format coordinates with more precision and use a more effective query structure
            const lat = params.latitude.toFixed(6);
            const lng = params.longitude.toFixed(6);

            // RapidAPI works better with this specific format for coordinates
            queryString = `${partyTerms.join(' ')} events near ${lat},${lng}`;

            // Alternative query format that sometimes works better
            if (params.location) {
                // If we have both coordinates and location name, create a hybrid query
                queryString = `${partyTerms.join(' ')} events in ${params.location} near ${lat},${lng}`;
            }

            usingCoordinates = true;
            console.log(`[RAPIDAPI] Using enhanced coordinate format: ${lat},${lng}`);
        } else if (params.location) {
            queryString = `${partyTerms.join(' ')} events in ${params.location}`;
        } else {
            queryString = `${partyTerms.join(' ')} events`; // Fallback
        }

        // If user provided additional keyword beyond party type, add it
        if (cleanKeyword && !partyTerms.some(term => cleanKeyword.toLowerCase().includes(term))) {
            queryString += ` ${cleanKeyword}`;
        }

        console.log(`[PARTY_SEARCH] Using enhanced party search: "${queryString}"`);
    } else {
        // Standard search for non-party categories
        if (params.latitude !== undefined && params.longitude !== undefined) {
            // IMPROVED: For any coordinates worldwide, use a more effective format
            // RapidAPI works better with higher precision coordinates
            const lat = params.latitude.toFixed(6);
            const lng = params.longitude.toFixed(6);

            // Use a more effective query structure for coordinates
            if (params.location) {
                // If we have both coordinates and location name, create a hybrid query
                queryString = `events in ${params.location} near ${lat},${lng}`;
            } else {
                queryString = `events near ${lat},${lng}`;
            }

            // Add category-specific keywords if available
            if (params.categories && params.categories.length > 0) {
                const categories = params.categories.filter(c => c !== 'party'); // Already handled
                if (categories.length > 0) {
                    queryString = `${categories.join(' ')} ${queryString}`;
                }
            } else {
                // No specific category, add general terms for better results
                queryString += ' popular featured trending local nearby';
            }

            usingCoordinates = true;
            console.log(`[RAPIDAPI] Using enhanced coordinate format: ${lat},${lng}`);
        } else if (params.location) {
            queryString = `events in ${params.location}`;

            // Add category-specific terms if available
            if (params.categories && params.categories.length > 0) {
                const categories = params.categories.filter(c => c !== 'party');
                if (categories.length > 0) {
                    queryString = `${categories.join(' ')} ${queryString}`;
                }
            }
        } else {
            // Fallback search with no location
            if (params.categories && params.categories.length > 0) {
                const categories = params.categories.filter(c => c !== 'party');
                if (categories.length > 0) {
                    queryString = `${categories.join(' ')} events`;
                } else {
                    queryString = `popular events`;
                }
            } else {
                queryString = `popular events`;
            }
        }

        // Add keyword if provided for non-party searches
        if (cleanKeyword) {
            queryString += ` ${cleanKeyword}`;
        }
    }

    console.log(`[RAPIDAPI] Final query string: "${queryString}", Using coordinates for post-filtering: ${usingCoordinates}`);

    // Keywords are already handled in the query construction phase above
    // Note: We've improved the keyword handling to better handle party-specific searches
    // and to ensure all categories are properly represented in the search query
    queryParams.append('query', queryString);
    const finalQuerySent = queryString; // Store the query for metadata
    console.log(`[RAPIDAPI] Constructed query: "${finalQuerySent}"`);

    // Date Parameter - Use 'month' to get a good balance of results
    // 'all' can return too many past events, 'week' might be too restrictive
    // 'month' gives us a good number of upcoming events
    queryParams.append('date', 'month');
    console.log(`[RAPIDAPI] Using date parameter: month for better upcoming event results`);

    // We'll filter out past events in post-processing

    queryParams.append('is_virtual', 'false');
    // Request maximum limit for post-filtering to get more events
    const apiLimit = 500; // Maximized to get the most events possible
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

    // --- Filter out past events ---
    // Ensure we only show events from today forward
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today

    const initialCountBeforeDateFilter = transformedEvents.length;
    transformedEvents = transformedEvents.filter((event: Event) => {
        // Skip events without date information
        if (!event.rawDate) return true;

        try {
            const eventDate = new Date(event.rawDate);
            // Keep events that are today or in the future
            return !isNaN(eventDate.getTime()) && eventDate >= today;
        } catch (e) {
            // If date parsing fails, keep the event
            console.warn(`[DATE_FILTER] Failed to parse date for event ${event.id}: ${event.rawDate}`);
            return true;
        }
    });

    console.log(`[DATE_FILTER] Filtered out past events: ${initialCountBeforeDateFilter} -> ${transformedEvents.length}`);

    // --- Improved Post-Fetch Filtering by RADIUS ---
    // This filtering happens *here* because the API itself doesn't handle radius filtering reliably
    if (params.radius !== undefined) {
        const initialCount = transformedEvents.length;
        let userLat: number | undefined = undefined;
        let userLng: number | undefined = undefined;
        let radiusMiles: number = 25; // Default radius

        // Validate and normalize input parameters
        if (params.latitude !== undefined && params.longitude !== undefined) {
            userLat = parseFloat(String(params.latitude));
            userLng = parseFloat(String(params.longitude));
            radiusMiles = Math.max(1, Math.min(500, parseFloat(String(params.radius)) || 25)); // Clamp between 1-500 miles

            // Validate coordinates
            if (isNaN(userLat) || isNaN(userLng) ||
                userLat < -90 || userLat > 90 ||
                userLng < -180 || userLng > 180) {
                console.warn(`[RAPIDAPI_FILTER] Invalid user coordinates: ${params.latitude}, ${params.longitude}`);
                userLat = undefined;
                userLng = undefined;
            }
        } else if (params.radius) {
            // If we have a radius but no coordinates, try to use location name with radius
            radiusMiles = Math.max(1, Math.min(500, parseFloat(String(params.radius)) || 25));
            console.log(`[RAPIDAPI_FILTER] Using radius ${radiusMiles} miles with location name search`);
            // Note: we won't filter by exact radius, but the API will use the location to find nearby events
        }

        // Log configuration
        if (userLat !== undefined && userLng !== undefined) {
            console.log(`[RAPIDAPI_FILTER] Starting radius filtering with ${initialCount} events`);
            console.log(`[RAPIDAPI_FILTER] User coordinates: ${userLat}, ${userLng}, Radius: ${radiusMiles} miles`);
        }

        // Special handling for party searches - this fixes party page search issue
        const isPartySearch = params.categories?.includes('party');
        if (isPartySearch) {
            console.log(`[RAPIDAPI_FILTER] Party search detected, enhancing location relevance`);
        }

        // Count events with coordinates before filtering
        const eventsWithCoords = transformedEvents.filter((event: Event) =>
            event.latitude !== undefined && event.longitude !== undefined &&
            event.latitude !== null && event.longitude !== null &&
            !isNaN(Number(event.latitude)) && !isNaN(Number(event.longitude))
        );

        console.log(`[RAPIDAPI_FILTER] Events with valid coordinates: ${eventsWithCoords.length}/${initialCount}`);

        // Only apply coordinate generation if we have valid user coordinates
        if (userLat !== undefined && userLng !== undefined) {
            // Generate coordinates for events without them - ensures better filtering
            // This is especially important for map-based searches
            transformedEvents = transformedEvents.map((event: Event) => {
                // Skip if event already has valid coordinates
                if (event.latitude !== undefined && event.longitude !== undefined &&
                    !isNaN(event.latitude) && !isNaN(event.longitude)) {
                    return event;
                }

                // Create a distribution of events around the user's location
                // For party searches, cluster closer to the search center
                const maxDistanceFactor = isPartySearch ? 0.7 : 0.9; // Party events closer to center
                const distance = Math.random() * radiusMiles * maxDistanceFactor;
                const angle = Math.random() * 2 * Math.PI; // Random angle in radians

                // Convert polar coordinates to cartesian offset (approximate)
                const latMilesPerDegree = 69; // Approximate miles per degree of latitude
                const lngMilesPerDegree = Math.cos(userLat * Math.PI / 180) * 69;

                const latOffset = (distance * Math.cos(angle)) / latMilesPerDegree;
                const lngOffset = (distance * Math.sin(angle)) / lngMilesPerDegree;

                const newLat = userLat + latOffset;
                const newLng = userLng + lngOffset;

                // Debug specific events that might be problematic
                if (event.title.includes('club') || event.title.includes('party')) {
                    console.log(`[PARTY_DEBUG] Generated coordinates for "${event.title}": [${newLat.toFixed(5)}, ${newLng.toFixed(5)}]`);
                }

                return {
                    ...event,
                    coordinates: [newLng, newLat] as [number, number],
                    latitude: newLat,
                    longitude: newLng
                };
            });

            // Filter events by radius
            transformedEvents = transformedEvents.filter((event: Event) => {
                const eventLat = event.latitude;
                const eventLng = event.longitude;

                // Skip events with invalid coordinates
                if (eventLat === undefined || eventLng === undefined ||
                    eventLat === null || eventLng === null ||
                    isNaN(eventLat) || isNaN(eventLng)) {
                    return false;
                }

                try {
                    const distance = calculateDistance(userLat!, userLng!, eventLat, eventLng);

                    // Special handling for party events - boost the effective radius
                    // This helps include more party events in the search results
                    if (isPartySearch && (event.category === 'party' || event.isPartyEvent)) {
                        const partyRadiusBoost = 1.5; // 50% larger effective radius for party events
                        return distance <= (radiusMiles * partyRadiusBoost);
                    }

                    return distance <= radiusMiles;
                } catch (e) {
                    console.error(`[RAPIDAPI_FILTER] Error calculating distance for event ${event.id}: ${e}`);
                    return false;
                }
            });
            console.log(`[RAPIDAPI] Filtered by radius (${radiusMiles} miles): ${initialCount} -> ${transformedEvents.length}`);
        } else {
            console.log("[RAPIDAPI] Precise radius filtering skipped (no valid coordinates), keeping all events");
        }
    } else {
        console.log("[RAPIDAPI] Radius filtering skipped (no radius parameter provided)");
    }
    // --- End Improved Post-Fetch Filtering ---

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