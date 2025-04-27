import { getApiKey } from './env';

// Types for API key management
interface KeyUsageStats {
  requests: number;
  lastUsed: Date;
  errors: number;
}

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

// In-memory storage for key usage statistics
const keyUsageStats = new Map<string, KeyUsageStats>();

/**
 * API Key Manager class for handling API key operations
 */
class ApiKeyManager {
  private static instance: ApiKeyManager;
  private readonly usageThresholds: Map<string, number>;

  private constructor() {
    // Initialize usage thresholds for rate limiting
    this.usageThresholds = new Map([
      ['ticketmaster', 5000], // Example: 5000 requests per day
      ['predicthq', 10000],   // Example: 10000 requests per day
      ['serpapi', 1000],      // Example: 1000 requests per day
      ['mapbox', 50000]       // Example: 50000 requests per day
    ]);
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
   * Validate an API key format for a specific service
   */
  public isValidKeyFormat(service: string, key: string): boolean {
    const rules = validationRules[service.toLowerCase()];
    if (!rules) {
      throw new Error(`No validation rules defined for service: ${service}`);
    }

    return (
      rules.format.test(key) &&
      key.length >= rules.minLength &&
      key.length <= rules.maxLength
    );
  }

  /**
   * Get an active API key for a service with validation
   */
  public getActiveKey(service: string): string {
    const serviceLower = service.toLowerCase();
    const key = getApiKey(serviceLower);

    if (!this.isValidKeyFormat(serviceLower, key)) {
      throw new Error(`Invalid API key format for service: ${service}`);
    }

    if (this.isRateLimitExceeded(serviceLower)) {
      throw new Error(`Rate limit exceeded for service: ${service}`);
    }

    return key;
  }

  /**
   * Track API key usage
   */
  public trackKeyUsage(service: string, error: boolean = false): void {
    const stats = keyUsageStats.get(service) || {
      requests: 0,
      lastUsed: new Date(),
      errors: 0
    };

    stats.requests++;
    stats.lastUsed = new Date();
    if (error) {
      stats.errors++;
    }

    keyUsageStats.set(service, stats);
  }

  /**
   * Check if rate limit is exceeded for a service
   */
  private isRateLimitExceeded(service: string): boolean {
    const stats = keyUsageStats.get(service);
    if (!stats) return false;

    const threshold = this.usageThresholds.get(service);
    if (!threshold) return false;

    // Check if requests exceed threshold in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return stats.lastUsed > oneDayAgo && stats.requests >= threshold;
  }

  /**
   * Get usage statistics for a service
   */
  public getUsageStats(service: string): KeyUsageStats | undefined {
    return keyUsageStats.get(service);
  }

  /**
   * Reset usage statistics for a service
   */
  public resetUsageStats(service: string): void {
    keyUsageStats.delete(service);
  }

  /**
   * Mask an API key for logging purposes
   */
  public maskKey(key: string): string {
    if (key.length <= 8) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }
}

// Export singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();