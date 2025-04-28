import { SearchParams, TicketmasterParams, PredictHQParams } from './types.ts';

/**
 * Format date for Ticketmaster API (YYYY-MM-DDTHH:mm:ssZ)
 */
function formatTicketmasterDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;

  try {
    // Create a date object to ensure proper ISO format
    const dateObj = new Date(dateStr);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error(`[TICKETMASTER_DATE] Invalid date: ${dateStr}`);
      return undefined;
    }

    // Return ISO string which is in the format YYYY-MM-DDTHH:mm:ss.sssZ
    return dateObj.toISOString();
  } catch (e) {
    console.error(`[TICKETMASTER_DATE] Error formatting date: ${dateStr}`, e);
    return undefined;
  }
}

/**
 * Format date for PredictHQ API (YYYY-MM-DD)
 */
function formatPredictHQDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;

  // If the date has a time component, strip it
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  return dateStr;
}

/**
 * Extract Ticketmaster-specific parameters from SearchParams
 */
export function extractTicketmasterParams(params: SearchParams, apiKey: string): TicketmasterParams {
  return {
    apiKey,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    startDate: formatTicketmasterDate(params.startDate),
    endDate: formatTicketmasterDate(params.endDate),
    keyword: params.keyword,
    segmentName: params.categories?.includes('music') ? 'Music' :
      params.categories?.includes('sports') ? 'Sports' :
      params.categories?.includes('arts') ? 'Arts & Theatre' :
      params.categories?.includes('family') ? 'Family' :
      undefined,
    classificationName: params.classificationName,
    size: params.limit
  };
}

/**
 * Extract PredictHQ-specific parameters from SearchParams
 */
export function extractPredictHQParams(params: SearchParams, apiKey: string): PredictHQParams {
  return {
    apiKey,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    startDate: formatPredictHQDate(params.startDate),
    endDate: formatPredictHQDate(params.endDate),
    categories: params.categories,
    location: params.location,
    withinParam: params.predicthqLocation,
    keyword: params.keyword,
    limit: params.limit
  };
}