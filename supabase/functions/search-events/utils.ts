import { SearchParams, TicketmasterParams, PredictHQParams } from './types.ts';

/**
 * Format date for Ticketmaster API (YYYY-MM-DDTHH:mm:ssZ)
 * Ticketmaster API requires dates in the exact format YYYY-MM-DDTHH:mm:ssZ
 */
export function formatTicketmasterDate(dateStr: string | undefined, isEndDate: boolean = false): string | undefined {
  if (!dateStr) {
    console.log('[TICKETMASTER_DATE] No date provided');
    return undefined;
  }

  try {
    // Check if the date is already in the correct format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
      console.log(`[TICKETMASTER_DATE] Date already in correct format: ${dateStr}`);
      return dateStr;
    }

    // Handle ISO strings that might have milliseconds or timezone offsets
    if (dateStr.includes('T')) {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        // Set the time based on whether it's a start or end date
        if (isEndDate) {
          dateObj.setUTCHours(23, 59, 59, 0);
        } else {
          dateObj.setUTCHours(0, 0, 0, 0);
        }
        
        // Extract date part and format with required time
        const formattedDate = dateObj.toISOString().replace(/\.\d{3}Z$/, 'Z');
        console.log(`[TICKETMASTER_DATE] Formatted ISO date: ${dateStr} → ${formattedDate}`);
        return formattedDate;
      }
    }

    // Handle date-only strings (YYYY-MM-DD)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const formattedDate = isEndDate
        ? `${dateStr}T23:59:59Z`
        : `${dateStr}T00:00:00Z`;
      
      console.log(`[TICKETMASTER_DATE] Formatted date-only string: ${dateStr} → ${formattedDate}`);
      return formattedDate;
    }

    // For any other format, parse the date and format correctly
    const dateObj = new Date(dateStr);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error(`[TICKETMASTER_DATE] Invalid date: ${dateStr}`);
      return undefined;
    }

    // Set time based on whether it's start or end date
    if (isEndDate) {
      dateObj.setUTCHours(23, 59, 59, 0);
    } else {
      dateObj.setUTCHours(0, 0, 0, 0);
    }

    // Format to required Ticketmaster format: YYYY-MM-DDTHH:mm:ssZ
    const formattedDate = dateObj.toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    console.log(`[TICKETMASTER_DATE] Formatted ${isEndDate ? 'end' : 'start'} date: ${dateStr} → ${formattedDate}`);
    return formattedDate;
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
  // Handle party category specially
  let keyword = params.keyword;
  let segmentName = params.categories?.includes('music') ? 'Music' :
    params.categories?.includes('sports') ? 'Sports' :
    params.categories?.includes('arts') ? 'Arts & Theatre' :
    params.categories?.includes('family') ? 'Family' :
    undefined;
  
  // If party category is requested, enhance the search parameters
  if (params.categories?.includes('party')) {
    console.log('[TICKETMASTER_UTILS] Party category requested, enhancing search parameters');
    
    // For party events, we want to include Music, Arts & Theatre segments
    segmentName = 'Music'; // Default to Music for party events
    
    // Enhance keyword search for party events if no specific keyword is provided
    if (!keyword) {
      keyword = 'party OR nightclub OR "night club" OR "dance club" OR "dance party" OR "dj"';
    } else {
      // If keyword is provided, enhance it with party-specific terms
      keyword = `(${keyword}) OR party OR club OR nightlife OR dance OR dj`;
    }
    
    console.log('[TICKETMASTER_UTILS] Enhanced party search:', { segmentName, keyword });
  }
  
  return {
    apiKey,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    startDate: formatTicketmasterDate(params.startDate, false),
    endDate: formatTicketmasterDate(params.endDate, true),
    keyword,
    segmentName,
    classificationName: params.classificationName,
    size: params.limit || 100
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