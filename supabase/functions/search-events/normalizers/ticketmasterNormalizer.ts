/**
 * Ticketmaster Event Normalizer
 * 
 * Normalizes Ticketmaster API event data to our standard Event format
 */

import { Event } from '../types.ts';

/**
 * Normalize a Ticketmaster event to our standard Event format
 */
export function normalizeTicketmasterEvent(event: any): Event {
  // Extract basic event information
  const id = event.id;
  const title = event.name;
  const url = event.url;
  
  // Extract dates
  const startDate = event.dates?.start?.localDate;
  const startTime = event.dates?.start?.localTime || '00:00';
  const endDate = event.dates?.end?.localDate || startDate;
  const endTime = event.dates?.end?.localTime || startTime;
  
  // Format ISO dates for start and end
  const start = startDate && startTime
    ? `${startDate}T${startTime}`
    : new Date().toISOString();
  
  const end = endDate && endTime
    ? `${endDate}T${endTime}`
    : start;
  
  // Extract venue information
  const venue = event._embedded?.venues?.[0];
  const venueName = venue?.name || 'Unknown Venue';
  const venueAddress = venue?.address?.line1;
  const venueCity = venue?.city?.name;
  const venueState = venue?.state?.name;
  const venueCountry = venue?.country?.name;
  const venuePostalCode = venue?.postalCode;
  
  // Extract coordinates if available
  let coordinates: [number, number] | undefined;
  
  if (venue?.location?.latitude && venue?.location?.longitude) {
    const lat = parseFloat(venue.location.latitude);
    const lng = parseFloat(venue.location.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates = [lat, lng];
    }
  }
  
  // Extract image URL (prefer larger images)
  let imageUrl;
  if (event.images && event.images.length > 0) {
    // Sort images by width (descending) and take the first one
    const sortedImages = [...event.images].sort((a, b) => (b.width || 0) - (a.width || 0));
    imageUrl = sortedImages[0].url;
  }
  
  // Extract price range
  let priceMin, priceMax, currency;
  if (event.priceRanges && event.priceRanges.length > 0) {
    const priceRange = event.priceRanges[0];
    priceMin = priceRange.min;
    priceMax = priceRange.max;
    currency = priceRange.currency;
  }
  
  // Extract category
  let category = 'other';
  let subcategories: string[] = [];
  
  if (event.classifications && event.classifications.length > 0) {
    const classification = event.classifications[0];
    
    // Map Ticketmaster segments to our categories
    const segmentName = classification.segment?.name;
    if (segmentName) {
      switch (segmentName.toLowerCase()) {
        case 'music':
          category = 'music';
          break;
        case 'sports':
          category = 'sports';
          break;
        case 'arts & theatre':
        case 'arts':
        case 'theatre':
          category = 'arts';
          break;
        case 'family':
        case 'family & education':
          category = 'family';
          break;
        case 'food':
        case 'food & drink':
          category = 'food';
          break;
        default:
          category = 'other';
      }
    }
    
    // Extract subcategories
    if (classification.genre?.name && classification.genre.name !== 'Undefined') {
      subcategories.push(classification.genre.name);
    }
    
    if (classification.subGenre?.name && classification.subGenre.name !== 'Undefined') {
      subcategories.push(classification.subGenre.name);
    }
  }
  
  // Extract description (use name if no description available)
  let description = event.description || event.info || title;
  
  // Create a formatted location string
  const locationParts = [];
  if (venueName) locationParts.push(venueName);
  if (venueCity) locationParts.push(venueCity);
  if (venueState) locationParts.push(venueState);
  
  const location = locationParts.join(', ');
  
  // Create the normalized event object
  const normalizedEvent: Event = {
    id: `ticketmaster:${id}`,
    source: 'ticketmaster',
    title,
    description,
    start,
    end,
    url,
    image: imageUrl,
    venue: {
      name: venueName,
      address: venueAddress,
      city: venueCity,
      state: venueState,
      country: venueCountry,
      postalCode: venuePostalCode,
      coordinates
    },
    category,
    subcategories,
    coordinates,
    priceMin,
    priceMax,
    currency,
    date: startDate,
    time: startTime,
    location
  };
  
  return normalizedEvent;
}
