import type { Event } from '@/types';
// Partial type for Ticketmaster API event (expand as needed)
interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  info?: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      location?: {
        longitude?: string;
        latitude?: string;
      };
    }>;
  };
  classifications?: Array<{
    segment?: {
      name?: string;
    };
  }>;
  images?: Array<{ url?: string }>;
  url?: string;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
}
// Partial type for SerpApi event (expand as needed)
interface SerpApiEvent {
  title: string;
  description?: string;
  date?: {
    start_date?: string;
    when?: string;
  };
  address?: string[];
  venue?: {
    name?: string;
  };
  thumbnail?: string;
  link?: string;
  ticket_info?: Array<{ price?: string }>;
}

// Partial type for Eventbrite event (expand as needed)
interface EventbriteEvent {
  id: string;
  name?: { text?: string };
  description?: { text?: string };
  start?: { local?: string };
  end?: { local?: string };
  url?: string;
  logo?: { url?: string };
  venue?: { name?: string; address?: { localized_address_display?: string } };
  category_id?: string;
  is_free?: boolean;
  ticket_availability?: { minimum_ticket_price?: { major_value?: string; currency?: string } };
}



export function normalizeTicketmasterEvent(event: any): Event {
  return {
    id: `ticketmaster-${event.id}`,
    source: 'ticketmaster',
    title: event.name,
// Partial type for Eventbrite event (expand as needed)

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
    '117': 'home',
    '118': 'auto',
    '119': 'school',
    '199': 'other'
  };
  return mapping[categoryId] || 'event';
}
export function normalizeEventbriteEvent(event: EventbriteEvent): Event | null {

  try {
    // Validate required fields
    if (!event.id || !event.name?.text || !event.start?.local) {
      console.warn('Skipping invalid Eventbrite event:', event.id);
      return null;
    }

    // Coordinates
    // Coordinates extraction skipped: EventbriteEvent.venue does not have longitude/latitude by default.
    // If you add geocoding or extend the type, restore this logic.
    const coordinates: [number, number] | undefined = undefined;

    // Price
    let price: string | undefined = undefined;
    if (event.is_free) {
      price = 'Free';
    } else if (event.ticket_availability?.minimum_ticket_price) {
      price = `${event.ticket_availability.minimum_ticket_price.major_value} ${event.ticket_availability.minimum_ticket_price.currency}`;
    }

    // Image
    const image = event.logo?.url || '/placeholder.svg';

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

