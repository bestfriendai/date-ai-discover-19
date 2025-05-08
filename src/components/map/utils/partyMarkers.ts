
import { Event, PartySubcategory } from '@/types';

// Get party marker configuration based on event type
export const getPartyMarkerConfig = (event: Event) => {
  const defaultSize = 24;
  const selectedSize = 32;
  
  // Base marker configuration
  const baseConfig = {
    color: '#FF5733', // Default color
    size: event.isSelected ? selectedSize : defaultSize,
    className: event.isSelected ? 'selected-marker' : '',
    zIndexOffset: event.isSelected ? 1000 : 0
  };

  // Get subcategory-specific colors
  if (event.partySubcategory) {
    const subcategory = event.partySubcategory;
    
    if (subcategory === 'nightclub') {
      return {
        ...baseConfig,
        color: '#9C27B0', // Purple
      };
    } else if (subcategory === 'festival') {
      return {
        ...baseConfig,
        color: '#FFD700', // Gold
      };
    } else if (subcategory === 'concert') {
      return {
        ...baseConfig,
        color: '#1E88E5', // Blue
      };
    } else if (subcategory === 'bar') {
      return {
        ...baseConfig,
        color: '#4CAF50', // Green
      };
    } else if (subcategory === 'lounge') {
      return {
        ...baseConfig,
        color: '#E91E63', // Pink
      };
    } else if (subcategory === 'mixer') {
      return {
        ...baseConfig,
        color: '#FF9800', // Orange
      };
    } else if (subcategory === 'gala') {
      return {
        ...baseConfig,
        color: '#673AB7', // Deep Purple
      };
    } else if (subcategory === 'costume') {
      return {
        ...baseConfig,
        color: '#F44336', // Red
      };
    }
  }

  return baseConfig;
};

// Get marker coordinates from event
export const getEventCoordinates = (event: Event): [number, number] | null => {
  // First try the coordinates array
  if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) {
    return event.coordinates;
  }
  
  // Then try the latitude and longitude properties
  if (event.latitude !== undefined && event.longitude !== undefined) {
    return [event.longitude, event.latitude];
  }
  
  return null;
};
