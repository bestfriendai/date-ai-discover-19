/**
 * API Key Manager
 * 
 * This utility provides a secure way to manage API keys in the client-side application.
 * It uses a combination of environment variables, local storage, and runtime fetching
 * to provide API keys while keeping them as secure as possible in a client-side context.
 */

// Interface for API key configuration
interface ApiKeyConfig {
  name: string;
  envVariable?: string;
  storageKey?: string;
  fetchUrl?: string;
  defaultValue?: string;
}

// API key configurations
const API_KEYS: Record<string, ApiKeyConfig> = {
  rapidapi: {
    name: 'RapidAPI',
    envVariable: 'RAPIDAPI_KEY',
    storageKey: 'dateai_rapidapi_key',
    // In a real application, this would be a secure endpoint that returns the API key
    fetchUrl: '/api/keys/rapidapi',
    // Updated key - ensure this matches the key used in Supabase functions
    defaultValue: '92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9'
  }
};

// Cache for API keys
const keyCache: Record<string, string> = {};

/**
 * Get an API key
 * @param keyName - The name of the API key to get
 * @returns The API key or null if not found
 */
export async function getApiKey(keyName: string): Promise<string | null> {
  // Check if the key is already in the cache
  if (keyCache[keyName]) {
    return keyCache[keyName];
  }
  
  // Get the key configuration
  const keyConfig = API_KEYS[keyName];
  if (!keyConfig) {
    console.error(`[API_KEY_MANAGER] No configuration found for key: ${keyName}`);
    return null;
  }
  
  // Try to get the key from environment variables
  if (keyConfig.envVariable && typeof process !== 'undefined' && process.env) {
    // Try multiple environment variable names for RapidAPI
    let envKey = null;
    if (keyName === 'rapidapi') {
      envKey = process.env[keyConfig.envVariable] ||
               process.env['REAL_TIME_EVENTS_API_KEY'] ||
               process.env['X_RAPIDAPI_KEY'];
    } else {
      envKey = process.env[keyConfig.envVariable];
    }
    
    if (envKey) {
      keyCache[keyName] = envKey;
      return envKey;
    }
  }
  
  // Try to get the key from local storage
  if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
    const storedKey = localStorage.getItem(keyConfig.storageKey);
    if (storedKey) {
      keyCache[keyName] = storedKey;
      return storedKey;
    }
  }
  
  // Try to fetch the key from the server
  if (keyConfig.fetchUrl) {
    try {
      const response = await fetch(keyConfig.fetchUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.key) {
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
  
  // Use the default value as a last resort
  if (keyConfig.defaultValue) {
    console.warn(`[API_KEY_MANAGER] Using default value for key: ${keyName}`);
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
    return keyCache[keyName];
  }
  
  // Get the key configuration
  const keyConfig = API_KEYS[keyName];
  if (!keyConfig) {
    console.error(`[API_KEY_MANAGER] No configuration found for key: ${keyName}`);
    return null;
  }
  
  // Try to get the key from environment variables
  if (keyConfig.envVariable && typeof process !== 'undefined' && process.env) {
    // Try multiple environment variable names for RapidAPI
    let envKey = null;
    if (keyName === 'rapidapi') {
      envKey = process.env[keyConfig.envVariable] ||
               process.env['REAL_TIME_EVENTS_API_KEY'] ||
               process.env['X_RAPIDAPI_KEY'];
    } else {
      envKey = process.env[keyConfig.envVariable];
    }
    
    if (envKey) {
      keyCache[keyName] = envKey;
      return envKey;
    }
  }
  
  // Try to get the key from local storage
  if (keyConfig.storageKey && typeof window !== 'undefined' && window.localStorage) {
    const storedKey = localStorage.getItem(keyConfig.storageKey);
    if (storedKey) {
      keyCache[keyName] = storedKey;
      return storedKey;
    }
  }
  
  // Use the default value as a last resort
  if (keyConfig.defaultValue) {
    console.warn(`[API_KEY_MANAGER] Using default value for key: ${keyName}`);
    keyCache[keyName] = keyConfig.defaultValue;
    return keyConfig.defaultValue;
  }
  
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
}

/**
 * Initialize the API key manager
 * This function should be called when the application starts
 */
export async function initApiKeyManager(): Promise<void> {
  // Pre-fetch all API keys
  const keyPromises = Object.keys(API_KEYS).map(keyName => getApiKey(keyName));
  await Promise.all(keyPromises);
  
  console.log('[API_KEY_MANAGER] Initialized with keys:', Object.keys(keyCache).join(', '));
}
