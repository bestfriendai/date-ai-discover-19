// src/services/mapboxService.ts
import { supabase } from '../integrations/supabase/client'; // Adjusted path
import errorReporter from '../utils/errorReporter'; // Adjusted path

let cachedToken: string | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds
let cacheTimestamp: number | null = null;
let fetchAttempts = 0;
const MAX_FETCH_ATTEMPTS = 3;

async function getMapboxTokenOriginal(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('[MapboxService] Using cached Mapbox token.');
    return cachedToken;
  }

  console.log('[MapboxService] Fetching Mapbox token from Supabase function...');
  fetchAttempts++;

  try {
    // Use the standard Supabase client invocation
    console.log('[MapboxService] Invoking Supabase function: get-mapbox-token');
    const response = await Promise.race([
      supabase.functions.invoke('get-mapbox-token'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching Mapbox token')), 8000) // 8 second timeout
      )
    ]);

    // Log the response status for debugging
    console.log('[MapboxService] Supabase function response status:',
      response.error ? 'Error' : 'Success');
    console.log('[MapboxService] Response data:', response.data ? 'Data received' : 'No data');

    if (response.error) {
      errorReporter('[MapboxService] Error invoking get-mapbox-token function:', response.error);
      throw new Error(`Supabase function error: ${response.error.message || 'Unknown error'}`);
    }

    // Parse the JSON data from the response
    const data = response.data;

    // Check the structure of the data returned by your function
    if (data && data.MAPBOX_TOKEN) {
      console.log('[MapboxService] Successfully fetched Mapbox token from Supabase function.');
      cachedToken = data.MAPBOX_TOKEN;
      cacheTimestamp = Date.now();
      fetchAttempts = 0; // Reset attempts counter on success
      return data.MAPBOX_TOKEN;
    } else {
      errorReporter('[MapboxService] No MAPBOX_TOKEN found in function response:', data);
      throw new Error('No MAPBOX_TOKEN returned from Supabase function');
    }
  } catch (error) {
    errorReporter('[MapboxService] Failed to fetch Mapbox token:', error);

    // Check if we should retry
    if (fetchAttempts < MAX_FETCH_ATTEMPTS) {
      console.log(`[MapboxService] Retry attempt ${fetchAttempts}/${MAX_FETCH_ATTEMPTS} in ${fetchAttempts * 2} seconds...`);
      // Wait before retrying (increasing delay with each attempt)
      await new Promise(resolve => setTimeout(resolve, fetchAttempts * 2000));
      return getMapboxTokenOriginal(); // Recursive retry
    }

    // No fallbacks available
    console.error('[MapboxService] All token fetch attempts failed.');
    return null;
  }
}

export async function getMapboxToken(): Promise<string | null> {
  return getMapboxTokenOriginal();
}
