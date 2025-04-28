/**
 * Party Markers Utility
 * 
 * This file provides functions and constants for creating custom map markers
 * for different types of party events.
 */

// Define marker colors for different party types
export const PARTY_MARKER_COLORS = {
  nightclub: '#9c27b0', // Purple
  festival: '#e91e63', // Pink
  brunch: '#ff9800',   // Orange
  'day party': '#4caf50', // Green
  general: '#f44336',  // Red
  default: '#2196f3'   // Blue
};

/**
 * Create an SVG marker for a party event
 * @param type - The party subcategory
 * @returns SVG string for the marker
 */
export function createPartyMarkerSVG(type: string = 'general'): string {
  // Get the color based on the party type
  const color = PARTY_MARKER_COLORS[type as keyof typeof PARTY_MARKER_COLORS] || PARTY_MARKER_COLORS.default;
  
  // Create an SVG marker with the appropriate color
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
}

/**
 * Create a Google Maps marker icon for a party event
 * @param type - The party subcategory
 * @returns Google Maps marker icon configuration
 */
export function createPartyMarkerIcon(type: string = 'general'): google.maps.Icon {
  // Create a data URL from the SVG
  const svgString = createPartyMarkerSVG(type);
  const encodedSvg = encodeURIComponent(svgString);
  const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodedSvg}`;
  
  return {
    url: dataUrl,
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 36),
    labelOrigin: new google.maps.Point(18, 10)
  };
}

/**
 * Get a marker configuration for a party event
 * @param event - The event object
 * @returns Google Maps marker configuration
 */
export function getPartyMarkerConfig(event: any): google.maps.MarkerOptions {
  const type = event.partySubcategory || 'general';
  
  return {
    icon: createPartyMarkerIcon(type),
    title: event.title,
    animation: google.maps.Animation.DROP,
    optimized: true
  };
}
