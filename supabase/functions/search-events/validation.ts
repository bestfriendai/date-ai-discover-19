import { SearchParams } from "./types.ts";

export interface ValidationError {
  message: string;
  field?: string;
  details?: string;
}

export class RequestValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super(errors[0]?.message || 'Validation failed');
    this.name = 'RequestValidationError';
  }
}

export function validateLatLng(lat: number | undefined, lng: number | undefined): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if latitude is provided but longitude is missing
  if (lat !== undefined && lng === undefined) {
    errors.push({
      message: 'Missing longitude value',
      field: 'longitude',
      details: 'Longitude must be provided when latitude is specified'
    });
  }

  // Check if longitude is provided but latitude is missing
  if (lng !== undefined && lat === undefined) {
    errors.push({
      message: 'Missing latitude value',
      field: 'latitude',
      details: 'Latitude must be provided when longitude is specified'
    });
  }

  // Validate latitude if provided
  if (lat !== undefined) {
    if (typeof lat === 'string' && lat.trim() === '') {
      errors.push({
        message: 'Empty latitude value',
        field: 'latitude',
        details: 'Latitude cannot be an empty string'
      });
    } else if (isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90) {
      errors.push({
        message: 'Invalid latitude value',
        field: 'latitude',
        details: 'Latitude must be a number between -90 and 90'
      });
    }
  }

  // Validate longitude if provided
  if (lng !== undefined) {
    if (typeof lng === 'string' && lng.trim() === '') {
      errors.push({
        message: 'Empty longitude value',
        field: 'longitude',
        details: 'Longitude cannot be an empty string'
      });
    } else if (isNaN(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) {
      errors.push({
        message: 'Invalid longitude value',
        field: 'longitude',
        details: 'Longitude must be a number between -180 and 180'
      });
    }
  }

  return errors;
}

export function validateAndNormalizeRadius(radius: number | string | undefined): {
  value: number;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  let normalizedRadius = 50; // Default radius

  if (radius !== undefined) {
    const radiusNum = typeof radius === 'string' ? parseInt(radius, 10) : radius;
    if (isNaN(radiusNum)) {
      errors.push({
        message: 'Invalid radius value',
        field: 'radius',
        details: 'Radius must be a valid number'
      });
    } else if (radiusNum < 5 || radiusNum > 100) {
      errors.push({
        message: 'Invalid radius value',
        field: 'radius',
        details: 'Radius must be between 5 and 100 kilometers'
      });
    } else {
      normalizedRadius = radiusNum;
    }
  }

  // Ensure radius is within bounds even if no error
  normalizedRadius = Math.min(Math.max(normalizedRadius, 5), 100);

  return {
    value: normalizedRadius,
    errors
  };
}

export function validateDates(startDate?: string, endDate?: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push({
        message: 'Invalid start date',
        field: 'startDate',
        details: 'Start date must be a valid ISO date string'
      });
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push({
        message: 'Invalid end date',
        field: 'endDate',
        details: 'End date must be a valid ISO date string'
      });
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        errors.push({
          message: 'Invalid date range',
          field: 'endDate',
          details: 'End date must be after start date'
        });
      }
    }
  }

  return errors;
}

export function validateLimit(limit: number | undefined): ValidationError[] {
  const errors: ValidationError[] = [];

  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      errors.push({
        message: 'Invalid limit value',
        field: 'limit',
        details: 'Limit must be an integer between 1 and 100'
      });
    }
  }

  return errors;
}

export function validatePage(page: number | undefined): ValidationError[] {
  const errors: ValidationError[] = [];

  if (page !== undefined) {
    if (!Number.isInteger(page) || page < 1) {
      errors.push({
        message: 'Invalid page value',
        field: 'page',
        details: 'Page must be a positive integer'
      });
    }
  }

  return errors;
}

export function validateCategories(categories: string[] | undefined): ValidationError[] {
  const errors: ValidationError[] = [];
  const validCategories = ['music', 'sports', 'arts', 'family', 'food', 'business'];

  if (categories && Array.isArray(categories)) {
    // Create a copy of the categories array to modify
    const processedCategories = [...categories];

    // Handle special categories
    if (processedCategories.includes('party')) {
      // Remove 'party' and add 'music' if not already present
      processedCategories.splice(processedCategories.indexOf('party'), 1);
      if (!processedCategories.includes('music')) {
        processedCategories.push('music');
      }
      // Update the original array
      categories.length = 0;
      categories.push(...processedCategories);
    }

    // Check for any remaining invalid categories
    const invalidCategories = processedCategories.filter(cat => !validCategories.includes(cat.toLowerCase()));
    if (invalidCategories.length > 0) {
      errors.push({
        message: 'Invalid categories',
        field: 'categories',
        details: `Invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${validCategories.join(', ')}`
      });
    }
  }

  return errors;
}

export function validateAndParseSearchParams(requestBody: any): SearchParams {
  const errors: ValidationError[] = [];

  // Helper function to parse PredictHQ location string (e.g., "24km@38.89,-76.94")
  function parsePredicthqLocation(locString: string): { lat: number | undefined; lng: number | undefined } {
    if (!locString || typeof locString !== 'string') return { lat: undefined, lng: undefined };

    const match = locString.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return { lat: undefined, lng: undefined };
  }

  // Parse location from coordinates array if provided
  function parseCoordinatesArray(coords: any): { lat: number | undefined; lng: number | undefined } {
    if (!coords || !Array.isArray(coords) || coords.length < 2) {
      return { lat: undefined, lng: undefined };
    }
    
    const lng = typeof coords[0] === 'number' || (typeof coords[0] === 'string' && !isNaN(Number(coords[0])))
      ? Number(coords[0])
      : undefined;
      
    const lat = typeof coords[1] === 'number' || (typeof coords[1] === 'string' && !isNaN(Number(coords[1])))
      ? Number(coords[1])
      : undefined;
    
    return { lat, lng };
  }

  // Try to parse location from a string like "lat,lng" or "lat, lng"
  function parseLocationString(locString: string): { lat: number | undefined; lng: number | undefined } {
    if (!locString || typeof locString !== 'string') return { lat: undefined, lng: undefined };
    
    // Match patterns like "40.7128,-74.0060" or "40.7128, -74.0060"
    const match = locString.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return { lat: undefined, lng: undefined };
  }

  // Extract location parameters - support all possible formats
  let latitude: number | undefined;
  let longitude: number | undefined;
  
  // Try to extract from direct lat/lng properties
  if (requestBody.lat !== undefined || requestBody.latitude !== undefined || requestBody.userLat !== undefined) {
    latitude = requestBody.lat !== undefined ? requestBody.lat :
               requestBody.latitude !== undefined ? requestBody.latitude :
               requestBody.userLat;
  }
  
  if (requestBody.lng !== undefined || requestBody.longitude !== undefined || requestBody.userLng !== undefined) {
    longitude = requestBody.lng !== undefined ? requestBody.lng :
                requestBody.longitude !== undefined ? requestBody.longitude :
                requestBody.userLng;
  }
  
  // If we don't have both lat and lng, try to extract from coordinates array
  if ((latitude === undefined || longitude === undefined) && requestBody.coordinates) {
    const coords = parseCoordinatesArray(requestBody.coordinates);
    if (coords.lat !== undefined && latitude === undefined) latitude = coords.lat;
    if (coords.lng !== undefined && longitude === undefined) longitude = coords.lng;
  }
  
  // If we still don't have both lat and lng, try to extract from predicthqLocation
  if ((latitude === undefined || longitude === undefined) && requestBody.predicthqLocation) {
    const phqLoc = parsePredicthqLocation(requestBody.predicthqLocation);
    if (phqLoc.lat !== undefined && latitude === undefined) latitude = phqLoc.lat;
    if (phqLoc.lng !== undefined && longitude === undefined) longitude = phqLoc.lng;
  }
  
  // If we still don't have both lat and lng, try to parse from location string
  if ((latitude === undefined || longitude === undefined) && requestBody.location) {
    const locCoords = parseLocationString(requestBody.location);
    if (locCoords.lat !== undefined && latitude === undefined) latitude = locCoords.lat;
    if (locCoords.lng !== undefined && longitude === undefined) longitude = locCoords.lng;
  }

  // Get the location string
  const location = requestBody.location || requestBody.predicthqLocation || '';

  // Log extracted location parameters
  console.log('[VALIDATION] Extracted location parameters:', {
    latitude,
    longitude,
    location,
    predicthqLocation: requestBody.predicthqLocation,
    coordinates: requestBody.coordinates
  });

  // Default location parameters for New York City if none provided
  // This ensures we always have a location to search near
  const defaultLatitude = 40.7128; // NYC latitude
  const defaultLongitude = -74.0060; // NYC longitude
  const defaultLocation = 'New York, NY';

  // Use default location if no location parameters provided
  const finalLatitude = latitude !== undefined ? Number(latitude) : defaultLatitude;
  const finalLongitude = longitude !== undefined ? Number(longitude) : defaultLongitude;
  const finalLocation = location || defaultLocation;

  if ((!latitude && !longitude) && !location) {
    console.log('[VALIDATION] No location parameters provided, using default location:', {
      latitude: defaultLatitude,
      longitude: defaultLongitude,
      location: defaultLocation
    });
  }

  // Validate coordinates
  const coordErrors = validateLatLng(finalLatitude, finalLongitude);
  if (coordErrors.length > 0) {
    errors.push(...coordErrors);
  }

  // Validate and normalize radius
  const { value: normalizedRadius, errors: radiusErrors } = validateAndNormalizeRadius(requestBody.radius);
  errors.push(...radiusErrors);

  // Validate dates
  errors.push(...validateDates(requestBody.startDate, requestBody.endDate));

  // Validate limit and page
  errors.push(...validateLimit(requestBody.limit));
  errors.push(...validatePage(requestBody.page));

  // Validate categories
  errors.push(...validateCategories(requestBody.categories));

  // If there are any validation errors, throw them
  if (errors.length > 0) {
    throw new RequestValidationError(errors);
  }

  // Return validated and normalized parameters
  return {
    latitude: finalLatitude,
    longitude: finalLongitude,
    radius: normalizedRadius,
    categories: requestBody.categories || [],
    text: requestBody.keyword || '',
    start: requestBody.startDate || new Date().toISOString().split('T')[0],
    end: requestBody.endDate,
    limit: requestBody.limit || 100,
    offset: (requestBody.page ? (requestBody.page - 1) * (requestBody.limit || 100) : 0),
    sort: requestBody.sort || 'start',
    timeout: requestBody.timeout || 10000
  };
}