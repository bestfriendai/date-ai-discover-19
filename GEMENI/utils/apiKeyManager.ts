/**
 * API Key Manager
 *
 * This utility provides a secure way to manage API keys in the client-side application.
 * It uses a combination of Supabase secrets, environment variables, local storage, and runtime fetching
 * to provide API keys while keeping them as secure as possible in a client-side context.
 *
 * SECURITY NOTES:
 * - Never log full API keys
 * - Never store API keys in client-side code
 * - Prefer server-side API calls when possible
 * - Use Supabase secrets as the primary source for API keys
 */

import { fetchSecret } from '@/services/secretsService';

// Interface for API key configuration
interface ApiKeyConfig {
  name: string;
  secretName?: string;     // Name of the secret in Supabase
  envVariable?: string;    // Environment variable name
  storageKey?: string;     // Local storage key
  fetchUrl?: string;       // URL to fetch the key
  defaultValue?: string;   // Default value (only for development)
}

// API key configurations
const API_KEYS: Record<string, ApiKeyConfig> = {
  mapbox: {
    name: 'Mapbox',
    secretName: 'MAPBOX_TOKEN',
    envVariable: 'VITE_MAPBOX_TOKEN',
    storageKey: 'dateai_mapbox_token',
    // Fallback for development only - using public Mapbox token
    defaultValue: import.meta.env.DEV ? 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA' : undefined
  },
  rapidapi: {
    name: 'RapidAPI',
    secretName: 'RAPIDAPI_KEY',
    envVariable: 'VITE_RAPIDAPI_KEY',
    storageKey: 'dateai_rapidapi_key'
    // Removed hardcoded API key for security
  },
  ticketmaster: {
    name: 'Ticketmaster',
    secretName: 'TICKETMASTER_KEY',
    envVariable: 'VITE_TICKETMASTER_KEY',
    storageKey: 'dateai_ticketmaster_key'
  },
  predicthq: {
    name: 'PredictHQ',
    secretName: 'PREDICTHQ_API_KEY',
    envVariable: 'VITE_PREDICTHQ_API_KEY',
    storageKey: 'dateai_predicthq_key'
  },
  serpapi: {
    name: 'SerpAPI',
    secretName: 'SERPAPI_KEY',
    envVariable: 'VITE_SERPAPI_KEY',
    storageKey: 'dateai_serpapi_key'
  }
};

// Cache for API keys
const keyCache: Record<string, string> = {};

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;  // Maximum requests in the time window
  windowMs: number;     // Time window in milliseconds
}

// Rate limit settings for different services
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  rapidapi: {
    maxRequests: 50,    // 50 requests per minute (adjust based on your plan)
    windowMs: 60 * 1000 // 1 minute
  },
  mapbox: {
    maxRequests: 300,   // 300 requests per minute
    windowMs: 60 * 1000 // 1 minute
  },
  ticketmaster: {
    maxRequests: 5,     // 5 requests per second
    windowMs: 1000      // 1 second
  },
  predicthq: {
    maxRequests: 100,   // 100 requests per minute
    windowMs: 60 * 1000 // 1 minute
  },
  serpapi: {
    maxRequests: 100,   // 100 requests per hour
    windowMs: 60 * 60 * 1000 // 1 hour
  }
};

// Track API usage for rate limiting
interface ApiUsage {
  requests: number[];  // Timestamps of requests
  lastError?: Date;    // Time of last error
  errorCount: number;  // Count of errors
}

// Store API usage data
const apiUsage: Record<string, ApiUsage> = {};

/**
 * Safely mask an API key for logging purposes
 * @param key - The API key to mask
 * @returns A masked version of the key that's safe to log
 */
function maskApiKey(key: string): string {
  if (!key) return '[EMPTY]';
  if (key.length <= 8) return '********';

  // Only show first 4 and last 4 characters
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * Check if we're exceeding the rate limit for a service
 * @param service - The service to check
 * @returns True if rate limited, false otherwise
 */
function isRateLimited(service: string): boolean {
  const limits = RATE_LIMITS[service];
  if (!limits) return false;  // No limits defined

  const usage = apiUsage[service];
  if (!usage) return false;   // No usage tracked yet

  const now = Date.now();
  const windowStart = now - limits.windowMs;

  // Count requests within the time window
  const requestsInWindow = usage.requests.filter(time => time >= windowStart).length;

  return requestsInWindow >= limits.maxRequests;
}

/**
 * Get rate limit status for a service
 * @param service - The service to check
 * @returns Object with rate limit status
 */
export function getRateLimitStatus(service: string): { 
  limited: boolean; 
  requestsInWindow: number; 
  maxRequests: number; 
  resetInMs?: number;
  usagePercentage: number;
} {
  const limits = RATE_LIMITS[service];
  if (!limits) {
    return { 
      limited: false, 
      requestsInWindow: 0, 
      maxRequests: 0, 
      usagePercentage: 0 
    };
  }

  const usage = apiUsage[service];
  if (!usage) {
    return { 
      limited: false, 
      requestsInWindow: 0, 
      maxRequests: limits.maxRequests, 
      usagePercentage: 0 
    };
  }

  const now = Date.now();
  const windowStart = now - limits.windowMs;

  // Count requests within the time window
  const requestsInWindow = usage.requests.filter(time => time >= windowStart).length;
  const limited = requestsInWindow >= limits.maxRequests;

  // Calculate when the rate limit will reset
  let resetInMs: number | undefined;
  if (limited && usage.requests.length > 0) {
    // Sort requests by timestamp (oldest first)
    const sortedRequests = [...usage.requests].sort((a, b) => a - b);
    // Find the oldest request that's still within the window
    const oldestInWindow = sortedRequests.find(time => time >= windowStart);
    if (oldestInWindow) {
      // Calculate when this request will fall out of the window
      resetInMs = oldestInWindow + limits.windowMs - now;
    }
  }

  return {
    limited,
    requestsInWindow,
    maxRequests: limits.maxRequests,
    resetInMs,
    usagePercentage: (requestsInWindow / limits.maxRequests) * 100
  };
}

/**
 * Track API usage for rate limiting
 * @param service - The service being used
 * @param isError - Whether the request resulted in an error
 */
export function trackApiUsage(service: string, isError: boolean = false): void {
  // Initialize usage tracking if needed
  if (!apiUsage[service]) {
    apiUsage[service] = {
      requests: [],
      errorCount: 0
    };
  }

  const usage = apiUsage[service];
  const now = Date.now();

  // Add the current request timestamp
  usage.requests.push(now);

  // Track errors if any
  if (isError) {
    usage.lastError = new Date();
    usage.errorCount++;
  }

  // Clean up old requests outside the largest time window
  // Find the largest time window among all services
  const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(limit => limit.windowMs));
  const cutoff = now - maxWindow;

  usage.requests = usage.requests.filter(time => time >= cutoff);
}

/**
 * Get an API key
 * @param keyName - The name of the API key to get
 * @returns The API key or null if not found
 */
export async function getApiKey(keyName: string): Promise<string | null> {
  // Check if the key is already in the cache
  if (keyCache[keyName]) {
    // Check if we're rate limited
    if (isRateLimited(keyName)) {
      console.warn(`[API_KEY_MANAGER] Rate limit exceeded for ${keyName}`);
      throw new Error(`Rate limit exceeded for ${keyName}`);
    }
    return keyCache[keyName];
  }

  // Get the key configuration
  const keyConfig = API_KEYS[keyName];
  if (!keyConfig) {
    console.error(`[API_KEY_MANAGER] No configuration found for key: ${keyName}`);
    return null;
  }

  // PRIORITY 1: Try to get the key from Supabase secrets
  if (keyConfig.secretName) {
    try {
      const secretValue = await fetchSecret(keyConfig.secretName);
      if (secretValue) {
        console.log(`[API_KEY_MANAGER] Retrieved ${keyName} key from Supabase secrets: ${maskApiKey(secretValue)}`);
        keyCache[keyName] = secretValue;
        return secretValue;
      }
    } catch (error) {
      console.error(`[API_KEY_MANAGER] Error fetching ${keyName} from Supabase secrets:`, error);
    }
  }

  // PRIORITY 2: Try to get the key from Vite environment variables
  if (keyConfig.envVariable && typeof import.meta !== 'undefined' && import.meta.env) {
    const envKey = import.meta.env[keyConfig.envVariable];
    if (envKey) {
      console.log(`[API_KEY_MANAGER] Using ${keyName} key from environment variables: ${maskApiKey(envKey)}`);
      keyCache[keyName] = envKey;
      return envKey;
    }
  }

  // PRIORITY 3: Try to get the key from local storage
  if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
    const storedKey = localStorage.getItem(keyConfig.storageKey);
    if (storedKey) {
      console.log(`[API_KEY_MANAGER] Using ${keyName} key from local storage: ${maskApiKey(storedKey)}`);
      keyCache[keyName] = storedKey;
      return storedKey;
    }
  }

  // PRIORITY 4: Try to fetch the key from the server
  if (keyConfig.fetchUrl) {
    try {
      const response = await fetch(keyConfig.fetchUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.key) {
          console.log(`[API_KEY_MANAGER] Retrieved ${keyName} key from API endpoint: ${maskApiKey(data.key)}`);
          keyCache[keyName] = data.key;

          // Store the key in local storage if possible
          if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(keyConfig.storageKey, data.key);
          }

          return data.key;
        }
      }
    } catch (error) {
      console.error(`[API_KEY_MANAGER] Error fetching key ${keyName}:`, error);
    }
  }

  // PRIORITY 5: Use the default value as a last resort (only in development)
  if (keyConfig.defaultValue && import.meta.env.DEV) {
    console.warn(`[API_KEY_MANAGER] Using default value for key: ${keyName} (development only)`);
    keyCache[keyName] = keyConfig.defaultValue;
    return keyConfig.defaultValue;
  }

  console.error(`[API_KEY_MANAGER] Could not get key: ${keyName}`);
  return null;
}

/**
 * Get an API key synchronously (from cache only)
 * @param keyName - The name of the API key to get
 * @returns The API key or null if not found in cache
 */
export function getApiKeySync(keyName: string): string | null {
  // Check if the key is already in the cache
  if (keyCache[keyName]) {
    // Check if we're rate limited
    if (isRateLimited(keyName)) {
      console.warn(`[API_KEY_MANAGER] Rate limit exceeded for ${keyName}`);
      return null; // Return null instead of throwing since this is a sync function
    }
    return keyCache[keyName];
  }

  // Get the key configuration
  const keyConfig = API_KEYS[keyName];
  if (!keyConfig) {
    console.error(`[API_KEY_MANAGER] No configuration found for key: ${keyName}`);
    return null;
  }

  // PRIORITY 1: Try to get the key from Vite environment variables
  if (keyConfig.envVariable && typeof import.meta !== 'undefined' && import.meta.env) {
    const envKey = import.meta.env[keyConfig.envVariable];
    if (envKey) {
      console.log(`[API_KEY_MANAGER] Using ${keyName} key from environment variables: ${maskApiKey(envKey)}`);
      keyCache[keyName] = envKey;
      return envKey;
    }
  }

  // PRIORITY 2: Try to get the key from local storage
  if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
    const storedKey = localStorage.getItem(keyConfig.storageKey);
    if (storedKey) {
      console.log(`[API_KEY_MANAGER] Using ${keyName} key from local storage: ${maskApiKey(storedKey)}`);
      keyCache[keyName] = storedKey;
      return storedKey;
    }
  }

  // PRIORITY 3: Use the default value as a last resort (only in development)
  if (keyConfig.defaultValue && import.meta.env.DEV) {
    console.warn(`[API_KEY_MANAGER] Using default value for key: ${keyName} (development only)`);
    keyCache[keyName] = keyConfig.defaultValue;
    return keyConfig.defaultValue;
  }

  // If we get here, we need to fetch the key asynchronously
  // This will happen on the next async call to getApiKey
  console.warn(`[API_KEY_MANAGER] Key ${keyName} not found in cache, will try to fetch asynchronously`);
  return null;
}

/**
 * Set an API key
 * @param keyName - The name of the API key to set
 * @param value - The value of the API key
 */
export function setApiKey(keyName: string, value: string): void {
  // Get the key configuration
  const keyConfig = API_KEYS[keyName];
  if (!keyConfig) {
    console.error(`[API_KEY_MANAGER] No configuration found for key: ${keyName}`);
    return;
  }

  // Set the key in the cache
  keyCache[keyName] = value;

  // Store the key in local storage if possible
  if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(keyConfig.storageKey, value);
  }

  console.log(`[API_KEY_MANAGER] Set ${keyName} key in cache and local storage`);
}

/**
 * Clear an API key from cache and storage
 * @param keyName - The name of the API key to clear
 */
export function clearApiKey(keyName: string): void {
  // Get the key configuration
  const keyConfig = API_KEYS[keyName];
  if (!keyConfig) {
    console.error(`[API_KEY_MANAGER] No configuration found for key: ${keyName}`);
    return;
  }

  // Remove the key from the cache
  delete keyCache[keyName];

  // Remove the key from local storage if possible
  if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(keyConfig.storageKey);
  }

  console.log(`[API_KEY_MANAGER] Cleared ${keyName} key from cache and local storage`);
}

/**
 * Initialize the API key manager
 * This function should be called when the application starts
 */
export async function initApiKeyManager(): Promise<void> {
  console.log('[API_KEY_MANAGER] Initializing API key manager...');

  try {
    // Import the secrets service
    const { fetchAllApiKeys } = await import('@/services/secretsService');

    // Try to fetch all API keys from Supabase first
    try {
      const apiKeys = await fetchAllApiKeys();
      if (Object.keys(apiKeys).length > 0) {
        console.log('[API_KEY_MANAGER] Successfully fetched API keys from Supabase');
      }
    } catch (error) {
      console.error('[API_KEY_MANAGER] Error fetching API keys from Supabase:', error);
    }
  } catch (error) {
    console.warn('[API_KEY_MANAGER] Secrets service not available:', error);
  }

  // Pre-fetch all API keys using all available methods
  const keyPromises = Object.keys(API_KEYS).map(keyName => getApiKey(keyName));
  await Promise.all(keyPromises);

  console.log('[API_KEY_MANAGER] Initialized with keys:', Object.keys(keyCache).join(', '));
}

/**
 * Get all available API keys
 * @returns Object containing all available API keys
 */
export function getAllApiKeys(): Record<string, string> {
  return { ...keyCache };
}

/**
 * Check if an API key is available
 * @param keyName - The name of the API key to check
 * @returns True if the key is available, false otherwise
 */
export function isApiKeyAvailable(keyName: string): boolean {
  return !!keyCache[keyName] && !isRateLimited(keyName);
}
