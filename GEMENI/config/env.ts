import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  // API keys - all made optional with default values for development
  VITE_TICKETMASTER_KEY: z.string().optional().default('mock-ticketmaster-key'),
  VITE_PREDICTHQ_API_KEY: z.string().optional().default('mock-predicthq-key'),
  VITE_RAPIDAPI_KEY: z.string().optional().default('mock-rapidapi-key'),
  VITE_RAPIDAPI_EVENTS_ENDPOINT: z.string().optional().default('https://example.com/api'),

  // Optional API keys
  VITE_SERPAPI_KEY: z.string().optional(),
  VITE_MAPBOX_TOKEN: z.string().optional(),
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
      VITE_TICKETMASTER_KEY: import.meta.env.VITE_TICKETMASTER_KEY,
      VITE_PREDICTHQ_API_KEY: import.meta.env.VITE_PREDICTHQ_API_KEY,
      VITE_RAPIDAPI_KEY: import.meta.env.VITE_RAPIDAPI_KEY, // Added RapidAPI Key
      VITE_RAPIDAPI_EVENTS_ENDPOINT: import.meta.env.VITE_RAPIDAPI_EVENTS_ENDPOINT, // Added RapidAPI Events Endpoint
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

/**
 * Gets an API key or endpoint by service name
 * @param service The service name (e.g., 'ticketmaster', 'predicthq', 'rapidapi-key', 'rapidapi-events-endpoint')
 * @returns The value for the specified service
 * @throws {Error} If the service is not found or the value is not configured
 */
export function getApiKey(service: string): string {
  const config = loadEnvConfig();

  // Add debug logging
  console.log(`[ENV] Getting API key for service: ${service}`);

  switch (service.toLowerCase()) {
    case 'ticketmaster':
      return config.VITE_TICKETMASTER_KEY;
    case 'predicthq':
      return config.VITE_PREDICTHQ_API_KEY;
    case 'rapidapi-key': // Added case for RapidAPI Key
      console.log(`[ENV] RapidAPI key found: ${config.VITE_RAPIDAPI_KEY ? 'Yes' : 'No'}`);
      return config.VITE_RAPIDAPI_KEY;
    case 'rapidapi-events-endpoint': // Added case for RapidAPI Events Endpoint
      console.log(`[ENV] RapidAPI endpoint found: ${config.VITE_RAPIDAPI_EVENTS_ENDPOINT ? 'Yes' : 'No'}`);
      return config.VITE_RAPIDAPI_EVENTS_ENDPOINT;
    case 'serpapi':
      if (!config.VITE_SERPAPI_KEY) {
        throw new Error('SerpAPI key is not configured');
      }
      return config.VITE_SERPAPI_KEY;
    case 'mapbox':
      // Return the token from .env file or use the default Mapbox token
      return config.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    default:
      throw new Error(`Unknown service: ${service}`);
  }
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