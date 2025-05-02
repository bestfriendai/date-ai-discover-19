// Custom Supabase client for Edge Functions
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Default values for development
const DEFAULT_SUPABASE_URL = 'https://akwvmljopucsnorvdwuu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk';

// Try to get from environment variables with fallbacks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Log initialization in development
if (import.meta.env.DEV) {
  console.log('Initializing Supabase functions client with URL:', SUPABASE_URL);
}

// Create a custom Supabase client with proper configuration for Edge Functions
export const functionsClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
          // Use the same key as the client
          const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

          // If the function is search-events, use the dedicated rapidapi-events function
          const actualFunctionName = functionName === 'search-events' ? 'rapidapi-events' : functionName;
          console.log(`[FUNCTIONS_CLIENT] Using function: ${actualFunctionName}`);

          // Extract project ID from URL
          const projectId = SUPABASE_URL.split('//')[1].split('.')[0];
          console.log(`[FUNCTIONS_CLIENT] Using project ID: ${projectId}`);

          const response = await fetch(`https://${projectId}.functions.supabase.co/${actualFunctionName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
          });

          console.log(`[FUNCTIONS_CLIENT] Direct fetch response status:`, response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[FUNCTIONS_CLIENT] Direct fetch error: ${response.status}`, errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
          }

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
