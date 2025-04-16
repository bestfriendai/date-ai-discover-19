import type { Event } from '@/types';

export function normalizeTicketmasterEvent(event: any): Event {
  return {
    id: `ticketmaster-${event.id}`,
    source: 'ticketmaster',
    title: event.name,
    description: event.description || event.info || '',
    date: event.dates.start.localDate,
    time: event.dates.start.localTime,
    location: event._embedded?.venues?.[0]?.name || '',
    venue: event._embedded?.venues?.[0]?.name,
    category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
    image: event.images?.[0]?.url || '/placeholder.svg',
    coordinates: event._embedded?.venues?.[0]?.location ? [
      parseFloat(event._embedded?.venues?.[0]?.location?.longitude),
      parseFloat(event._embedded?.venues?.[0]?.location?.latitude)
    ] : undefined,
    url: event.url,
    price: event.priceRanges ? 
      `${event.priceRanges[0].min} - ${event.priceRanges[0].max} ${event.priceRanges[0].currency}` : 
      undefined
  };
}

export function normalizeSerpApiEvent(event: any): Event {
  // Extract coordinates (would need geocoding in real implementation)
  const coordinates = undefined;
  
  return {
    id: `serpapi-${btoa(event.title).slice(0, 10)}`,
    source: 'serpapi',
    title: event.title,
    description: event.description || '',
    date: event.date?.start_date || '',
    time: event.date?.when?.split(' ').pop() || '',
    location: event.address?.join(', ') || '',
    venue: event.venue?.name,
    category: 'event', // SerpAPI doesn't provide clear categories
    image: event.thumbnail || '/placeholder.svg',
    coordinates,
    url: event.link,
    price: event.ticket_info?.[0]?.price || undefined
  };
}

// Eventbrite category mapping helper
function mapEventbriteCategory(categoryId: string): string {
  const mapping: { [key: string]: string } = {
    '103': 'music',
    '101': 'business',
    '110': 'food',
    '105': 'arts',
    '104': 'film',
    '108': 'sports',
    '107': 'health',
    '102': 'science',
    '109': 'travel',
    '111': 'charity',
    '113': 'spirituality',
    '114': 'family',
    '115': 'holiday',
    '116': 'government',
    '112': 'fashion',
    '106': 'hobbies',
    '117': 'home',
    '118': 'auto',
    '119': 'school',
    '199': 'other',
  };
  return mapping[categoryId] || 'event';
}

export function normalizeEventbriteEvent(event: any): Event | null {
  try {
    // Validate required fields
    if (!event.id || !event.name?.text || !event.start?.local) {
      console.warn('Skipping invalid Eventbrite event:', event.id);
      return null;
    }

    // Coordinates
    let coordinates: [number, number] | undefined = undefined;
    if (event.venue?.longitude && event.venue?.latitude) {
      const lon = parseFloat(event.venue.longitude);
      const lat = parseFloat(event.venue.latitude);
      if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
        coordinates = [lon, lat];
      } else {
        console.warn(`Invalid coordinates for Eventbrite event ${event.id}:`, event.venue.longitude, event.venue.latitude);
      }
    }

    // Price
    let price: string | undefined = undefined;
    if (event.is_free) {
      price = 'Free';
    } else if (event.ticket_classes && Array.isArray(event.ticket_classes) && event.ticket_classes.length > 0) {
      const paid = event.ticket_classes.find((tc: any) => tc.free === false && tc.cost);
      if (paid && paid.cost) {
        price = `${paid.cost.display}`;
      }
    }

    // Image
    const image = event.logo?.original?.url || event.logo?.url || '/placeholder.svg';

    // Category
    const category = event.category_id ? mapEventbriteCategory(event.category_id) : 'event';

    // Date/time
    const [date, time] = event.start.local.split('T');

    return {
      id: `eventbrite-${event.id}`,
      source: 'eventbrite',
      title: event.name.text,
      description: event.description?.text || '',
      date: date,
      time: time?.substring(0, 5) || 'N/A',
      location: event.venue?.address?.localized_address_display || event.venue?.name || 'Online or TBD',
      venue: event.venue?.name,
      category,
      image,
      coordinates,
      url: event.url,
      price,
    };
  } catch (error) {
    console.error('Error normalizing Eventbrite event:', event.id, error);
    return null;
  }
}

