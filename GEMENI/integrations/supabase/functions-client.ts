// Custom Supabase client for Edge Functions
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getApiKey } from '@/config/env';

// Get Supabase configuration from environment
const SUPABASE_URL = getApiKey('supabase-url');
const SUPABASE_ANON_KEY = getApiKey('supabase-anon-key');

// Log initialization in development
if (import.meta.env.DEV) {
  console.log('Initializing Supabase functions client with URL:', SUPABASE_URL);
}

// Create a custom Supabase client with proper configuration for Edge Functions
export const functionsClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Helper function to invoke Edge Functions with proper error handling
export async function invokeFunctionWithRetry<T = any>(
  functionName: string,
  payload: any,
  maxRetries = 2
): Promise<T> {
  let retries = 0;
  let lastError: any;

  console.log(`[FUNCTIONS_CLIENT] Preparing to invoke ${functionName} with payload:`, payload);
  console.log(`[FUNCTIONS_CLIENT] Payload type:`, typeof payload);
  console.log(`[FUNCTIONS_CLIENT] Payload JSON:`, JSON.stringify(payload));

  while (retries <= maxRetries) {
    try {
      console.log(`[FUNCTIONS_CLIENT] Invoking ${functionName} (attempt ${retries + 1}/${maxRetries + 1})`);

      // Try direct fetch first for better debugging
      if (retries === 0) {
        console.log(`[FUNCTIONS_CLIENT] Attempting direct fetch for better debugging`);
        try {
          // Use the anon key for authentication
          // SUPABASE_ANON_KEY is already defined above

          // If the function is search-events, use the dedicated rapidapi-events function
          const actualFunctionName = functionName === 'search-events' ? 'rapidapi-events' : functionName;
          console.log(`[FUNCTIONS_CLIENT] Using function: ${actualFunctionName}`);

          // Extract project ID from URL
          const projectId = SUPABASE_URL.split('//')[1].split('.')[0];
          console.log(`[FUNCTIONS_CLIENT] Using project ID: ${projectId}`);

          // Try both direct function URL and Supabase functions URL
          const urls = [
            `https://${projectId}.functions.supabase.co/${actualFunctionName}`,
            `${SUPABASE_URL}/functions/v1/${actualFunctionName}`
          ];

          // Try each URL
          let response = null;
          let lastError = null;

          for (const url of urls) {
            try {
              console.log(`[FUNCTIONS_CLIENT] Trying URL: ${url}`);
              response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify(payload)
              });

              if (response.ok) {
                console.log(`[FUNCTIONS_CLIENT] Successful response from ${url}`);
                break;
              } else {
                console.warn(`[FUNCTIONS_CLIENT] Non-OK response from ${url}: ${response.status}`);
                lastError = new Error(`HTTP error! status: ${response.status}`);
              }
            } catch (error) {
              console.warn(`[FUNCTIONS_CLIENT] Error fetching from ${url}:`, error);
              lastError = error;
            }
          }

          if (!response || !response.ok) {
            throw lastError || new Error('All fetch attempts failed');
          }

          console.log(`[FUNCTIONS_CLIENT] Direct fetch response status:`, response.status);

          const data = await response.json();
          console.log(`[FUNCTIONS_CLIENT] Direct fetch successful:`, data);
          return data;
        } catch (directFetchError) {
          console.error(`[FUNCTIONS_CLIENT] Direct fetch failed:`, directFetchError);
          // Continue to try with the Supabase client
        }
      }

      // Fall back to Supabase client
      const { data, error } = await functionsClient.functions.invoke<T>(functionName, {
        body: payload
      });

      if (error) {
        console.error(`[FUNCTIONS_CLIENT] Error invoking ${functionName}:`, error);
        lastError = error;
        retries++;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries)));
        continue;
      }

      console.log(`[FUNCTIONS_CLIENT] Successfully invoked ${functionName}:`, data);
      return data;
    } catch (err) {
      console.error(`[FUNCTIONS_CLIENT] Exception invoking ${functionName}:`, err);
      lastError = err;
      retries++;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries)));
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError || new Error(`Failed to invoke ${functionName} after ${maxRetries} retries`);
}
