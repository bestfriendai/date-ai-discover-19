import { SearchParams, TicketmasterParams, PredictHQParams } from './types.ts';

/**
 * Extract Ticketmaster-specific parameters from SearchParams
 */
export function extractTicketmasterParams(params: SearchParams, apiKey: string): TicketmasterParams {
  return {
    apiKey,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    startDate: params.startDate,
    endDate: params.endDate,
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
    startDate: params.startDate,
    endDate: params.endDate,
    categories: params.categories,
    location: params.location,
    withinParam: params.predicthqLocation,
    keyword: params.keyword,
    limit: params.limit
  };
}