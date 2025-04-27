// src/services/mapboxService.ts
import { supabase } from '../integrations/supabase/client'; // Adjusted path
import errorReporter from '../utils/errorReporter'; // Adjusted path

let cachedToken: string | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds
let cacheTimestamp: number | null = null;
let fetchAttempts = 0;
const MAX_FETCH_ATTEMPTS = 3;

// Fallback token - this is a public token that can be used if the Supabase function fails
// This should be replaced with your own Mapbox public token
const FALLBACK_MAPBOX_TOKEN = 'pk.eyJ1IjoidHJhcHBhdCIsImEiOiJjbTMzODBqYTYxbHcwMmpwdXpxeWljNXJ3In0.xKUEW2C1kjFBu7kr7Uxfow';

async function getMapboxTokenOriginal(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('[MapboxService] Using cached Mapbox token.');
    return cachedToken;
  }

  console.log('[MapboxService] Fetching Mapbox token from Supabase function...');
  fetchAttempts++;

  try {
    // Use the standard Supabase client invocation with exponential backoff
    const backoffDelay = Math.min(1000 * Math.pow(2, fetchAttempts - 1), 8000); // Exponential backoff with 8s max
    console.log(`[MapboxService] Attempt ${fetchAttempts} with ${backoffDelay}ms timeout`);

    const response = await Promise.race([
      supabase.functions.invoke('get-mapbox-token'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${backoffDelay}ms fetching Mapbox token`)), backoffDelay)
      )
    ]);

    // Validate response
    if (response.error) {
      const errorMessage = response.error.message || 'Unknown error';
      errorReporter('[MapboxService] Error invoking get-mapbox-token function:', response.error);
      throw new Error(`Supabase function error: ${errorMessage}`);
    }

    // Validate response data
    const data = response.data;
    if (!data) {
      throw new Error('Empty response from Supabase function');
    }

    // Validate token format
    if (!data.MAPBOX_TOKEN || typeof data.MAPBOX_TOKEN !== 'string' ||
        !(data.MAPBOX_TOKEN.startsWith('pk.') || data.MAPBOX_TOKEN.startsWith('sk.'))) {
      errorReporter('[MapboxService] Invalid token format:', { tokenStart: data.MAPBOX_TOKEN?.substring(0, 3) });
      throw new Error('Invalid Mapbox token format received');
    }

    // Store valid token
    console.log('[MapboxService] Successfully fetched and validated Mapbox token');
    cachedToken = data.MAPBOX_TOKEN;
    cacheTimestamp = Date.now();
    fetchAttempts = 0; // Reset attempts counter on success
    return data.MAPBOX_TOKEN;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errorReporter('[MapboxService] Failed to fetch Mapbox token:', { error: errorMessage, attempt: fetchAttempts });

    // Retry with exponential backoff if attempts remain
    if (fetchAttempts < MAX_FETCH_ATTEMPTS) {
      const retryDelay = fetchAttempts * 2000; // Linear backoff for retry timing
      console.log(`[MapboxService] Retry ${fetchAttempts}/${MAX_FETCH_ATTEMPTS} in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return getMapboxTokenOriginal();
    }

    console.error('[MapboxService] All token fetch attempts failed after exponential backoff.');
    return null;
  }
}

export async function getMapboxToken(): Promise<string | null> {
  try {
    // First check if we have a token in the environment variables
    if (typeof process !== 'undefined' && process.env && process.env.MAPBOX_TOKEN) {
      console.log('[MapboxService] Using Mapbox token from environment variables');
      return process.env.MAPBOX_TOKEN;
    }

    // Try to get the token directly from the .env file if we're in development
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) {
      console.log('[MapboxService] Using Mapbox token from Vite environment variables');
      return import.meta.env.VITE_MAPBOX_TOKEN;
    }

    // Then try to get the token from Supabase
    const token = await getMapboxTokenOriginal();
    if (token) {
      return token;
    }

    // If all else fails, use the hardcoded fallback token
    console.log('[MapboxService] Using fallback Mapbox token');
    return FALLBACK_MAPBOX_TOKEN;
  } catch (error) {
    console.error('[MapboxService] Error in getMapboxToken:', error);

    // Return fallback token in case of any error
    console.log('[MapboxService] Using fallback Mapbox token due to error');
    return FALLBACK_MAPBOX_TOKEN;
  }
}
