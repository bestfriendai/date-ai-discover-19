
import { Event, PartySubcategory } from '@/types';

// Define marker configuration type
interface MarkerConfig {
  title: string;
  icon: any;
  animation?: any;
  zIndex?: number;
}

// Function to get marker configuration based on event type
export function getPartyMarkerConfig(event: Event): MarkerConfig {
  // Default configuration
  const config: MarkerConfig = {
    title: event.title || 'Event',
    icon: {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: '#3498db',
      fillOpacity: 0.9,
      strokeWeight: 1,
      strokeColor: '#FFFFFF',
      scale: 1.2,
      anchor: { x: 12, y: 22 }
    },
    zIndex: 1
  };

  // Customize based on party subcategory
  if (event.category === 'party') {
    // Check subcategory
    if (event.partySubcategory === 'nightclub' || event.partySubcategory === 'club') {
      config.icon.fillColor = '#9C27B0'; // Purple for clubs
      config.icon.scale = 1.3;
      config.zIndex = 5;
    }
    else if (event.partySubcategory === 'festival') {
      config.icon.fillColor = '#FF5722'; // Orange for festivals
      config.icon.scale = 1.4;
      config.zIndex = 6;
    }
    else if (event.partySubcategory === 'social') {
      config.icon.fillColor = '#4CAF50'; // Green for social
    }
    else if (event.partySubcategory === 'day-party' || event.partySubcategory === 'day party') {
      config.icon.fillColor = '#FFC107'; // Yellow for day parties
    }
    else if (event.partySubcategory === 'rooftop') {
      config.icon.fillColor = '#00BCD4'; // Cyan for rooftop
    }
    else if (event.partySubcategory === 'immersive') {
      config.icon.fillColor = '#E91E63'; // Pink for immersive
    }
    else if (event.partySubcategory === 'popup') {
      config.icon.fillColor = '#CDDC39'; // Lime for popup
    }
    else if (event.partySubcategory === 'networking') {
      config.icon.fillColor = '#2196F3'; // Blue for networking
    }
    else if (event.partySubcategory === 'celebration') {
      config.icon.fillColor = '#FF4081'; // Pink for celebrations
      config.zIndex = 4;
    }
    else {
      config.icon.fillColor = '#3498db'; // Default blue
    }
  }
  
  // If the event is selected, make it more prominent
  if (event.isSelected) {
    config.icon.fillColor = '#FF0000'; // Red
    config.icon.scale = 1.5;
    config.icon.strokeWeight = 2;
    config.zIndex = 10;
  }

  // Check for coordinates to use in marker placement
  if (event.coordinates && event.coordinates.length === 2) {
    // Using coordinates array [longitude, latitude]
    return config;
  } else if (event.latitude !== undefined && event.longitude !== undefined) {
    // Using latitude/longitude properties 
    return config;
  }

  return config;
}
