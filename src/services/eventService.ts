
import { Event, SearchEventsParams } from '@/types';
import { callEdgeFunction } from './supabase';

// Function to search events using Supabase edge function
export async function searchEvents(params: SearchEventsParams): Promise<{ events: Event[], totalCount: number }> {
  try {
    console.log('Searching events with params:', params);
    
    // Call the fetch-events function
    const response = await callEdgeFunction('fetch-events', {
      params: {
        endpoint: 'https://real-time-events-search.p.rapidapi.com/search-events',
        ...params
      }
    });
    
    // Process and return the results
    if (response.data && Array.isArray(response.data.data)) {
      return {
        events: response.data.data.map(mapRapidApiEventToEvent),
        totalCount: response.data.totalCount || response.data.data.length
      };
    }
    
    return { events: [], totalCount: 0 };
  } catch (error) {
    console.error('Error searching events:', error);
    return { events: [], totalCount: 0 };
  }
}

// Function to get a single event by ID
export async function getEventById(id: string): Promise<Event | null> {
  try {
    // In a real app, you would fetch from an API or database
    // For now, simulate with a mock event
    return {
      id,
      title: `Event ${id}`,
      description: 'This is a sample event description.',
      date: '2023-12-01',
      time: '19:00',
      location: 'New York, NY',
      category: 'party',
      image: 'https://source.unsplash.com/random/800x600/?party',
      coordinates: [-74.0060, 40.7128]
    };
  } catch (error) {
    console.error('Error getting event by ID:', error);
    return null;
  }
}

// Helper function to map RapidAPI event to our Event type
function mapRapidApiEventToEvent(apiEvent: any): Event {
  return {
    id: apiEvent.id || Math.random().toString(36).substring(2, 15),
    title: apiEvent.name || apiEvent.title || 'Untitled Event',
    description: apiEvent.description || '',
    date: apiEvent.date || apiEvent.start_date || 'TBD',
    time: apiEvent.time || apiEvent.start_time || '',
    location: apiEvent.location || apiEvent.venue?.name || 'Unknown Location',
    venue: apiEvent.venue?.name || '',
    category: apiEvent.category || 'event',
    image: apiEvent.image || 'https://source.unsplash.com/random/800x600/?event',
    url: apiEvent.url || '',
    coordinates: apiEvent.coordinates || [apiEvent.longitude || 0, apiEvent.latitude || 0],
    latitude: apiEvent.latitude || (apiEvent.coordinates ? apiEvent.coordinates[1] : 0),
    longitude: apiEvent.longitude || (apiEvent.coordinates ? apiEvent.coordinates[0] : 0),
    price: apiEvent.price_range || apiEvent.price || 'Free',
    partySubcategory: apiEvent.subcategory || (apiEvent.category === 'party' ? 'general' : undefined)
  };
}
