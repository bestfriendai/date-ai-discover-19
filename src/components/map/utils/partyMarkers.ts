
import { Event } from '@/types';

// Define Party Subcategory type here to match the Event type 
export type PartySubcategory = 
  | 'day-party' 
  | 'social' 
  | 'club' 
  | 'nightclub'
  | 'networking' 
  | 'celebration' 
  | 'general' 
  | 'festival'
  | 'day party' 
  | 'rooftop' 
  | 'immersive' 
  | 'popup'
  | 'brunch';

// Define marker configuration type
interface MarkerConfig {
  title: string;
  className?: string;
  color: string;
  size?: number;
  zIndex?: number;
  icon?: any; // For Leaflet or Google Maps icon
}

// Function to get marker configuration based on event type
export function getPartyMarkerConfig(event: Event): MarkerConfig {
  // Default configuration
  const config: MarkerConfig = {
    title: event.title || 'Event',
    color: '#3498db',
    size: 24,
    zIndex: 1
  };

  // Customize based on party subcategory
  if (event.category?.toLowerCase() === 'party' && event.partySubcategory) {
    // Check subcategory using string comparison instead of type comparison
    const subcategory = event.partySubcategory.toString().toLowerCase();
    
    if (subcategory === 'nightclub' || subcategory === 'club') {
      config.color = '#9C27B0'; // Purple for clubs
      config.size = 28;
      config.zIndex = 5;
    }
    else if (subcategory === 'festival') {
      config.color = '#FF5722'; // Orange for festivals
      config.size = 30;
      config.zIndex = 6;
    }
    else if (subcategory === 'social') {
      config.color = '#4CAF50'; // Green for social
    }
    else if (subcategory === 'day-party' || subcategory === 'day party') {
      config.color = '#FFC107'; // Yellow for day parties
    }
    else if (subcategory === 'rooftop') {
      config.color = '#00BCD4'; // Cyan for rooftop
    }
    else if (subcategory === 'immersive') {
      config.color = '#E91E63'; // Pink for immersive
    }
    else if (subcategory === 'popup') {
      config.color = '#CDDC39'; // Lime for popup
    }
    else if (subcategory === 'networking') {
      config.color = '#2196F3'; // Blue for networking
    }
    else if (subcategory === 'celebration') {
      config.color = '#FF4081'; // Pink for celebrations
      config.zIndex = 4;
    }
    else if (subcategory === 'brunch') {
      config.color = '#FF9800'; // Orange for brunch
    }
    else {
      config.color = '#3498db'; // Default blue
    }
  }
  
  // If the event is selected, make it more prominent
  if (event.isSelected) {
    config.color = '#FF0000'; // Red
    config.size = 32;
    config.zIndex = 10;
    config.className = 'pulse-marker';
  }

  return config;
}

// Helper function to get coordinates from an event
export function getEventCoordinates(event: Event): [number, number] | null {
  // First try the coordinates array
  if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) {
    return [event.coordinates[0], event.coordinates[1]];
  } 
  // Then try explicit latitude/longitude properties
  else if (typeof event.latitude === 'number' && typeof event.longitude === 'number') {
    return [event.longitude, event.latitude];
  }
  
  // If no valid coordinates are found
  return null;
}
