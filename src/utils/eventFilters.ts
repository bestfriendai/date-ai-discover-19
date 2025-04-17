import { Event, EventFilters } from '@/types';
import { formatISO, isWithinInterval, parseISO } from 'date-fns';

/**
 * Extract numeric price from event price field
 */
export function extractEventPrice(price: string | number | undefined): number {
  if (price === undefined || price === null) return 0;

  // Handle numeric prices
  if (typeof price === 'number') {
    return price;
  }

  // Handle string prices (parse out the number)
  if (typeof price === 'string') {
    // Handle 'free' or 'Free' text
    if (price.toLowerCase().includes('free')) return 0;

    // Extract first number found in the string
    const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
    return !isNaN(priceNum) ? priceNum : 0;
  }

  return 0;
}

/**
 * Utility function to filter events based on price range
 */
export function filterEventsByPrice(events: Event[], minPrice: number, maxPrice: number): Event[] {
  console.log(`[FILTER] Filtering events by price range: $${minPrice} - $${maxPrice}`);
  const beforeCount = events.length;

  const filtered = events.filter(ev => {
    // Skip events without price information
    if (!ev.price) return true;

    const priceNum = extractEventPrice(ev.price);
    return priceNum >= minPrice && priceNum <= maxPrice;
  });

  console.log(`[FILTER] Price filter removed ${beforeCount - filtered.length} events`);
  return filtered;
}

/**
 * Utility function to filter events based on date range
 */
export function filterEventsByDate(events: Event[], fromDate: Date, toDate: Date): Event[] {
  console.log(`[FILTER] Filtering events by date range: ${formatISO(fromDate)} - ${formatISO(toDate)}`);
  const beforeCount = events.length;

  const filtered = events.filter(ev => {
    if (!ev.date) return true;

    try {
      const eventDate = parseISO(ev.date);
      return isWithinInterval(eventDate, { start: fromDate, end: toDate });
    } catch (e) {
      console.warn(`[FILTER] Could not parse date for event ${ev.id}: ${ev.date}`);
      return true; // Include events with unparseable dates
    }
  });

  console.log(`[FILTER] Date filter removed ${beforeCount - filtered.length} events`);
  return filtered;
}

/**
 * Utility function to filter events based on categories
 */
export function filterEventsByCategories(events: Event[], categories: string[]): Event[] {
  if (!categories || categories.length === 0) return events;

  console.log(`[FILTER] Filtering events by categories: ${categories.join(', ')}`);
  const beforeCount = events.length;

  const filtered = events.filter(ev =>
    categories.some(cat => ev.category?.toLowerCase() === cat.toLowerCase())
  );

  console.log(`[FILTER] Category filter removed ${beforeCount - filtered.length} events`);
  return filtered;
}

/**
 * Utility function to filter events based on keyword
 */
export function filterEventsByKeyword(events: Event[], keyword: string): Event[] {
  if (!keyword || keyword.trim() === '') return events;

  console.log(`[FILTER] Filtering events by keyword: ${keyword}`);
  const beforeCount = events.length;
  const searchTerms = keyword.toLowerCase().split(' ').filter(term => term.length > 0);

  const filtered = events.filter(ev => {
    const title = ev.title?.toLowerCase() || '';
    const description = ev.description?.toLowerCase() || '';
    const venue = ev.venue?.toLowerCase() || '';
    const location = ev.location?.toLowerCase() || '';

    // Check if any search term is found in any of the fields
    return searchTerms.some(term =>
      title.includes(term) ||
      description.includes(term) ||
      venue.includes(term) ||
      location.includes(term)
    );
  });

  console.log(`[FILTER] Keyword filter removed ${beforeCount - filtered.length} events`);
  return filtered;
}

/**
 * Main utility function to apply all filters to events
 */
export function applyFilters(events: Event[], filters: EventFilters): Event[] {
  console.log(`[FILTER] Applying filters to ${events.length} events:`, filters);
  let filteredEvents = [...events];

  // Apply price filter
  if (filters.priceRange) {
    const [minPrice, maxPrice] = filters.priceRange;
    filteredEvents = filterEventsByPrice(filteredEvents, minPrice, maxPrice);
  }

  // Apply date filter
  if (filters.dateRange?.from && filters.dateRange?.to) {
    filteredEvents = filterEventsByDate(
      filteredEvents,
      filters.dateRange.from,
      filters.dateRange.to
    );
  }

  // Apply category filter
  if (filters.categories && filters.categories.length > 0) {
    filteredEvents = filterEventsByCategories(filteredEvents, filters.categories);
  }

  // Apply keyword filter (if implemented in the filters)
  if ((filters as any).keyword) {
    filteredEvents = filterEventsByKeyword(filteredEvents, (filters as any).keyword);
  }

  console.log(`[FILTER] After all filters: ${filteredEvents.length} events remaining`);
  return filteredEvents;
}

/**
 * Apply sorting to events based on the specified sort option
 */
export function sortEvents(
  events: Event[],
  sortBy: 'date' | 'distance' | 'price' = 'date',
  latitude?: number,
  longitude?: number
): Event[] {
  console.log(`[SORT] Sorting ${events.length} events by ${sortBy}`);

  switch (sortBy) {
    case 'date':
      return sortEventsByDate(events);
    case 'distance':
      if (!latitude || !longitude) {
        console.warn('[SORT] Cannot sort by distance without coordinates, falling back to date sort');
        return sortEventsByDate(events);
      }
      return sortEventsByDistance(events, latitude, longitude);
    case 'price':
      return sortEventsByPrice(events);
    default:
      return sortEventsByDate(events);
  }
}

/**
 * Sort events by date (soonest first)
 */
export function sortEventsByDate(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    // Parse dates with fallbacks
    const dateA = a.date ? new Date(a.date) : new Date();
    const dateB = b.date ? new Date(b.date) : new Date();

    // Sort by date (ascending)
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Sort events by distance from a point
 */
export function sortEventsByDistance(
  events: Event[],
  latitude: number,
  longitude: number
): Event[] {
  return [...events].sort((a, b) => {
    // Skip events without coordinates
    if (!a.coordinates || a.coordinates.length !== 2) return 1;
    if (!b.coordinates || b.coordinates.length !== 2) return -1;

    // Calculate distances
    const distA = calculateDistance(
      latitude,
      longitude,
      a.coordinates[1],
      a.coordinates[0]
    );

    const distB = calculateDistance(
      latitude,
      longitude,
      b.coordinates[1],
      b.coordinates[0]
    );

    // Sort by distance (ascending)
    return distA - distB;
  });
}

/**
 * Sort events by price (lowest first)
 */
export function sortEventsByPrice(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const priceA = extractEventPrice(a.price);
    const priceB = extractEventPrice(b.price);
    return priceA - priceB;
  });
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}
