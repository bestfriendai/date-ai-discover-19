import {
  ApiKeyError,
  MissingApiKeyError,
  InvalidApiKeyError,
  RateLimitExceededError,
  ValidationRulesNotFoundError
} from './errors.ts';
import {
  logApiKeyUsage,
  getServiceMetrics,
  getServiceHealth,
  resetMetrics
} from './logger.ts';

// Types for API key management
interface KeyValidationRules {
  format: RegExp;
  minLength: number;
  maxLength: number;
}

// Validation rules for different services
const validationRules: Record<string, KeyValidationRules> = {
  ticketmaster: {
    format: /^[A-Za-z0-9_-]+$/,
    minLength: 20,
    maxLength: 50
  },
  predicthq: {
    format: /^[A-Za-z0-9_-]+$/,
    minLength: 32,
    maxLength: 64
  },
  seatgeek: {
    format: /^[A-Za-z0-9_-]+$/,
    minLength: 16,
    maxLength: 64
  },
  rapidapi: {
    format: /^[A-Za-z0-9_-]+$/,
    minLength: 25,
    maxLength: 50
  },
  mapbox: {
    format: /^pk\.[A-Za-z0-9_-]+$/,
    minLength: 50,
    maxLength: 100
  }
};

/**
 * API Key Manager class for handling API key operations
 */
class ApiKeyManager {
  private static instance: ApiKeyManager;
  private readonly usageThresholds: Map<string, number>;
  private readonly requestStartTimes: Map<string, number>;

  private constructor() {
    // Initialize usage thresholds for rate limiting
    this.usageThresholds = new Map([
      ['ticketmaster', 5000], // Example: 5000 requests per day
      ['predicthq', 10000],   // Example: 10000 requests per day
      ['seatgeek', 5000],     // Example: 5000 requests per day
      ['mapbox', 50000]       // Example: 50000 requests per day
    ]);
    this.requestStartTimes = new Map();
  }

  /**
   * Get the singleton instance of ApiKeyManager
   */
  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * Start timing a request for response time tracking
   */
  private startRequest(service: string): void {
    this.requestStartTimes.set(service, Date.now());
  }

  /**
   * End timing a request and log the usage
   */
  private endRequest(service: string, status: 'success' | 'error', details?: Record<string, unknown>): void {
    const startTime = this.requestStartTimes.get(service) || Date.now();
    const responseTime = Date.now() - startTime;
    this.requestStartTimes.delete(service);

    logApiKeyUsage(service, 'api_request', status, responseTime, {
      ...details,
      health: getServiceHealth(service)
    });
  }

  /**
   * Validate an API key format for a specific service
   */
  public isValidKeyFormat(service: string, key: string): boolean {
    const rules = validationRules[service.toLowerCase()];
    if (!rules) {
      throw new ValidationRulesNotFoundError(service);
    }

    // Add detailed logging for key validation
    console.log(`[API_KEY_MANAGER] Validating ${service} key format`);
    console.log(`[API_KEY_MANAGER] Key length: ${key.length}, required min: ${rules.minLength}, max: ${rules.maxLength}`);
    
    // Check for placeholder or example keys
    if (key === 'your_ticketmaster_key_here' ||
        key === 'your_predicthq_key_here' ||
        key.includes('example') ||
        key.includes('placeholder')) {
      console.error(`[API_KEY_MANAGER] ${service} key validation failed: using placeholder or example key`);
      throw new InvalidApiKeyError(service, 'using placeholder or example key');
    }

    // For Ticketmaster, be more lenient with validation
    if (service.toLowerCase() === 'ticketmaster') {
      // Just check that it's not too short and has valid characters
      const isValid = rules.format.test(key) && key.length >= 10;
      
      if (!isValid) {
        const details = key.length < 10 ? 'too short' : 'invalid characters';
        console.error(`[API_KEY_MANAGER] Ticketmaster key validation failed: ${details}`);
        throw new InvalidApiKeyError(service, details);
      }
      
      console.log(`[API_KEY_MANAGER] Ticketmaster key validation passed`);
      return true;
    }

    // For other services, use the standard validation
    const isValid = rules.format.test(key) &&
      key.length >= rules.minLength &&
      key.length <= rules.maxLength;

    // Add detailed validation logging
    if (service.toLowerCase() === 'rapidapi') {
      console.log(`[API_KEY_MANAGER] RapidAPI key validation details:`);
      console.log(`[API_KEY_MANAGER] - Format check: ${rules.format.test(key)}`);
      console.log(`[API_KEY_MANAGER] - Length check: ${key.length >= rules.minLength && key.length <= rules.maxLength}`);
      console.log(`[API_KEY_MANAGER] - Overall validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    }

    if (!isValid) {
      const details = key.length < rules.minLength ? 'too short' :
        key.length > rules.maxLength ? 'too long' :
        'invalid characters';
      console.error(`[API_KEY_MANAGER] ${service} key validation failed: ${details}`);
      throw new InvalidApiKeyError(service, details);
    }

    console.log(`[API_KEY_MANAGER] ${service} key validation passed`);
    return true;
  }

  /**
   * Get an active API key for a service with validation
   */
  public getActiveKey(service: string): string {
    const serviceLower = service.toLowerCase();
    this.startRequest(serviceLower);

    try {
      // Get the key from environment variables
      // @ts-ignore: Deno is available at runtime
      let key;

      // Handle different naming conventions for different services
      if (serviceLower === 'predicthq') {
        // Try multiple possible environment variable names for PredictHQ
        // @ts-ignore: Deno is available at runtime
        key = Deno.env.get('PREDICTHQ_API_KEY') || Deno.env.get('PREDICTHQ_KEY') || Deno.env.get('PHQ_API_KEY');
        console.log('[API_KEY_MANAGER] PredictHQ key retrieval result:', key ? 'Found' : 'Not found');
      } else if (serviceLower === 'ticketmaster') {
        // Try all possible environment variable names for Ticketmaster
        // Enhanced logging for debugging
        console.log('[API_KEY_MANAGER] Ticketmaster key retrieval attempt');
        
        // Check all possible environment variable names
        // @ts-ignore: Deno is available at runtime
        const possibleKeys = {
          'SUPABASE_TICKETMASTER_KEY': Deno.env.get('SUPABASE_TICKETMASTER_KEY'),
          'TICKETMASTER_KEY': Deno.env.get('TICKETMASTER_KEY'),
          'TICKETMASTER_API_KEY': Deno.env.get('TICKETMASTER_API_KEY'),
          'TM_API_KEY': Deno.env.get('TM_API_KEY')
        };
        
        // Log which keys are available (without revealing their values)
        for (const [keyName, keyValue] of Object.entries(possibleKeys)) {
          console.log(`[API_KEY_MANAGER] ${keyName} exists:`, !!keyValue);
        }
        
        // Try each key in order of preference
        // @ts-ignore: Deno is available at runtime
        key = possibleKeys['SUPABASE_TICKETMASTER_KEY'] || 
              possibleKeys['TICKETMASTER_KEY'] || 
              possibleKeys['TICKETMASTER_API_KEY'] || 
              possibleKeys['TM_API_KEY'];
              
        console.log('[API_KEY_MANAGER] Retrieved Ticketmaster key:', key ? 'Found (length: ' + key.length + ')' : 'Not found');
        
        if (!key) {
          // Last resort - check for any environment variable containing 'TICKETMASTER' and 'KEY'
          // @ts-ignore: Deno is available at runtime
          const allEnvVars = Deno.env.toObject();
          for (const [envName, envValue] of Object.entries(allEnvVars)) {
            if (envName.toUpperCase().includes('TICKET') && envName.toUpperCase().includes('KEY') && envValue) {
              console.log(`[API_KEY_MANAGER] Found alternative key in environment variable: ${envName}`);
              key = envValue;
              break;
            }
          }
        }
      } else if (serviceLower === 'mapbox') {
        key = Deno.env.get('MAPBOX_TOKEN');
      } else if (serviceLower === 'rapidapi') {
        // Try multiple possible environment variable names for RapidAPI
        // @ts-ignore: Deno is available at runtime
        const possibleKeys = {
          'RAPIDAPI_KEY': Deno.env.get('RAPIDAPI_KEY'),
          'REAL_TIME_EVENTS_API_KEY': Deno.env.get('REAL_TIME_EVENTS_API_KEY'),
          'X_RAPIDAPI_KEY': Deno.env.get('X_RAPIDAPI_KEY')
        };
        
        // Log which keys are available (without revealing their values)
        console.log('[API_KEY_MANAGER] Checking RapidAPI key environment variables:');
        for (const [keyName, keyValue] of Object.entries(possibleKeys)) {
          console.log(`[API_KEY_MANAGER] - ${keyName} exists: ${!!keyValue}`);
        }
        
        // Try each key in order of preference
        key = possibleKeys['RAPIDAPI_KEY'] ||
              possibleKeys['REAL_TIME_EVENTS_API_KEY'] ||
              possibleKeys['X_RAPIDAPI_KEY'];
              
        console.log('[API_KEY_MANAGER] RapidAPI key retrieval result:', key ? `Found (length: ${key.length})` : 'Not found');
      } else {
        // Fallback to standard naming convention
        key = Deno.env.get(`${serviceLower.toUpperCase()}_KEY`);
      }

      console.log(`[API_KEY_MANAGER] Looking for ${serviceLower} key with env var:`,
        serviceLower === 'predicthq' ? 'PREDICTHQ_API_KEY' :
        serviceLower === 'ticketmaster' ? 'TICKETMASTER_KEY' :
        serviceLower === 'mapbox' ? 'MAPBOX_TOKEN' :
        `${serviceLower.toUpperCase()}_KEY`
      );
      if (!key) {
        throw new MissingApiKeyError(service);
      }

      // Validate key format
      try {
        this.isValidKeyFormat(serviceLower, key);
      } catch (error) {
        if (error instanceof ValidationRulesNotFoundError) {
          throw error;
        }
        throw new InvalidApiKeyError(service, error instanceof Error ? error.message : undefined);
      }

      // Check rate limit
      const threshold = this.usageThresholds.get(serviceLower);
      if (this.isRateLimitExceeded(serviceLower) && threshold) {
        throw new RateLimitExceededError(service, threshold);
      }

      // Log successful key retrieval
      this.endRequest(serviceLower, 'success', {
        keyLength: key.length,
        maskedKey: this.maskKey(key)
      });

      return key;
    } catch (error) {
      // Log failed key retrieval
      this.endRequest(serviceLower, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'UnknownError'
      });
      throw error;
    }
  }

  /**
   * Check if rate limit is exceeded for a service
   */
  private isRateLimitExceeded(service: string): boolean {
    const metrics = getServiceMetrics(service);
    if (!metrics) return false;

    const threshold = this.usageThresholds.get(service);
    if (!threshold) return false;

    // Check if requests exceed threshold in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isExceeded = metrics.lastUsed > oneDayAgo && metrics.requests >= threshold;

    if (isExceeded) {
      console.warn(`[API_KEY_MANAGER] Rate limit exceeded for ${service}:`, {
        requests: metrics.requests,
        threshold,
        lastUsed: metrics.lastUsed.toISOString()
      });
    }

    return isExceeded;
  }

  /**
   * Get usage statistics for a service
   */
  public getUsageStats(service: string): Record<string, unknown> {
    const metrics = getServiceMetrics(service);
    const health = getServiceHealth(service);

    return {
      ...metrics,
      health: health.status,
      healthDetails: health.details,
      threshold: this.usageThresholds.get(service)
    };
  }

  /**
   * Reset usage statistics for a service
   */
  public resetUsageStats(service: string): void {
    resetMetrics(service);
    console.log(`[API_KEY_MANAGER] Usage stats reset for ${service}`);
  }

  /**
   * Mask an API key for logging purposes
   */
  public maskKey(key: string): string {
    if (!key || key.length <= 8) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }
}

// Export singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();