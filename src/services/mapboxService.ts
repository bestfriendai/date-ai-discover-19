// src/services/mapboxService.ts
import { supabase } from '../integrations/supabase/client'; // Adjusted path
import errorReporter from '../utils/errorReporter'; // Adjusted path

let cachedToken: string | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds
let cacheTimestamp: number | null = null;
let fetchAttempts = 0;
const MAX_FETCH_ATTEMPTS = 3;

// For debugging - hardcoded token from curl command
const HARDCODED_TOKEN = 'pk.eyJ1IjoidHJhcHBhdCIsImEiOiJjbTMzODBqYTYxbHcwMmpwdXpxeWljNXJ3In0.xKUEW2C1kjFBu7kr7Uxfow';

export async function getMapboxToken(): Promise<string | null> {
  // For debugging - immediately return the hardcoded token
  console.log('[MapboxService] DEBUG MODE: Using hardcoded token');
  return HARDCODED_TOKEN;
}

/* Original implementation - will be restored after debugging
export async function getMapboxTokenOriginal(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('[MapboxService] Using cached Mapbox token.');
    return cachedToken;
  }

  console.log('[MapboxService] Fetching Mapbox token from Supabase function...');
  fetchAttempts++;
  
  try {
    // Use the hardcoded URL since we know it from the curl command
    const supabaseUrl = 'https://akwvmljopucsnorvdwuu.supabase.co';
    console.log('[MapboxService] Starting direct fetch to Supabase function...');
    
    // Try direct fetch first (this is more reliable in some environments)
    try {
      console.log('[MapboxService] Fetch URL:', `${supabaseUrl}/functions/v1/get-mapbox-token`);
      const directResponse = await fetch(`${supabaseUrl}/functions/v1/get-mapbox-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header needed for public functions
        }
      });
      
      console.log('[MapboxService] Direct fetch response status:', directResponse.status);
      
      if (directResponse.ok) {
        const text = await directResponse.text();
        console.log('[MapboxService] Raw response text:', text);
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('[MapboxService] JSON parse error:', e);
        }
        
        console.log('[MapboxService] Direct fetch successful:', data ? 'Data received' : 'No data');
        
        if (data && data.MAPBOX_TOKEN) {
          console.log('[MapboxService] Successfully fetched Mapbox token via direct fetch.');
          cachedToken = data.MAPBOX_TOKEN;
          cacheTimestamp = Date.now();
          fetchAttempts = 0; // Reset attempts counter on success
          return data.MAPBOX_TOKEN;
        }
      } else {
        console.warn('[MapboxService] Direct fetch failed with status:', directResponse.status);
      }
    } catch (directFetchError) {
      console.warn('[MapboxService] Direct fetch error:', directFetchError);
      // Continue to try the supabase.functions.invoke method
    }
    
    // Fallback to supabase.functions.invoke if direct fetch fails
    console.log('[MapboxService] Falling back to supabase.functions.invoke...');
    const response = await Promise.race([
      supabase.functions.invoke('get-mapbox-token'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching Mapbox token')), 8000)
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
      return getMapboxToken(); // Recursive retry
    }
    
    // All retries failed, check if we have a fallback in Vite env as last resort
    // This is only for development environments
    if (import.meta.env.DEV && import.meta.env.VITE_MAPBOX_TOKEN) {
      console.warn('[MapboxService] Using development fallback token from VITE_MAPBOX_TOKEN after Supabase function failed.');
      const devToken = import.meta.env.VITE_MAPBOX_TOKEN;
      cachedToken = devToken;
      cacheTimestamp = Date.now();
      return devToken;
    }
    
    // No fallbacks available
    console.error('[MapboxService] All token fetch attempts failed and no fallbacks available.');
    return null;
  }
}
*/
