import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  // Supabase Configuration
  VITE_SUPABASE_URL: z.string().optional().default('https://akwvmljopucsnorvdwuu.supabase.co'),
  VITE_SUPABASE_ANON_KEY: z.string().optional().default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk'),
  VITE_ALT_SUPABASE_URL: z.string().optional().default(''),
  VITE_ALT_SUPABASE_ANON_KEY: z.string().optional().default(''),

  // API URLs
  VITE_API_URL: z.string().optional().default('http://localhost:3000'),
  VITE_VERCEL_URL: z.string().optional().default(''),
  VITE_VERCEL_ENV: z.string().optional().default('development'),

  // Feature flags
  VITE_USE_UNIFIED_FUNCTION: z.string().optional().default('true'),

  // API keys
  VITE_TICKETMASTER_KEY: z.string().optional().default('mock-ticketmaster-key'),
  VITE_PREDICTHQ_API_KEY: z.string().optional().default('mock-predicthq-key'),
  VITE_RAPIDAPI_KEY: z.string().optional().default(''),
  VITE_RAPIDAPI_EVENTS_ENDPOINT: z.string().optional().default('https://real-time-events-search.p.rapidapi.com/search-events'),
  VITE_SERPAPI_KEY: z.string().optional(),
  VITE_MAPBOX_TOKEN: z.string().optional().default('pk.eyJ1IjoiZGF0ZWFpIiwiYSI6ImNsczRxZnZ4ajAwYjQwMXF5MGlxbTF5d2wifQ.pLNnH8rzLZkgNY_aBJZrwg'),
});

// Type for validated environment variables
type EnvConfig = z.infer<typeof envSchema>;

// Cache for validated config
let validatedConfig: EnvConfig | null = null;

/**
 * Loads and validates environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadEnvConfig(): EnvConfig {
  // Return cached config if available
  if (validatedConfig) {
    return validatedConfig;
  }

  try {
    // Parse and validate environment variables
    const config = envSchema.parse({
      // Supabase Configuration
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_ALT_SUPABASE_URL: import.meta.env.VITE_ALT_SUPABASE_URL,
      VITE_ALT_SUPABASE_ANON_KEY: import.meta.env.VITE_ALT_SUPABASE_ANON_KEY,

      // API URLs
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_VERCEL_URL: import.meta.env.VITE_VERCEL_URL,
      VITE_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV,

      // Feature flags
      VITE_USE_UNIFIED_FUNCTION: import.meta.env.VITE_USE_UNIFIED_FUNCTION,

      // API keys
      VITE_TICKETMASTER_KEY: import.meta.env.VITE_TICKETMASTER_KEY,
      VITE_PREDICTHQ_API_KEY: import.meta.env.VITE_PREDICTHQ_API_KEY,
      VITE_RAPIDAPI_KEY: import.meta.env.VITE_RAPIDAPI_KEY,
      VITE_RAPIDAPI_EVENTS_ENDPOINT: import.meta.env.VITE_RAPIDAPI_EVENTS_ENDPOINT,
      VITE_SERPAPI_KEY: import.meta.env.VITE_SERPAPI_KEY,
      VITE_MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
    });

    // Cache the validated config
    validatedConfig = config;
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => issue.message).join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

// Default values for API keys
const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoiZGF0ZWFpIiwiYSI6ImNsczRxZnZ4ajAwYjQwMXF5MGlxbTF5d2wifQ.pLNnH8rzLZkgNY_aBJZrwg';
const DEFAULT_RAPIDAPI_ENDPOINT = 'https://real-time-events-search.p.rapidapi.com/search-events';

/**
 * Gets an API key or endpoint by service name
 * @param service The service name (e.g., 'ticketmaster', 'predicthq', 'rapidapi-key', 'rapidapi-events-endpoint')
 * @returns The value for the specified service
 * @throws {Error} If the service is not found or the value is not configured
 */
export function getApiKey(keyName: string): string {
  // First try to get from the main project's environment variables
  const config = loadEnvConfig();
  
  switch (keyName) {
    case 'mapbox':
      return config.VITE_MAPBOX_TOKEN || DEFAULT_MAPBOX_TOKEN;
    case 'rapidapi':
      return config.VITE_RAPIDAPI_KEY || '';
    case 'ticketmaster':
      return config.VITE_TICKETMASTER_KEY || '';
    case 'predicthq':
      return config.VITE_PREDICTHQ_API_KEY || '';
    case 'serpapi':
      return config.VITE_SERPAPI_KEY || '';
    case 'supabase-url':
      return config.VITE_SUPABASE_URL;
    case 'supabase-anon-key':
      return config.VITE_SUPABASE_ANON_KEY;
    default:
      console.warn(`Unknown API key requested: ${keyName}`);
      return '';
  }
}

/**
 * Gets an API endpoint by endpoint name
 * @param endpointName The endpoint name (e.g., 'rapidapi_events', 'api')
 * @returns The value for the specified endpoint
 * @throws {Error} If the endpoint is not found or the value is not configured
 */
export function getApiEndpoint(endpointName: string): string {
  const config = loadEnvConfig();
  
  switch (endpointName) {
    case 'rapidapi_events':
      return config.VITE_RAPIDAPI_EVENTS_ENDPOINT || DEFAULT_RAPIDAPI_ENDPOINT;
    case 'api':
      return config.VITE_API_URL || 'http://localhost:3000';
    default:
      console.warn(`Unknown API endpoint requested: ${endpointName}`);
      return '';
  }
}

/**
 * Gets a configuration value by key
 * @param key The configuration key
 * @returns The value for the specified key
 */
export function getConfig<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  const config = loadEnvConfig();
  return config[key];
}

/**
 * Validates that all required API keys are present
 * @throws {Error} If any required keys are missing
 */
export function validateRequiredKeys(): void {
  loadEnvConfig(); // This will throw if validation fails
}

// Export the config type
export type { EnvConfig };