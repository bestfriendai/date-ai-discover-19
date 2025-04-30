
import { Event } from '../../../types';

// Party map marker configuration types
interface MarkerConfig {
  title?: string;
  icon?: any;
  animation?: any;
  zIndex?: number;
}

// Define the marker configuration based on party type
export function getPartyMarkerConfig(event: Event): MarkerConfig {
  const config: MarkerConfig = {
    title: event.title || 'Party Event',
    zIndex: 1
  };

  // Basic default icon (no need for Google Maps dependency)
  const defaultIcon = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: "#FF0000",
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: "#FFFFFF",
    scale: 1.2,
    anchor: { x: 12, y: 24 }
  };

  // Set icon color based on party subcategory
  if (event.partySubcategory === 'club' || event.category?.toLowerCase() === 'nightclub') {
    config.icon = { ...defaultIcon, fillColor: "#9C27B0" }; // Purple for clubs
  } else if (event.partySubcategory === 'celebration' || event.category?.toLowerCase() === 'festival') {
    config.icon = { ...defaultIcon, fillColor: "#F44336" }; // Red for festivals
  } else if (event.partySubcategory === 'day-party') {
    config.icon = { ...defaultIcon, fillColor: "#FF9800" }; // Orange for day parties
  } else if (event.partySubcategory === 'social') {
    config.icon = { ...defaultIcon, fillColor: "#03A9F4" }; // Blue for social
  } else if (event.partySubcategory === 'networking') {
    config.icon = { ...defaultIcon, fillColor: "#009688" }; // Teal for networking
  } else if (event.partySubcategory === 'general') {
    config.icon = { ...defaultIcon, fillColor: "#4CAF50" }; // Green for general parties
  } else {
    config.icon = { ...defaultIcon, fillColor: "#673AB7" }; // Default purple
  }
  
  return config;
}

// Get marker bounds for events
export function getMarkerBounds(events: Event[]): { north: number; south: number; east: number; west: number } | null {
  if (!events.length) return null;

  let north = -90, south = 90, east = -180, west = 180;
  
  // Loop through all events to find bounds
  events.forEach(event => {
    // Use coordinates if available, otherwise use latitude/longitude
    const lat = event.coordinates ? event.coordinates[1] : event.latitude;
    const lng = event.coordinates ? event.coordinates[0] : event.longitude;
    
    if (lat === undefined || lng === undefined) return;
    
    north = Math.max(north, lat);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    west = Math.min(west, lng);
  });
  
  return { north, south, east, west };
}
