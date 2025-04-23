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
 * Checks if coordinates are likely on land (very approximate)
 * This is a simple heuristic to filter out points in the middle of oceans
 * @param coordinates The coordinates to check
 * @returns True if coordinates are likely on land, false otherwise
 */
export function isLikelyOnLand(coordinates: [number, number]): boolean {
  // First validate the coordinates
  if (!validateCoordinates(coordinates)) {
    return false;
  }

  // MODIFIED: Always return true to show all markers
  // This ensures all events with valid coordinates are displayed
  return true;

  /* Original ocean filtering code - commented out to show all markers
  const [lng, lat] = coordinates;

  // Very simple check for coordinates in the middle of major oceans
  // Pacific Ocean (rough bounds)
  if (lng < -120 && lng > -180 && lat < 60 && lat > -60) {
    // Check if not near coastlines
    if (lng < -135 && lat < 45 && lat > -45) {
      return false;
    }
  }

  // Atlantic Ocean (rough bounds)
  if (lng < -20 && lng > -70 && lat < 60 && lat > -60) {
    // Check if not near coastlines
    if (lng < -30 && lng > -60 && lat < 45 && lat > -45) {
      return false;
    }
  }

  // Indian Ocean (rough bounds)
  if (lng > 50 && lng < 100 && lat < 20 && lat > -60) {
    // Check if not near coastlines
    if (lng > 60 && lng < 90 && lat < 10 && lat > -40) {
      return false;
    }
  }

  // Southern Ocean (rough bounds)
  if (lat < -60) {
    return false;
  }

  // Arctic Ocean (rough bounds)
  if (lat > 80) {
    return false;
  }

  return true;
  */
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
