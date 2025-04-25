import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  // Required API keys
  TICKETMASTER_KEY: z.string().min(1, 'Ticketmaster API key is required'),
  PREDICTHQ_API_KEY: z.string().min(1, 'PredictHQ API key is required'),
  
  // Optional API keys
  SERPAPI_KEY: z.string().optional(),
  MAPBOX_TOKEN: z.string().optional(),
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
      TICKETMASTER_KEY: process.env.TICKETMASTER_KEY,
      PREDICTHQ_API_KEY: process.env.PREDICTHQ_API_KEY,
      SERPAPI_KEY: process.env.SERPAPI_KEY,
      MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
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
 * Gets an API key by service name
 * @param service The service name (e.g., 'ticketmaster', 'predicthq')
 * @returns The API key for the specified service
 * @throws {Error} If the service is not found or the key is not configured
 */
export function getApiKey(service: string): string {
  const config = loadEnvConfig();
  
  switch (service.toLowerCase()) {
    case 'ticketmaster':
      return config.TICKETMASTER_KEY;
    case 'predicthq':
      return config.PREDICTHQ_API_KEY;
    case 'serpapi':
      if (!config.SERPAPI_KEY) {
        throw new Error('SerpAPI key is not configured');
      }
      return config.SERPAPI_KEY;
    case 'mapbox':
      if (!config.MAPBOX_TOKEN) {
        throw new Error('Mapbox token is not configured');
      }
      return config.MAPBOX_TOKEN;
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