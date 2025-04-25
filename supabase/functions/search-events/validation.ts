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
  
  if (lat !== undefined) {
    if (isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90) {
      errors.push({
        message: 'Invalid latitude value',
        field: 'latitude',
        details: 'Latitude must be a number between -90 and 90'
      });
    }
  }

  if (lng !== undefined) {
    if (isNaN(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) {
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

  // Extract location parameters
  const latitude = requestBody.lat || requestBody.latitude || requestBody.userLat;
  const longitude = requestBody.lng || requestBody.longitude || requestBody.userLng;
  const location = requestBody.location || '';

  // Validate location parameters
  if ((!latitude && !longitude) && !location) {
    errors.push({
      message: 'Missing location parameters',
      details: 'Either coordinates (latitude/longitude) or location string is required'
    });
  }

  // Validate coordinates if provided
  if (latitude !== undefined || longitude !== undefined) {
    errors.push(...validateLatLng(latitude, longitude));
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
    keyword: requestBody.keyword || '',
    location,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
    radius: normalizedRadius, // Now guaranteed to be a number
    startDate: requestBody.startDate || new Date().toISOString().split('T')[0],
    endDate: requestBody.endDate,
    categories: requestBody.categories || [],
    limit: requestBody.limit || 100,
    page: requestBody.page || 1,
    excludeIds: requestBody.excludeIds || [],
    predicthqLocation: requestBody.predicthqLocation
  };
}