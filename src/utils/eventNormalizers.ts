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
