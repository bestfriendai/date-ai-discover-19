// Utility functions to normalize event data from different sources

// Define the Event interface matching the frontend type
interface Event {
  id: string;
  source?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  venue?: string;
  category: string;
  image: string;
  coordinates?: [number, number]; // [longitude, latitude]
  url?: string;
  price?: string;
}

/**
 * Normalize a Ticketmaster event to our standard format
 */
export function normalizeTicketmasterEvent(event: any): Event {
  try {
    // Extract date and time
    const startDateTime = event.dates?.start?.dateTime || new Date().toISOString();
    const date = new Date(startDateTime).toISOString().split('T')[0];
    const time = new Date(startDateTime).toTimeString().slice(0, 5);
    
    // Extract location
    const venue = event._embedded?.venues?.[0];
    const location = venue?.city?.name 
      ? `${venue.city.name}${venue.state?.name ? `, ${venue.state.name}` : ''}`
      : 'Location not specified';
    
    // Extract coordinates if available
    let coordinates: [number, number] | undefined = undefined;
    if (venue?.location?.longitude && venue?.location?.latitude) {
      coordinates = [
        parseFloat(venue.location.longitude),
        parseFloat(venue.location.latitude)
      ];
    }
    
    // Extract price if available
    let price: string | undefined = undefined;
    if (event.priceRanges && event.priceRanges.length > 0) {
      const priceRange = event.priceRanges[0];
      if (priceRange.min === priceRange.max) {
        price = `$${priceRange.min}`;
      } else {
        price = `$${priceRange.min} - $${priceRange.max}`;
      }
    }
    
    // Map category
    let category = 'other';
    const classifications = event.classifications || [];
    if (classifications.length > 0) {
      const segment = classifications[0].segment?.name?.toLowerCase();
      if (segment === 'music') category = 'music';
      else if (segment === 'sports') category = 'sports';
      else if (segment === 'arts & theatre') category = 'arts';
      else if (segment === 'family') category = 'family';
      else if (segment === 'food & drink') category = 'food';
    }
    
    return {
      id: `tm-${event.id}`,
      source: 'ticketmaster',
      title: event.name,
      description: event.description || event.info,
      date,
      time,
      location,
      venue: venue?.name,
      category,
      image: event.images && event.images.length > 0 
        ? event.images.sort((a: any, b: any) => b.width - a.width)[0].url 
        : 'https://via.placeholder.com/400',
      coordinates,
      url: event.url,
      price
    };
  } catch (error) {
    console.error('Error normalizing Ticketmaster event:', error);
    throw error;
  }
}

/**
 * Normalize a SerpApi Google Events result to our standard format
 */
export function normalizeSerpApiEvent(event: any): Event {
  try {
    // Extract date and time
    const date = event.date?.when || new Date().toISOString().split('T')[0];
    const time = event.date?.start_time || '19:00';
    
    // Extract location
    const location = event.address || event.venue?.name || 'Location not specified';
    
    // Map category based on event title and description
    let category = 'other';
    const titleLower = (event.title || '').toLowerCase();
    const descLower = (event.description || '').toLowerCase();
    const venueType = (event.venue?.type || '').toLowerCase();
    
    if (
      titleLower.includes('concert') || 
      titleLower.includes('music') || 
      descLower.includes('band') ||
      venueType.includes('music venue')
    ) {
      category = 'music';
    } else if (
      titleLower.includes('game') || 
      titleLower.includes('match') || 
      titleLower.includes('tournament') ||
      descLower.includes('sports')
    ) {
      category = 'sports';
    } else if (
      titleLower.includes('art') || 
      titleLower.includes('exhibit') || 
      titleLower.includes('theatre') || 
      titleLower.includes('theater') ||
      titleLower.includes('museum')
    ) {
      category = 'arts';
    } else if (
      titleLower.includes('food') || 
      titleLower.includes('drink') || 
      titleLower.includes('tasting') ||
      titleLower.includes('dinner') ||
      venueType.includes('restaurant')
    ) {
      category = 'food';
    } else if (
      titleLower.includes('family') || 
      titleLower.includes('kids') || 
      titleLower.includes('children')
    ) {
      category = 'family';
    }
    
    // Generate a unique ID
    const id = `serp-${Buffer.from(event.title + event.date?.start_date + (event.venue?.name || '')).toString('base64').substring(0, 20)}`;
    
    return {
      id,
      source: 'google',
      title: event.title,
      description: event.description,
      date: event.date?.start_date || date,
      time,
      location,
      venue: event.venue?.name,
      category,
      image: event.thumbnail || 'https://via.placeholder.com/400',
      url: event.link,
      price: event.ticket_info?.price
    };
  } catch (error) {
    console.error('Error normalizing SerpApi event:', error);
    throw error;
  }
}
