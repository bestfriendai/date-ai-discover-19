import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadEnvConfig, getApiKey, validateRequiredKeys } from '../env';

describe('Environment Configuration', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear module cache between tests
    vi.resetModules();
    // Reset process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('loadEnvConfig', () => {
    it('should load valid environment configuration', () => {
      // Set required env vars
      process.env.TICKETMASTER_KEY = 'test-tm-key';
      process.env.PREDICTHQ_API_KEY = 'test-phq-key';

      const config = loadEnvConfig();
      expect(config).toEqual({
        TICKETMASTER_KEY: 'test-tm-key',
        PREDICTHQ_API_KEY: 'test-phq-key',
        SERPAPI_KEY: undefined,
        MAPBOX_TOKEN: undefined,
      });
    });

    it('should throw error when required keys are missing', () => {
      // Clear required env vars
      delete process.env.TICKETMASTER_KEY;
      delete process.env.PREDICTHQ_API_KEY;

      expect(() => loadEnvConfig()).toThrow('Environment validation failed');
    });

    it('should accept optional keys', () => {
      // Set all env vars including optional ones
      process.env.TICKETMASTER_KEY = 'test-tm-key';
      process.env.PREDICTHQ_API_KEY = 'test-phq-key';
      process.env.SERPAPI_KEY = 'test-serp-key';
      process.env.MAPBOX_TOKEN = 'test-mapbox-token';

      const config = loadEnvConfig();
      expect(config).toEqual({
        TICKETMASTER_KEY: 'test-tm-key',
        PREDICTHQ_API_KEY: 'test-phq-key',
        SERPAPI_KEY: 'test-serp-key',
        MAPBOX_TOKEN: 'test-mapbox-token',
      });
    });
  });

  describe('getApiKey', () => {
    beforeEach(() => {
      // Set up env vars for each test
      process.env.TICKETMASTER_KEY = 'test-tm-key';
      process.env.PREDICTHQ_API_KEY = 'test-phq-key';
      process.env.SERPAPI_KEY = 'test-serp-key';
      process.env.MAPBOX_TOKEN = 'test-mapbox-token';
    });

    it('should return Ticketmaster API key', () => {
      expect(getApiKey('ticketmaster')).toBe('test-tm-key');
    });

    it('should return PredictHQ API key', () => {
      expect(getApiKey('predicthq')).toBe('test-phq-key');
    });

    it('should return SerpAPI key when available', () => {
      expect(getApiKey('serpapi')).toBe('test-serp-key');
    });

    it('should throw error for SerpAPI key when not configured', () => {
      delete process.env.SERPAPI_KEY;
      expect(() => getApiKey('serpapi')).toThrow('SerpAPI key is not configured');
    });

    it('should throw error for unknown service', () => {
      expect(() => getApiKey('unknown')).toThrow('Unknown service: unknown');
    });
  });

  describe('validateRequiredKeys', () => {
    it('should not throw when all required keys are present', () => {
      process.env.TICKETMASTER_KEY = 'test-tm-key';
      process.env.PREDICTHQ_API_KEY = 'test-phq-key';

      expect(() => validateRequiredKeys()).not.toThrow();
    });

    it('should throw when required keys are missing', () => {
      delete process.env.TICKETMASTER_KEY;
      delete process.env.PREDICTHQ_API_KEY;

      expect(() => validateRequiredKeys()).toThrow('Environment validation failed');
    });
  });
});