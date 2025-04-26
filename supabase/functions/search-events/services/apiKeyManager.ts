/**
 * API Key Manager Service
 * 
 * Manages API keys for external services with rotation, validation, and monitoring
 */

// No need to import Deno as it's a global object in the Deno runtime environment
// @ts-ignore: Deno is available in the runtime environment

interface ApiKeyConfig {
  key: string;
  isValid: boolean;
  lastUsed: number;
  usageCount: number;
  errorCount: number;
  lastError?: string;
}

export class ApiKeyManager {
  private keys: Record<string, ApiKeyConfig> = {};
  private readonly MAX_ERRORS = 5; // Maximum consecutive errors before marking a key as invalid
  private readonly ERROR_RESET_TIME = 30 * 60 * 1000; // 30 minutes to reset error count
  
  constructor() {
    // Initialize keys from environment variables
    this.initializeKeys();
    
    // Periodically check key health
    setInterval(() => this.checkKeyHealth(), 5 * 60 * 1000); // Every 5 minutes
  }
  
  /**
   * Initialize API keys from environment variables
   */
  private initializeKeys(): void {
    try {
      // Ticketmaster API key
      // @ts-ignore: Deno is available in the runtime environment
      const ticketmasterKey = Deno.env.get('TICKETMASTER_KEY'); // Use TICKETMASTER_KEY as per report
      if (ticketmasterKey) {
        this.keys['ticketmaster'] = {
          key: ticketmasterKey,
          isValid: true,
          lastUsed: 0,
          usageCount: 0,
          errorCount: 0
        };
      } else {
        console.warn('[API_KEY] Ticketmaster API key not found in environment variables');
      }
      
      // PredictHQ API key
      // @ts-ignore: Deno is available in the runtime environment
      const predictHQKey = Deno.env.get('PREDICTHQ_API_KEY');
      if (predictHQKey) {
        this.keys['predicthq'] = {
          key: predictHQKey,
          isValid: true,
          lastUsed: 0,
          usageCount: 0,
          errorCount: 0
        };
      } else {
        console.warn('[API_KEY] PredictHQ API key not found in environment variables');
      }
      
      console.log(`[API_KEY] Initialized ${Object.keys(this.keys).length} API keys`);
    } catch (error) {
      console.error('[API_KEY] Error initializing API keys:', error);
    }
  }
  
  /**
   * Get API keys for specified services
   */
  async getKeys(services: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    for (const service of services) {
      const keyConfig = this.keys[service.toLowerCase()];
      
      if (keyConfig && keyConfig.isValid) {
        // Update usage statistics
        keyConfig.lastUsed = Date.now();
        keyConfig.usageCount++;
        
        result[service.toLowerCase()] = keyConfig.key;
      } else if (keyConfig && !keyConfig.isValid) {
        console.warn(`[API_KEY] Attempted to use invalid ${service} API key`);
      } else {
        console.warn(`[API_KEY] No API key found for service: ${service}`);
      }
    }
    
    return result;
  }
  
  /**
   * Report an error with a specific API key
   */
  reportError(service: string, error: string): void {
    const keyConfig = this.keys[service.toLowerCase()];
    
    if (keyConfig) {
      keyConfig.errorCount++;
      keyConfig.lastError = error;
      
      // Check if we should invalidate the key
      if (keyConfig.errorCount >= this.MAX_ERRORS) {
        keyConfig.isValid = false;
        console.error(`[API_KEY] ${service} API key has been marked as invalid after ${keyConfig.errorCount} consecutive errors`);
      } else {
        console.warn(`[API_KEY] Error reported for ${service} API key (${keyConfig.errorCount}/${this.MAX_ERRORS}): ${error}`);
      }
    }
  }
  
  /**
   * Report successful usage of an API key
   */
  reportSuccess(service: string): void {
    const keyConfig = this.keys[service.toLowerCase()];
    
    if (keyConfig) {
      // Reset error count on successful use
      if (keyConfig.errorCount > 0) {
        keyConfig.errorCount = 0;
        console.log(`[API_KEY] Reset error count for ${service} API key after successful use`);
      }
      
      // If the key was previously invalid but is now working, mark it as valid again
      if (!keyConfig.isValid) {
        keyConfig.isValid = true;
        console.log(`[API_KEY] ${service} API key has been marked as valid again after successful use`);
      }
    }
  }
  
  /**
   * Check the health of all API keys
   */
  private checkKeyHealth(): void {
    const now = Date.now();
    
    for (const [service, keyConfig] of Object.entries(this.keys)) {
      // Reset error count if it's been a while since the last error
      if (keyConfig.errorCount > 0 && keyConfig.lastUsed > 0 && (now - keyConfig.lastUsed) > this.ERROR_RESET_TIME) {
        keyConfig.errorCount = 0;
        console.log(`[API_KEY] Reset error count for ${service} API key due to time elapsed`);
        
        // If the key was invalid, mark it as valid to try again
        if (!keyConfig.isValid) {
          keyConfig.isValid = true;
          console.log(`[API_KEY] ${service} API key has been marked as valid again to retry`);
        }
      }
    }
  }
  
  /**
   * Get API key health statistics
   */
  getKeyStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [service, keyConfig] of Object.entries(this.keys)) {
      stats[service] = {
        isValid: keyConfig.isValid,
        usageCount: keyConfig.usageCount,
        errorCount: keyConfig.errorCount,
        lastUsed: keyConfig.lastUsed > 0 ? new Date(keyConfig.lastUsed).toISOString() : 'never',
        lastError: keyConfig.lastError || 'none'
      };
    }
    
    return stats;
  }
}
