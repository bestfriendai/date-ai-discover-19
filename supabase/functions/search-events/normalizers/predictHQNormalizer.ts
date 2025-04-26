/**
 * PredictHQ Event Normalizer
 * 
 * Normalizes PredictHQ API event data to our standard Event format
 */

import { Event } from '../types.ts';

/**
 * Normalize a PredictHQ event to our standard Event format
 */
export function normalizePredictHQEvent(event: any): Event {
  // Extract basic event information
  const id = event.id;
  const title = event.title;
  const description = event.description || title;
  
  // Extract dates
  const start = event.start || new Date().toISOString();
  const end = event.end || start;
  
  // Extract date and time components
  const startDate = start.split('T')[0];
  const startTime = start.split('T')[1]?.substring(0, 5) || '00:00';
  
  // Extract location information
  let coordinates: [number, number] | undefined;
  let location = 'Unknown location';
  let venueName = '';
  
  if (event.location && Array.isArray(event.location) && event.location.length === 2) {
    // PredictHQ location is [longitude, latitude] - we need to swap for our format
    coordinates = [event.location[1], event.location[0]];
  }
  
  // Extract place information
  if (event.place) {
    venueName = event.place.name || '';
    
    const locationParts = [];
    if (venueName) locationParts.push(venueName);
    if (event.place.city) locationParts.push(event.place.city);
    if (event.place.state) locationParts.push(event.place.state);
    if (event.place.country) locationParts.push(event.place.country);
    
    location = locationParts.join(', ');
  } else if (event.country && event.country !== 'US') {
    location = `${event.country}`;
  }
  
  // Map PredictHQ category to our categories
  let category = 'other';
  const phqCategory = event.category;
  
  if (phqCategory) {
    switch (phqCategory) {
      case 'concerts':
      case 'festivals':
        category = 'music';
        break;
      case 'sports':
        category = 'sports';
        break;
      case 'performing-arts':
      case 'community':
      case 'expos':
        category = 'arts';
        break;
      case 'academic':
      case 'school-holidays':
        category = 'family';
        break;
      case 'food-drink':
        category = 'food';
        break;
      default:
        category = 'other';
    }
  }
  
  // Extract subcategories from labels
  const subcategories = event.labels || [];
  
  // Generate a URL
  const url = `https://predicthq.com/events/${id}`;
  
  // Use a default image based on category
  let image;
  switch (category) {
    case 'music':
      image = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop';
      break;
    case 'sports':
      image = 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&auto=format&fit=crop';
      break;
    case 'arts':
      image = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop';
      break;
    case 'family':
      image = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop';
      break;
    case 'food':
      image = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop';
      break;
    default:
      image = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
  }
  
  // Extract attendance information
  const attendance = {
    forecast: event.phq_attendance,
    actual: event.actual_attendance
  };
  
  // Extract entities (performers, teams, etc.)
  const entities = event.entities?.map((entity: any) => ({
    name: entity.name,
    type: entity.type
  })) || [];
  
  // Create the normalized event object
  const normalizedEvent: Event = {
    id: `predicthq:${id}`,
    source: 'predicthq',
    title,
    description,
    start,
    end,
    url,
    image,
    venue: {
      name: venueName,
      coordinates
    },
    category,
    subcategories,
    coordinates,
    date: startDate,
    time: startTime,
    location,
    rank: event.rank,
    localRelevance: event.local_rank,
    attendance,
    entities,
    relevance: event.relevance,
    demandSurge: event.labels?.includes('demand_surge') ? 1 : 0
  };
  
  return normalizedEvent;
}
