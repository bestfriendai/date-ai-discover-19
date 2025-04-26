/**
 * PredictHQ API Client
 * 
 * A service for interacting with the PredictHQ Events API
 * Documentation: https://docs.predicthq.com/
 */

import { Event, SearchParams } from '../types.ts'; // Import SearchParams
import { normalizePredictHQEvent } from '../normalizers/predictHQNormalizer.ts';

interface PredictHQResponse {
  events: Event[];
  error: string | null;
  status?: number;
  warnings?: string[];
}

interface PredictHQConfig {
  apiKey: string;
  timeout?: number;
  retries?: number;
}

export class PredictHQClient {
  /**
   * Fetch events from PredictHQ API with retry logic and proper error handling
   */
  async fetchEvents(params: SearchParams, config: PredictHQConfig): Promise<PredictHQResponse> { // Changed type to SearchParams
    // Validate input parameters
    if (!params) {
      console.error('[PREDICTHQ] Missing parameters');
      return {
        events: [],
        error: 'Missing parameters',
        status: 400
      };
    }
    
    const {
      apiKey,
      timeout = 10000,
      retries = 2
    } = config;
    
    const {
      latitude,
      longitude,
      radius = 50,
      startDate,
      endDate,
      categories = [],
      location,
      withinParam,
      keyword,
      limit = 100
    } = params;

    try {
      // Validate API key
      if (typeof apiKey !== 'string' || apiKey.length < 10) {
        console.error('[PREDICTHQ_AUTH_ERROR] Invalid or missing API key.');
        return {
          events: [],
          error: 'PredictHQ API key is missing or invalid. Check server configuration.',
          status: 401
        };
      }

      // Validate date formats if provided
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return {
          events: [],
          error: 'Invalid startDate format. Use YYYY-MM-DD',
          status: 400
        };
      }

      if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return {
          events: [],
          error: 'Invalid endDate format. Use YYYY-MM-DD',
          status: 400
        };
      }

      // Validate coordinates if provided
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return {
          events: [],
          error: 'Invalid latitude value. Must be between -90 and 90',
          status: 400
        };
      }

      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return {
          events: [],
          error: 'Invalid longitude value. Must be between -180 and 180',
          status: 400
        };
      }

      // Build the PredictHQ API URL
      let url = 'https://api.predicthq.com/v1/events/';
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add location parameters
      if (withinParam) {
        queryParams.append('within', withinParam);
      } else if (latitude !== undefined && longitude !== undefined && radius) {
        // Format: "within=radius@lng,lat" (note the order is longitude,latitude)
        // Convert miles to km for PredictHQ API
        const radiusKm = Math.round(radius * 1.60934);
        queryParams.append('within', `${radiusKm}km@${longitude},${latitude}`);
      } else if (location) {
        queryParams.append('place.name', location);
      }
      
      // Add date range parameters
      if (startDate) {
        queryParams.append('active.gte', `${startDate}`);
      }
      if (endDate) {
        queryParams.append('active.lte', `${endDate}`);
      }
      
      // Add keyword search
      if (keyword) {
        queryParams.append('q', keyword);
      }
      
      // Add category filters
      if (categories && categories.length > 0) {
        // Map our categories to PredictHQ category names
        const categoryMap: Record<string, string[]> = {
          'music': ['concerts', 'festivals'],
          'sports': ['sports'],
          'arts': ['performing-arts', 'community', 'expos'],
          'family': ['community', 'expos'],
          'food': ['food-drink'],
          'party': ['festivals']
        };
        
        // Get all mapped categories
        const phqCategories = categories
          .flatMap(cat => categoryMap[cat] || [])
          .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
        
        if (phqCategories.length > 0) {
          queryParams.append('category', phqCategories.join(','));
        }
      }
      
      // Add limit parameter
      queryParams.append('limit', limit.toString());
      
      // Add sort parameter
      queryParams.append('sort', 'rank');
      
      // Add fields parameter to optimize response size
      queryParams.append('fields', 'id,title,description,start,end,category,labels,rank,local_rank,entities,location,place,phq_attendance,predicted_end');
      
      // Append query parameters to URL
      url += `?${queryParams.toString()}`;
      
      console.log('[PREDICTHQ] API URL:', url);
      
      // Implement retry logic
      let attempt = 0;
      let response: Response | null = null; // Explicitly type response
      let error = null;

      while (attempt <= retries) {
        try {
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          // Make the API request
          response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'User-Agent': 'DateAIDiscover/1.0'
            }
          });
          
          // Clear timeout
          clearTimeout(timeoutId);
          
          // Break the loop if successful
          if (response.ok) break;
          
          // If we get rate limited, wait longer before retrying
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : (2 ** attempt) * 1000;
            console.log(`[PREDICTHQ] Rate limited, waiting ${waitTime}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (e) {
          error = e;
          console.error(`[PREDICTHQ] Attempt ${attempt + 1} failed:`, e);
        }
        
        attempt++;
        
        // Exponential backoff for retries
        if (attempt <= retries && !response?.ok) {
          const backoffTime = (2 ** attempt) * 100;
          console.log(`[PREDICTHQ] Retrying in ${backoffTime}ms (attempt ${attempt} of ${retries})`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
      
      // Check for HTTP errors after all retries
      if (!response || !response.ok) {
        console.error('[PREDICTHQ] API error after retries:', response?.status, response?.statusText);
        return {
          events: [],
          error: `API returned status ${response?.status || 'unknown'}`,
          status: response?.status || 500,
          warnings: [`API returned status ${response?.status || 'unknown'}`]
        };
      }
      
      // Parse the response
      const data = await response.json();
      
      // Log response metadata for debugging
      console.log('[PREDICTHQ] API response metadata:', {
        count: data.count,
        next: !!data.next,
        previous: !!data.previous,
        resultsCount: data.results?.length || 0,
        requestId: data.request_id
      });
      
      // Log any warnings
      if (data.warnings && data.warnings.length > 0) {
        console.warn('[PREDICTHQ] API Warnings:', data.warnings);
      }
      
      // Transform PredictHQ events to our format using the normalizer
      const events = data.results?.map((event: any) => {
        try {
          return normalizePredictHQEvent(event);
        } catch (e) {
          console.error('[PREDICTHQ_NORM_ERROR] Failed to normalize PredictHQ event:', event?.id, e);
          // Return a minimal error event instead of null
          return {
            id: `predicthq-norm-error-${event?.id || Date.now()}`,
            source: 'predicthq',
            title: event?.title || 'Error Normalizing Event',
            description: `Failed to process event data from PredictHQ (ID: ${event?.id}).`,
            date: event?.start?.split('T')[0] || new Date().toISOString().split('T')[0],
            time: event?.start?.split('T')[1]?.substring(0, 5) || '00:00',
            location: event?.location_name || event?.place?.name || 'Unknown location',
            category: 'error',
            image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
            rank: event?.rank || 0,
            localRelevance: event?.local_rank || 0,
            attendance: { forecast: event?.phq_attendance, actual: event?.actual_attendance },
            demandSurge: event?.labels?.includes('demand_surge') ? 1 : 0,
          };
        }
      }) || [];
      
      // Filter out any normalization error events if they exist
      const successfullyNormalizedEvents = events.filter((event: any) => event.category !== 'error');
      
      return {
        events: successfullyNormalizedEvents,
        error: null,
        status: response.status,
        warnings: data.warnings // Include warnings in the response
      };
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.stack) {
          console.error('[PREDICTHQ] Error stack:', error.stack);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }
      console.error('[PREDICTHQ] Error fetching events:', errorMessage);
      
      // Provide more detailed error information
      let detailedError = errorMessage;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          detailedError = `PredictHQ API request timed out after ${timeout}ms`;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          detailedError = 'Network error when connecting to PredictHQ API';
        }
      }
      
      return {
        events: [],
        error: detailedError,
        status: 500
      };
    }
  }
}
