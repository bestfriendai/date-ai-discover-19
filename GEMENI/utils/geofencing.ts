/**
 * Geofencing Utility
 * 
 * This utility provides functions for geofencing and location-based filtering
 * to improve the accuracy of party event searches.
 */

import { Event } from '@/types';

// Popular nightlife areas in major cities
interface NightlifeArea {
  name: string;
  city: string;
  center: [number, number]; // [latitude, longitude]
  radius: number; // in miles
  description?: string;
  tags?: string[];
}

// Define popular nightlife areas in major US cities
const NIGHTLIFE_AREAS: NightlifeArea[] = [
  // New York
  {
    name: 'Lower East Side',
    city: 'New York',
    center: [40.7198, -73.9875],
    radius: 0.5,
    description: 'Hip bars and clubs in a trendy neighborhood',
    tags: ['hipster', 'trendy', 'bars', 'clubs']
  },
  {
    name: 'Meatpacking District',
    city: 'New York',
    center: [40.7397, -74.0075],
    radius: 0.3,
    description: 'Upscale clubs and lounges',
    tags: ['upscale', 'exclusive', 'clubs', 'lounges']
  },
  {
    name: 'Williamsburg',
    city: 'New York',
    center: [40.7081, -73.9571],
    radius: 0.7,
    description: 'Brooklyn\'s hipster paradise with bars and music venues',
    tags: ['hipster', 'brooklyn', 'bars', 'music']
  },
  
  // Los Angeles
  {
    name: 'Hollywood',
    city: 'Los Angeles',
    center: [34.1016, -118.3267],
    radius: 1.0,
    description: 'Famous clubs and bars on the Sunset Strip',
    tags: ['famous', 'clubs', 'celebrities', 'tourist']
  },
  {
    name: 'Downtown LA',
    city: 'Los Angeles',
    center: [34.0430, -118.2673],
    radius: 0.8,
    description: 'Trendy bars and clubs in revitalized downtown',
    tags: ['trendy', 'rooftop', 'bars', 'arts district']
  },
  
  // Miami
  {
    name: 'South Beach',
    city: 'Miami',
    center: [25.7825, -80.1340],
    radius: 0.6,
    description: 'Famous beach clubs and nightlife',
    tags: ['beach', 'clubs', 'tourist', 'upscale']
  },
  {
    name: 'Wynwood',
    city: 'Miami',
    center: [25.8010, -80.1989],
    radius: 0.5,
    description: 'Artsy district with bars and breweries',
    tags: ['art', 'hipster', 'bars', 'breweries']
  },
  
  // Chicago
  {
    name: 'River North',
    city: 'Chicago',
    center: [41.8924, -87.6341],
    radius: 0.5,
    description: 'Upscale clubs and lounges',
    tags: ['upscale', 'clubs', 'lounges', 'restaurants']
  },
  {
    name: 'Wicker Park',
    city: 'Chicago',
    center: [41.9088, -87.6796],
    radius: 0.6,
    description: 'Hip bars and music venues',
    tags: ['hipster', 'bars', 'music', 'dive bars']
  },
  
  // Las Vegas
  {
    name: 'The Strip',
    city: 'Las Vegas',
    center: [36.1147, -115.1728],
    radius: 2.0,
    description: 'World-famous casino clubs and pool parties',
    tags: ['casinos', 'clubs', 'pool parties', 'tourist']
  },
  {
    name: 'Fremont Street',
    city: 'Las Vegas',
    center: [36.1699, -115.1398],
    radius: 0.5,
    description: 'Downtown Vegas nightlife',
    tags: ['downtown', 'bars', 'casinos', 'tourist']
  },
  
  // Add more cities as needed...
];

/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  // Convert latitude and longitude from degrees to radians
  const radLat1 = (Math.PI * lat1) / 180;
  const radLon1 = (Math.PI * lon1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;
  const radLon2 = (Math.PI * lon2) / 180;
  
  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in miles
  const R = 3958.8;
  
  // Calculate the distance
  const distance = R * c;
  
  return distance;
}

/**
 * Find nightlife areas near a location
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @param radius - Search radius in miles
 * @returns Array of nearby nightlife areas
 */
export function findNearbyNightlifeAreas(
  latitude: number,
  longitude: number,
  radius: number = 5
): NightlifeArea[] {
  return NIGHTLIFE_AREAS.filter(area => {
    const distance = calculateDistance(
      latitude,
      longitude,
      area.center[0],
      area.center[1]
    );
    
    return distance <= radius;
  });
}

/**
 * Find nightlife areas in a city
 * @param city - City name
 * @returns Array of nightlife areas in the city
 */
export function findNightlifeAreasInCity(city: string): NightlifeArea[] {
  const normalizedCity = city.toLowerCase().trim();
  
  return NIGHTLIFE_AREAS.filter(area => 
    area.city.toLowerCase().includes(normalizedCity)
  );
}

/**
 * Check if a location is within a nightlife area
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @param area - Nightlife area to check
 * @returns Whether the location is within the nightlife area
 */
export function isLocationInNightlifeArea(
  latitude: number,
  longitude: number,
  area: NightlifeArea
): boolean {
  const distance = calculateDistance(
    latitude,
    longitude,
    area.center[0],
    area.center[1]
  );
  
  return distance <= area.radius;
}

/**
 * Find the nightlife area that a location is in
 * @param latitude - Latitude of the location
 * @param longitude - Longitude of the location
 * @returns Nightlife area or null if not in any area
 */
export function findNightlifeAreaForLocation(
  latitude: number,
  longitude: number
): NightlifeArea | null {
  for (const area of NIGHTLIFE_AREAS) {
    if (isLocationInNightlifeArea(latitude, longitude, area)) {
      return area;
    }
  }
  
  return null;
}

/**
 * Get events in nightlife areas
 * @param events - Events to filter
 * @returns Events that are in nightlife areas
 */
export function getEventsInNightlifeAreas(events: Event[]): Event[] {
  return events.filter(event => {
    // Skip events without coordinates
    if (!event.coordinates && (!event.latitude || !event.longitude)) {
      return false;
    }
    
    // Get coordinates
    const latitude = event.coordinates 
      ? event.coordinates[1] 
      : event.latitude!;
    
    const longitude = event.coordinates 
      ? event.coordinates[0] 
      : event.longitude!;
    
    // Check if in any nightlife area
    return findNightlifeAreaForLocation(latitude, longitude) !== null;
  });
}

/**
 * Enhance event with nightlife area information
 * @param event - Event to enhance
 * @returns Enhanced event with nightlife area information
 */
export function enhanceEventWithNightlifeArea(event: Event): Event & { 
  nightlifeArea?: NightlifeArea 
} {
  // Skip events without coordinates
  if (!event.coordinates && (!event.latitude || !event.longitude)) {
    return { ...event };
  }
  
  // Get coordinates
  const latitude = event.coordinates 
    ? event.coordinates[1] 
    : event.latitude!;
  
  const longitude = event.coordinates 
    ? event.coordinates[0] 
    : event.longitude!;
  
  // Find nightlife area
  const nightlifeArea = findNightlifeAreaForLocation(latitude, longitude);
  
  // Return enhanced event
  return {
    ...event,
    nightlifeArea: nightlifeArea || undefined
  };
}

/**
 * Enhance events with nightlife area information
 * @param events - Events to enhance
 * @returns Enhanced events with nightlife area information
 */
export function enhanceEventsWithNightlifeAreas(events: Event[]): (Event & { 
  nightlifeArea?: NightlifeArea 
})[] {
  return events.map(enhanceEventWithNightlifeArea);
}

/**
 * Get popular party locations in a city
 * @param city - City name
 * @returns Array of popular party locations
 */
export function getPopularPartyLocations(city: string): {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}[] {
  const areas = findNightlifeAreasInCity(city);
  
  return areas.map(area => ({
    name: area.name,
    latitude: area.center[0],
    longitude: area.center[1],
    description: area.description || `Popular nightlife area in ${area.city}`
  }));
}

/**
 * Create a geofence polygon for a nightlife area
 * @param area - Nightlife area
 * @param points - Number of points in the polygon
 * @returns Array of coordinates forming a polygon
 */
export function createGeofencePolygon(
  area: NightlifeArea,
  points: number = 12
): [number, number][] {
  const polygon: [number, number][] = [];
  
  // Convert radius from miles to degrees (approximate)
  const radiusDegrees = area.radius / 69.0; // 1 degree ~ 69 miles
  
  // Create a circle of points
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const lat = area.center[0] + radiusDegrees * Math.sin(angle);
    const lng = area.center[1] + radiusDegrees * Math.cos(angle) / Math.cos(area.center[0] * Math.PI / 180);
    
    polygon.push([lat, lng]);
  }
  
  // Close the polygon
  polygon.push(polygon[0]);
  
  return polygon;
}

/**
 * Check if a point is inside a polygon
 * @param point - Point to check [latitude, longitude]
 * @param polygon - Polygon to check against
 * @returns Whether the point is inside the polygon
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const x = point[0];
  const y = point[1];
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Get events within a custom geofence
 * @param events - Events to filter
 * @param geofence - Array of coordinates forming a polygon
 * @returns Events within the geofence
 */
export function getEventsWithinGeofence(
  events: Event[],
  geofence: [number, number][]
): Event[] {
  return events.filter(event => {
    // Skip events without coordinates
    if (!event.coordinates && (!event.latitude || !event.longitude)) {
      return false;
    }
    
    // Get coordinates
    const latitude = event.coordinates 
      ? event.coordinates[1] 
      : event.latitude!;
    
    const longitude = event.coordinates 
      ? event.coordinates[0] 
      : event.longitude!;
    
    // Check if in geofence
    return isPointInPolygon([latitude, longitude], geofence);
  });
}
