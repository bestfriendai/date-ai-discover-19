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
  venue?: {
    name?: string;
    address?: { localized_address_display?: string };
    longitude?: string;
    latitude?: string;
  };
  category_id?: string;
  is_free?: boolean;
  ticket_availability?: { minimum_ticket_price?: { major_value?: string; currency?: string } };
}

// Helper to safely parse coordinates
function safeParseCoordinates(longitude?: string, latitude?: string): [number, number] | undefined {
  if (!longitude || !latitude) return undefined;

  try {
    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat)) return undefined;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return undefined;

    return [lon, lat];
  } catch (e) {
    console.warn("Error parsing coordinates:", e);
    return undefined;
  }
}

export function normalizeTicketmasterEvent(event: TicketmasterEvent): Event {
  const venue = event._embedded?.venues?.[0];
  const coordinates = safeParseCoordinates(
    venue?.location?.longitude,
    venue?.location?.latitude
  );

  // Determine category, with special handling for party events
  let category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 'event';
  let partySubcategory: PartySubcategory | undefined = undefined;

  if (detectPartyEvent(event.name, event.description || event.info)) {
    category = 'party';
    // Determine party subcategory
    partySubcategory = detectPartySubcategory(event.name, event.description || event.info || '', event.dates.start.localTime || '');
  }

  return {
    id: `ticketmaster-${event.id}`,
    source: 'ticketmaster',
    title: event.name,
    description: event.description || event.info || '',
    date: event.dates.start.localDate,
    time: event.dates.start.localTime || '',
    location: venue?.name || '',
    venue: venue?.name,
    category,
    partySubcategory,
    image: event.images?.[0]?.url || '/placeholder.svg',
    coordinates,
    url: event.url,
    price: event.priceRanges ?
      `${event.priceRanges[0].min} - ${event.priceRanges[0].max} ${event.priceRanges[0].currency}` :
      undefined
  };
}

export function normalizeSerpApiEvent(event: SerpApiEvent): Event {
  // SerpAPI doesn't provide coordinates
  const coordinates = undefined;

  // Generate a stable ID based on the title
  const id = event.title ?
    `serpapi-${btoa(event.title).slice(0, 10)}` :
    `serpapi-${Date.now()}`;

  // Determine if this is a party event
  let category = 'event';
  let partySubcategory: PartySubcategory | undefined = undefined;

  if (detectPartyEvent(event.title, event.description)) {
    category = 'party';
    // Extract time from the event data
    const time = event.date?.when?.split(' ').pop() || '';
    // Determine party subcategory
    partySubcategory = detectPartySubcategory(event.title, event.description || '', time);
  }

  return {
    id,
    source: 'serpapi',
    title: event.title,
    description: event.description || '',
    date: event.date?.start_date || '',
    time: event.date?.when?.split(' ').pop() || '',
    location: Array.isArray(event.address) ? event.address.join(', ') : (event.address || ''),
    venue: event.venue?.name || '',
    category,
    partySubcategory,
    image: event.thumbnail || '/placeholder.svg',
    coordinates,
    url: event.link || '',
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
    '120': 'party', // Added dedicated party category
    '199': 'other'
  };
  return mapping[categoryId] || 'event';
}

// Party subcategory types
export type PartySubcategory = 'day-party' | 'social' | 'brunch' | 'club' | 'networking' | 'celebration' | 'general';

// Helper function to detect party-related keywords in title or description
function detectPartyEvent(title: string = '', description: string = ''): boolean {
  const partyKeywords = [
    'party', 'celebration', 'social', 'mixer', 'gathering', 'gala',
    'reception', 'festival', 'meet-up', 'meetup', 'happy hour', 'happy-hour',
    'mingle', 'networking', 'social event', 'cocktail', 'dance party', 'rave',
    'birthday', 'anniversary', 'graduation', 'bachelor', 'bachelorette',
    'DJ', 'dance night', 'club night', 'night out', 'mixer', 'brunch',
    'day party', 'day-party', 'pool party', 'rooftop', 'lounge', 'nightclub',
    'singles', 'speed dating', 'social gathering', 'afterparty', 'after-party'
  ];

  const combinedText = `${title.toLowerCase()} ${description.toLowerCase()}`;
  return partyKeywords.some(keyword => combinedText.includes(keyword));
}

// Helper function to determine party subcategory
function detectPartySubcategory(title: string = '', description: string = '', time: string = ''): PartySubcategory {
  const combinedText = `${title.toLowerCase()} ${description.toLowerCase()}`;

  // Check for day party indicators
  if (
    combinedText.includes('day party') ||
    combinedText.includes('day-party') ||
    combinedText.includes('pool party') ||
    combinedText.includes('afternoon party') ||
    combinedText.includes('daytime') ||
    (combinedText.includes('rooftop') && !combinedText.includes('night')) ||
    // Check if time is during day hours (before 6 PM)
    (time && time.length >= 5 && parseInt(time.substring(0, 2)) < 18 && parseInt(time.substring(0, 2)) > 8)
  ) {
    return 'day-party';
  }

  // Check for brunch events
  if (
    combinedText.includes('brunch') ||
    combinedText.includes('breakfast') ||
    combinedText.includes('morning') ||
    (combinedText.includes('lunch') && combinedText.includes('party'))
  ) {
    return 'brunch';
  }

  // Check for club events
  if (
    combinedText.includes('club') ||
    combinedText.includes('nightclub') ||
    combinedText.includes('night club') ||
    combinedText.includes('dance club') ||
    combinedText.includes('disco') ||
    combinedText.includes('rave') ||
    combinedText.includes('DJ') ||
    combinedText.includes('dance night') ||
    combinedText.includes('dance party') ||
    // Check if time is during night hours (after 9 PM)
    (time && time.length >= 5 && (parseInt(time.substring(0, 2)) >= 21 || parseInt(time.substring(0, 2)) < 4))
  ) {
    return 'club';
  }

  // Check for networking/social events
  if (
    combinedText.includes('networking') ||
    combinedText.includes('mixer') ||
    combinedText.includes('mingle') ||
    combinedText.includes('meet-up') ||
    combinedText.includes('meetup') ||
    combinedText.includes('social gathering') ||
    combinedText.includes('social event') ||
    combinedText.includes('singles') ||
    combinedText.includes('speed dating') ||
    combinedText.includes('happy hour') ||
    combinedText.includes('happy-hour')
  ) {
    return 'networking';
  }

  // Check for celebration events
  if (
    combinedText.includes('birthday') ||
    combinedText.includes('anniversary') ||
    combinedText.includes('graduation') ||
    combinedText.includes('bachelor') ||
    combinedText.includes('bachelorette') ||
    combinedText.includes('celebration') ||
    combinedText.includes('gala') ||
    combinedText.includes('reception')
  ) {
    return 'celebration';
  }

  // Default to general party
  return 'general';
}

export function normalizeEventbriteEvent(event: EventbriteEvent): Event | null {
  try {
    // Validate required fields
    if (!event.id || !event.name?.text || !event.start?.local) {
      console.warn('Skipping invalid Eventbrite event:', event.id);
      return null;
    }

    // Extract coordinates using the safe parser
    const coordinates = safeParseCoordinates(
      event.venue?.longitude,
      event.venue?.latitude
    );

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
    let category = event.category_id ? mapEventbriteCategory(event.category_id) : 'event';
    let partySubcategory: PartySubcategory | undefined = undefined;

    if (detectPartyEvent(event.name.text, event.description?.text)) {
      category = 'party';
      // Extract time from the event data
      const time = event.start?.local ? event.start.local.split('T')[1]?.substring(0, 5) || '' : '';
      // Determine party subcategory
      partySubcategory = detectPartySubcategory(event.name.text, event.description?.text || '', time);
    }

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
      partySubcategory,
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
