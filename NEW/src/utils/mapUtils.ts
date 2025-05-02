/**
 * Utility functions for map operations
 */

/**
 * Validates if coordinates are valid for use with Mapbox
 * @param coordinates The coordinates to validate
 * @returns True if coordinates are valid, false otherwise
 */
export function validateCoordinates(coordinates: any): boolean {
  // Check if coordinates exist and are an array
  if (!coordinates || !Array.isArray(coordinates)) {
    return false;
  }

  // Check if coordinates have exactly 2 elements
  if (coordinates.length !== 2) {
    return false;
  }

  // Check if both elements are numbers
  if (typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
    return false;
  }

  // Check if coordinates are not NaN
  if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    return false;
  }

  // Check if longitude is within valid range (-180 to 180)
  if (coordinates[0] < -180 || coordinates[0] > 180) {
    return false;
  }

  // Check if latitude is within valid range (-90 to 90)
  if (coordinates[1] < -90 || coordinates[1] > 90) {
    return false;
  }

  return true;
}

/**
 * Apply small random jitter to coordinates to prevent markers from overlapping
 * @param coordinates The original coordinates
 * @param amount The maximum amount of jitter to apply (in degrees)
 * @returns New coordinates with jitter applied
 */
export function applyCoordinateJitter(
  coordinates: [number, number],
  amount: number = 0.0005
): [number, number] {
  if (!validateCoordinates(coordinates)) {
    return coordinates;
  }

  const jitterLng = (Math.random() - 0.5) * amount;
  const jitterLat = (Math.random() - 0.5) * amount;

  return [
    coordinates[0] + jitterLng,
    coordinates[1] + jitterLat
  ];
}

/**
 * Apply jitter to multiple features' coordinates
 * @param features Array of events with coordinates
 * @param amount The maximum amount of jitter to apply (in degrees)
 * @returns Map of feature IDs to jittered coordinates
 */
export function applyJitterToFeatures(
  features: Array<{ id: string | number; coordinates: [number, number] }>,
  amount: number = 0.0005
): Map<string, [number, number]> {
  const jitteredCoords = new Map<string, [number, number]>();
  
  features.forEach(feature => {
    if (feature.id && feature.coordinates) {
      const id = String(feature.id);
      jitteredCoords.set(id, applyCoordinateJitter(feature.coordinates as [number, number], amount));
    }
  });

  return jitteredCoords;
}

/**
 * Calculate distance between two coordinates in kilometers
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * Convert degrees to radians
 * @param deg Degrees
 * @returns Radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get a human-readable distance string
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
}
