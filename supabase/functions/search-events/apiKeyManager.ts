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
    format: /^[A-Za-z0-9]+$/,
    minLength: 32,
    maxLength: 32
  },
  predicthq: {
    format: /^[A-Za-z0-9_-]+$/,
    minLength: 32,
    maxLength: 64
  },
  serpapi: {
    format: /^[a-z0-9]+$/,
    minLength: 20,
    maxLength: 64
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
      ['serpapi', 1000],      // Example: 1000 requests per day
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

    const isValid = rules.format.test(key) &&
      key.length >= rules.minLength &&
      key.length <= rules.maxLength;

    if (!isValid) {
      const details = key.length < rules.minLength ? 'too short' :
        key.length > rules.maxLength ? 'too long' :
        'invalid characters';
      throw new InvalidApiKeyError(service, details);
    }

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
        key = Deno.env.get('PREDICTHQ_API_KEY');
      } else if (serviceLower === 'ticketmaster') {
        key = Deno.env.get('TICKETMASTER_KEY');
      } else if (serviceLower === 'serpapi') {
        key = Deno.env.get('SERPAPI_KEY');
      } else if (serviceLower === 'eventbrite') {
        key = Deno.env.get('EVENTBRITE_API_KEY') || Deno.env.get('EVENTBRITE_TOKEN');
      } else if (serviceLower === 'mapbox') {
        key = Deno.env.get('MAPBOX_TOKEN');
      } else {
        // Fallback to standard naming convention
        key = Deno.env.get(`${serviceLower.toUpperCase()}_KEY`);
      }

      console.log(`[API_KEY_MANAGER] Looking for ${serviceLower} key with env var:`,
        serviceLower === 'predicthq' ? 'PREDICTHQ_API_KEY' :
        serviceLower === 'ticketmaster' ? 'TICKETMASTER_KEY' :
        serviceLower === 'serpapi' ? 'SERPAPI_KEY' :
        serviceLower === 'eventbrite' ? 'EVENTBRITE_API_KEY or EVENTBRITE_TOKEN' :
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