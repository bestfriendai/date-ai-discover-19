/**
 * Base class for API key related errors
 */
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

/**
 * Error thrown when an API key is missing
 */
export class MissingApiKeyError extends ApiKeyError {
  constructor(service: string) {
    super(`API key not found for service: ${service}`);
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Error thrown when an API key has an invalid format
 */
export class InvalidApiKeyError extends ApiKeyError {
  constructor(service: string, details?: string) {
    super(`Invalid API key format for service: ${service}${details ? ` (${details})` : ''}`);
    this.name = 'InvalidApiKeyError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends ApiKeyError {
  constructor(service: string, limit: number) {
    super(`Rate limit exceeded for service: ${service} (limit: ${limit} requests/day)`);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Error thrown when API key validation rules are not defined
 */
export class ValidationRulesNotFoundError extends ApiKeyError {
  constructor(service: string) {
    super(`No validation rules defined for service: ${service}`);
    this.name = 'ValidationRulesNotFoundError';
  }
}

/**
 * Format an error for API response
 */
export function formatApiError(error: unknown): {
  error: string;
  errorType: string;
  details?: string;
} {
  if (error instanceof ApiKeyError) {
    return {
      error: error.message,
      errorType: error.name,
      details: error instanceof InvalidApiKeyError ? error.message.split('(')[1]?.replace(')', '') : undefined
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      errorType: error.name || 'Error'
    };
  }

  return {
    error: String(error),
    errorType: 'UnknownError'
  };
}