import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiKeyManager } from '../apiKeyManager';
import * as envModule from '../env';

describe('ApiKeyManager', () => {
  const mockTicketmasterKey = 'a'.repeat(32);
  const mockPredictHQKey = 'b'.repeat(32);
  const mockSerpApiKey = 'c'.repeat(20);
  const mockMapboxKey = 'pk.' + 'a'.repeat(48);

  beforeEach(() => {
    // Mock getApiKey function
    vi.spyOn(envModule, 'getApiKey').mockImplementation((service: string) => {
      switch (service) {
        case 'ticketmaster':
          return mockTicketmasterKey;
        case 'predicthq':
          return mockPredictHQKey;
        case 'serpapi':
          return mockSerpApiKey;
        case 'mapbox':
          return mockMapboxKey;
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    });

    // Reset usage stats before each test
    apiKeyManager.resetUsageStats('ticketmaster');
    apiKeyManager.resetUsageStats('predicthq');
    apiKeyManager.resetUsageStats('serpapi');
    apiKeyManager.resetUsageStats('mapbox');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Key Validation', () => {
    it('should validate Ticketmaster key format', () => {
      expect(apiKeyManager.isValidKeyFormat('ticketmaster', mockTicketmasterKey)).toBe(true);
      expect(apiKeyManager.isValidKeyFormat('ticketmaster', 'invalid')).toBe(false);
    });

    it('should validate PredictHQ key format', () => {
      expect(apiKeyManager.isValidKeyFormat('predicthq', mockPredictHQKey)).toBe(true);
      expect(apiKeyManager.isValidKeyFormat('predicthq', 'invalid')).toBe(false);
    });

    it('should validate SerpAPI key format', () => {
      expect(apiKeyManager.isValidKeyFormat('serpapi', mockSerpApiKey)).toBe(true);
      expect(apiKeyManager.isValidKeyFormat('serpapi', 'invalid')).toBe(false);
    });

    it('should validate Mapbox key format', () => {
      expect(apiKeyManager.isValidKeyFormat('mapbox', mockMapboxKey)).toBe(true);
      expect(apiKeyManager.isValidKeyFormat('mapbox', 'invalid')).toBe(false);
    });

    it('should throw error for unknown service', () => {
      expect(() => apiKeyManager.isValidKeyFormat('unknown', 'key')).toThrow('No validation rules defined');
    });
  });

  describe('Key Usage Tracking', () => {
    it('should track successful API key usage', () => {
      apiKeyManager.trackKeyUsage('ticketmaster');
      const stats = apiKeyManager.getUsageStats('ticketmaster');
      
      expect(stats).toBeDefined();
      expect(stats?.requests).toBe(1);
      expect(stats?.errors).toBe(0);
      expect(stats?.lastUsed).toBeInstanceOf(Date);
    });

    it('should track API key errors', () => {
      apiKeyManager.trackKeyUsage('ticketmaster', true);
      const stats = apiKeyManager.getUsageStats('ticketmaster');
      
      expect(stats).toBeDefined();
      expect(stats?.requests).toBe(1);
      expect(stats?.errors).toBe(1);
    });

    it('should accumulate usage statistics', () => {
      apiKeyManager.trackKeyUsage('ticketmaster');
      apiKeyManager.trackKeyUsage('ticketmaster', true);
      apiKeyManager.trackKeyUsage('ticketmaster');
      
      const stats = apiKeyManager.getUsageStats('ticketmaster');
      expect(stats?.requests).toBe(3);
      expect(stats?.errors).toBe(1);
    });

    it('should reset usage statistics', () => {
      apiKeyManager.trackKeyUsage('ticketmaster');
      apiKeyManager.resetUsageStats('ticketmaster');
      
      const stats = apiKeyManager.getUsageStats('ticketmaster');
      expect(stats).toBeUndefined();
    });
  });

  describe('Active Key Management', () => {
    it('should get active key for valid service', () => {
      const key = apiKeyManager.getActiveKey('ticketmaster');
      expect(key).toBe(mockTicketmasterKey);
    });

    it('should throw error for invalid key format', () => {
      vi.spyOn(envModule, 'getApiKey').mockReturnValue('invalid');
      expect(() => apiKeyManager.getActiveKey('ticketmaster')).toThrow('Invalid API key format');
    });

    it('should handle rate limiting', () => {
      // Simulate hitting rate limit
      for (let i = 0; i < 5000; i++) {
        apiKeyManager.trackKeyUsage('ticketmaster');
      }
      
      expect(() => apiKeyManager.getActiveKey('ticketmaster')).toThrow('Rate limit exceeded');
    });
  });

  describe('Key Masking', () => {
    it('should mask API key for logging', () => {
      const masked = apiKeyManager.maskKey('abcd1234efgh5678');
      expect(masked).toBe('abcd...5678');
    });

    it('should handle short keys', () => {
      const masked = apiKeyManager.maskKey('short');
      expect(masked).toBe('********');
    });
  });
});