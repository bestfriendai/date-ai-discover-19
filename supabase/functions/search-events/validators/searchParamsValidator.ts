/**
 * Search Parameters Validator
 * 
 * Validates and normalizes search parameters for the events API
 */

import { SearchParams } from '../types.ts';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  params?: SearchParams;
}

/**
 * Validate and normalize search parameters
 */
export function validateSearchParams(params: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const validatedParams: SearchParams = {};
  
  // Validate and normalize latitude
  if (params.latitude !== undefined) {
    const lat = parseFloat(params.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Invalid latitude. Must be a number between -90 and 90.');
    } else {
      validatedParams.latitude = lat;
    }
  }
  
  // Validate and normalize longitude
  if (params.longitude !== undefined) {
    const lng = parseFloat(params.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Invalid longitude. Must be a number between -180 and 180.');
    } else {
      validatedParams.longitude = lng;
    }
  }
  
  // Validate and normalize radius
  if (params.radius !== undefined) {
    const radius = parseFloat(params.radius);
    if (isNaN(radius) || radius <= 0) {
      errors.push('Invalid radius. Must be a positive number.');
    } else {
      validatedParams.radius = Math.min(100, Math.max(1, radius)); // Clamp between 1 and 100
    }
  } else if (validatedParams.latitude !== undefined && validatedParams.longitude !== undefined) {
    // Default radius if coordinates are provided
    validatedParams.radius = 25; // 25 miles default
  }
  
  // Validate and normalize text search
  if (params.text !== undefined) {
    if (typeof params.text !== 'string') {
      errors.push('Invalid text parameter. Must be a string.');
    } else {
      validatedParams.text = params.text.trim();
    }
  }
  
  // Validate and normalize keyword (alias for text)
  if (params.keyword !== undefined) {
    if (typeof params.keyword !== 'string') {
      errors.push('Invalid keyword parameter. Must be a string.');
    } else {
      validatedParams.text = params.keyword.trim();
    }
  }
  
  // Validate and normalize location
  if (params.location !== undefined) {
    if (typeof params.location !== 'string') {
      errors.push('Invalid location parameter. Must be a string.');
    } else {
      validatedParams.location = params.location.trim();
    }
  }
  
  // Validate and normalize date range
  if (params.startDate !== undefined || params.start !== undefined) {
    const startDate = params.startDate || params.start;
    if (!isValidDateString(startDate)) {
      errors.push('Invalid start date. Must be in YYYY-MM-DD format.');
    } else {
      validatedParams.start = startDate;
    }
  } else {
    // Default to today if not provided
    validatedParams.start = new Date().toISOString().split('T')[0];
  }
  
  if (params.endDate !== undefined || params.end !== undefined) {
    const endDate = params.endDate || params.end;
    if (!isValidDateString(endDate)) {
      errors.push('Invalid end date. Must be in YYYY-MM-DD format.');
    } else {
      validatedParams.end = endDate;
    }
  } else {
    // Default to 30 days from today if not provided
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    validatedParams.end = thirtyDaysFromNow.toISOString().split('T')[0];
  }
  
  // Validate date range order
  if (validatedParams.start && validatedParams.end) {
    if (validatedParams.start > validatedParams.end) {
      errors.push('Invalid date range. Start date must be before or equal to end date.');
    }
  }
  
  // Validate and normalize categories
  if (params.categories !== undefined) {
    let categoriesArray: string[] = [];
    
    if (typeof params.categories === 'string') {
      // Handle comma-separated string
      categoriesArray = params.categories.split(',').map((c: string) => c.trim().toLowerCase());
    } else if (Array.isArray(params.categories)) {
      // Handle array
      categoriesArray = params.categories.map((c: any) => 
        typeof c === 'string' ? c.trim().toLowerCase() : String(c).toLowerCase()
      );
    } else {
      errors.push('Invalid categories parameter. Must be a string or array.');
    }
    
    // Validate category values
    const validCategories = ['music', 'sports', 'arts', 'family', 'food', 'party'];
    const invalidCategories = categoriesArray.filter(c => !validCategories.includes(c));
    
    if (invalidCategories.length > 0) {
      errors.push(`Invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${validCategories.join(', ')}.`);
    } else {
      validatedParams.categories = categoriesArray;
    }
  }
  
  // Validate and normalize pagination parameters
  if (params.limit !== undefined) {
    const limit = parseInt(params.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      errors.push('Invalid limit parameter. Must be a positive integer.');
    } else {
      validatedParams.limit = Math.min(200, limit); // Cap at 200
    }
  } else {
    validatedParams.limit = 100; // Default limit
  }
  
  if (params.offset !== undefined) {
    const offset = parseInt(params.offset, 10);
    if (isNaN(offset) || offset < 0) {
      errors.push('Invalid offset parameter. Must be a non-negative integer.');
    } else {
      validatedParams.offset = offset;
    }
  } else {
    validatedParams.offset = 0; // Default offset
  }
  
  // Validate and normalize page (convert to offset if provided)
  if (params.page !== undefined) {
    const page = parseInt(params.page, 10);
    if (isNaN(page) || page <= 0) {
      errors.push('Invalid page parameter. Must be a positive integer.');
    } else {
      const limit = validatedParams.limit || 100;
      validatedParams.offset = (page - 1) * limit;
    }
  }
  
  // Validate and normalize sort parameter
  if (params.sort !== undefined) {
    const validSortOptions = ['date', 'relevance', 'distance', 'rank'];
    if (!validSortOptions.includes(params.sort)) {
      errors.push(`Invalid sort parameter. Must be one of: ${validSortOptions.join(', ')}.`);
    } else {
      validatedParams.sort = params.sort;
    }
  } else {
    validatedParams.sort = 'date'; // Default sort
  }
  
  // Validate and normalize timeout parameter
  if (params.timeout !== undefined) {
    const timeout = parseInt(params.timeout, 10);
    if (isNaN(timeout) || timeout <= 0) {
      errors.push('Invalid timeout parameter. Must be a positive integer.');
    } else {
      validatedParams.timeout = Math.min(30000, Math.max(1000, timeout)); // Between 1s and 30s
    }
  }
  
  // Location validation logic
  if (!validatedParams.latitude && !validatedParams.longitude && !validatedParams.location) {
    // No location parameters provided, but we'll still process the request
    console.log('[VALIDATION] No location parameters provided');
  }
  
  // Return validation result
  return {
    isValid: errors.length === 0,
    errors,
    params: validatedParams
  };
}

/**
 * Check if a string is a valid date in YYYY-MM-DD format
 */
function isValidDateString(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
