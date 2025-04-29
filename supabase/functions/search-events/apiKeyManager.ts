// supabase/functions/search-events/apiKeyManager.ts (Ensure rapidapi part is correct)
import {
  // ... other errors
  ValidationRulesNotFoundError,
  InvalidApiKeyError, // Make sure this is imported
  MissingApiKeyError, // Make sure this is imported
  ApiKeyError // Ensure base class is imported if used directly
} from './errors.ts';
// ... other imports

interface KeyValidationRules {
  format: RegExp;
  minLength: number;
  maxLength: number;
}

const validationRules: Record<string, KeyValidationRules> = {
  rapidapi: {
    format: /^[A-Za-z0-9_-]+$/, // Standard RapidAPI key format
    minLength: 40,             // Typical length
    maxLength: 60              // Allow some variation
  },
  // Remove rules for ticketmaster, predicthq, seatgeek, mapbox if not used elsewhere
};

class ApiKeyManager {
  private static instance: ApiKeyManager;
  private usageStats: Map<string, { count: number; errors: number; lastUsed: number }> = new Map(); // Added for usage tracking if needed

  // Private constructor for Singleton
  private constructor() {
    console.log('[API_KEY_MANAGER] Initialized.');
  }

  // Get Singleton instance
  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }


  public isValidKeyFormat(service: string, key: string): boolean {
    const serviceLower = service.toLowerCase();
    const rules = validationRules[serviceLower];
    if (!rules) {
      throw new ValidationRulesNotFoundError(service);
    }
    console.log(`[API_KEY_MANAGER] Validating ${serviceLower} key format. Length: ${key.length}`);

     // Basic checks first
    if (!key || typeof key !== 'string') {
        console.error(`[API_KEY_MANAGER] ${serviceLower} key validation failed: Key is not a string or is empty.`);
        throw new InvalidApiKeyError(serviceLower, 'Key is not a string or is empty');
    }
    if (key.includes('placeholder') || key.includes('example') || key.includes('YOUR_') || key.includes('_KEY')) {
       console.error(`[API_KEY_MANAGER] ${serviceLower} key validation failed: Key appears to be a placeholder.`);
       throw new InvalidApiKeyError(serviceLower, 'Key is a placeholder');
    }


    const isValid = rules.format.test(key) &&
      key.length >= rules.minLength &&
      key.length <= rules.maxLength;

    if (!isValid) {
      const details = key.length < rules.minLength ? 'too short' :
        key.length > rules.maxLength ? 'too long' :
        'invalid characters';
      console.error(`[API_KEY_MANAGER] ${serviceLower} key validation failed: ${details}`);
      throw new InvalidApiKeyError(serviceLower, `Format/Length validation failed (${details})`);
    }

    console.log(`[API_KEY_MANAGER] ${serviceLower} key validation passed.`);
    return true;
  }

  public getActiveKey(service: string): string {
    const serviceLower = service.toLowerCase();
    this.startRequest(serviceLower); // Track usage start

    try {
      let key: string | undefined;

      if (serviceLower === 'rapidapi') {
        // Try multiple possible environment variable names for RapidAPI
        // @ts-ignore: Deno is available at runtime
        key = Deno.env.get('RAPIDAPI_KEY') ||
              // @ts-ignore: Deno is available at runtime
              Deno.env.get('REAL_TIME_EVENTS_API_KEY') ||
              // @ts-ignore: Deno is available at runtime
              Deno.env.get('X_RAPIDAPI_KEY');

        console.log('[API_KEY_MANAGER] RapidAPI key retrieval attempt. Found:', !!key);
      } else {
         // @ts-ignore: Deno is available at runtime
         key = Deno.env.get(`${serviceLower.toUpperCase()}_KEY`);
         console.log(`[API_KEY_MANAGER] Retrieval attempt for ${serviceLower}. Found:`, !!key);
      }


      if (!key) {
        console.error(`[API_KEY_MANAGER] MissingApiKeyError for service: ${serviceLower}`);
        throw new MissingApiKeyError(serviceLower);
      }

      // Validate key format *after* retrieving it
      this.isValidKeyFormat(serviceLower, key); // This will throw InvalidApiKeyError if invalid

      // Log success
      this.endRequest(serviceLower, 'success', { maskedKey: this.maskKey(key) });
       console.log(`[API_KEY_MANAGER] Successfully retrieved and validated key for ${serviceLower}`);

      return key;
    } catch (error) {
      // Log failure
      this.endRequest(serviceLower, 'error', { error: error.message });
       console.error(`[API_KEY_MANAGER] Failed to get active key for ${serviceLower}:`, error.message);
      throw error; // Re-throw the original error (MissingApiKeyError, InvalidApiKeyError, etc.)
    }
  }

  // Track request start
  private startRequest(service: string): void {
    if (!this.usageStats.has(service)) {
      this.usageStats.set(service, { count: 0, errors: 0, lastUsed: 0 });
    }
  }

  // Track request end (success or error)
  private endRequest(service: string, status: 'success' | 'error', _details: any = {}): void {
    const stats = this.usageStats.get(service);
    if (stats) {
      stats.count++;
      stats.lastUsed = Date.now();
      if (status === 'error') {
        stats.errors++;
      }
      // console.log(`[API_KEY_MANAGER] Usage updated for ${service}:`, stats, 'Details:', _details);
    }
  }

  // Get usage stats for a service
  public getUsageStats(service: string): { count: number; errors: number; lastUsed: number } | null {
    return this.usageStats.get(service.toLowerCase()) || null;
  }


  // ... (maskKey method can remain) ...
  public maskKey(key: string): string {
    if (!key || key.length <= 8) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }
}

export const apiKeyManager = ApiKeyManager.getInstance();