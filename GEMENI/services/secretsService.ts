/**
 * Secrets Service
 *
 * This service provides a secure way to fetch API keys and other secrets from Supabase.
 * It uses Supabase Edge Functions to retrieve secrets stored securely in Supabase.
 */

import { invokeFunctionWithRetry } from '@/integrations/supabase/functions-client';

// Cache for secrets to avoid unnecessary API calls
const secretsCache: Record<string, string> = {};

/**
 * Fetch a secret from Supabase
 * @param secretName The name of the secret to fetch
 * @returns The secret value or null if not found
 */
export async function fetchSecret(secretName: string): Promise<string | null> {
  try {
    // Check if the secret is already in the cache
    if (secretsCache[secretName]) {
      return secretsCache[secretName];
    }

    // Always try environment variables first, especially in development
    // This helps avoid CORS issues and provides a fallback
    console.log(`[SECRETS] Checking environment variable for ${secretName}`);

    // Map secret names to environment variables
    const envMapping: Record<string, string> = {
      'MAPBOX_TOKEN': 'VITE_MAPBOX_TOKEN',
      'RAPIDAPI_KEY': 'VITE_RAPIDAPI_KEY',
      'TICKETMASTER_KEY': 'VITE_TICKETMASTER_KEY',
      'PREDICTHQ_API_KEY': 'VITE_PREDICTHQ_API_KEY',
      'SERPAPI_KEY': 'VITE_SERPAPI_KEY'
    };

    // Get the corresponding environment variable
    const envVar = envMapping[secretName];
    if (envVar && import.meta.env[envVar]) {
      const value = import.meta.env[envVar] as string;
      console.log(`[SECRETS] Using environment variable for ${secretName}`);
      secretsCache[secretName] = value;
      return value;
    }

    // If we're in development and there's no environment variable,
    // don't try to fetch from Supabase to avoid CORS issues
    if (import.meta.env.DEV) {
      console.log(`[SECRETS] In development mode, skipping Supabase fetch for ${secretName}`);
      return null;
    }

    console.log(`[SECRETS] Fetching secret: ${secretName}`);

    // Call the Supabase function to get the secret
    const data = await invokeFunctionWithRetry('get-secret', {
      secretName
    });

    if (!data || !data.value) {
      console.warn(`[SECRETS] Secret not found: ${secretName}`);
      return null;
    }

    // Cache the secret
    secretsCache[secretName] = data.value;

    console.log(`[SECRETS] Successfully fetched secret: ${secretName}`);
    return data.value;
  } catch (error) {
    console.error(`[SECRETS] Error fetching secret: ${secretName}`, error);
    return null;
  }
}

/**
 * Get all available API keys from Supabase
 * @returns Object containing all API keys
 */
export async function fetchAllApiKeys(): Promise<Record<string, string>> {
  try {
    console.log('[SECRETS] Fetching all API keys');

    // Always try environment variables first, especially in development
    console.log('[SECRETS] Checking environment variables for API keys');

    const keys: Record<string, string> = {};

    // Map API keys to environment variables
    const envMapping: Record<string, string> = {
      'mapbox': 'VITE_MAPBOX_TOKEN',
      'rapidapi': 'VITE_RAPIDAPI_KEY',
      'ticketmaster': 'VITE_TICKETMASTER_KEY',
      'predicthq': 'VITE_PREDICTHQ_API_KEY',
      'serpapi': 'VITE_SERPAPI_KEY'
    };

    // Get all available keys from environment variables
    Object.entries(envMapping).forEach(([key, envVar]) => {
      if (import.meta.env[envVar]) {
        keys[key] = import.meta.env[envVar] as string;
        secretsCache[key] = import.meta.env[envVar] as string;
      }
    });

    if (Object.keys(keys).length > 0) {
      console.log('[SECRETS] Successfully loaded API keys from environment:', Object.keys(keys).join(', '));
    }

    // If we're in development, don't try to fetch from Supabase to avoid CORS issues
    if (import.meta.env.DEV) {
      console.log('[SECRETS] In development mode, skipping Supabase fetch for API keys');
      return keys;
    }

    // Call the Supabase function to get all API keys
    const data = await invokeFunctionWithRetry('get-all-api-keys', {});

    if (!data || !data.keys) {
      console.warn('[SECRETS] Failed to fetch API keys');
      return {};
    }

    // Cache all keys
    Object.entries(data.keys).forEach(([key, value]) => {
      secretsCache[key] = value as string;
    });

    console.log('[SECRETS] Successfully fetched all API keys');
    return data.keys as Record<string, string>;
  } catch (error) {
    console.error('[SECRETS] Error fetching all API keys', error);
    return {};
  }
}

/**
 * Clear the secrets cache
 */
export function clearSecretsCache(): void {
  Object.keys(secretsCache).forEach(key => {
    delete secretsCache[key];
  });
}

/**
 * Initialize the secrets service by pre-fetching common API keys
 */
export async function initSecretsService(): Promise<void> {
  try {
    await fetchAllApiKeys();
  } catch (error) {
    console.error('[SECRETS] Error initializing secrets service', error);
  }
}
