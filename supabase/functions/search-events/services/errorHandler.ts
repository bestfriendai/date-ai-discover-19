/**
 * Error Handler Service
 * 
 * Provides standardized error handling for the API
 * with detailed logging and client-friendly error messages
 */

interface ErrorContext {
  requestId: string;
  startTime: number;
  method: string;
  url: URL;
  [key: string]: any;
}

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  status?: number;
  requestId?: string;
  timestamp?: string;
  path?: string;
  details?: any;
}

export class ErrorHandler {
  private readonly ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMITED: 'RATE_LIMITED',
    API_ERROR: 'API_ERROR',
    TIMEOUT: 'TIMEOUT',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  };

  /**
   * Handle an error and return a standardized error response
   */
  handle(error: unknown, context: ErrorContext): ErrorResponse {
    // Calculate duration for logging
    const duration = performance.now() - context.startTime;
    
    // Default error response
    const response: ErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: this.ERROR_CODES.INTERNAL_ERROR,
      status: 500,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      path: context.url.pathname
    };
    
    // Handle different error types
    if (error instanceof Error) {
      response.message = error.message;
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        response.error = 'Validation Error';
        response.code = this.ERROR_CODES.VALIDATION_ERROR;
        response.status = 400;
        response.details = (error as any).details || undefined;
      } else if (error.name === 'NotFoundError') {
        response.error = 'Not Found';
        response.code = this.ERROR_CODES.NOT_FOUND;
        response.status = 404;
      } else if (error.name === 'UnauthorizedError') {
        response.error = 'Unauthorized';
        response.code = this.ERROR_CODES.UNAUTHORIZED;
        response.status = 401;
      } else if (error.name === 'ForbiddenError') {
        response.error = 'Forbidden';
        response.code = this.ERROR_CODES.FORBIDDEN;
        response.status = 403;
      } else if (error.name === 'RateLimitError') {
        response.error = 'Rate Limited';
        response.code = this.ERROR_CODES.RATE_LIMITED;
        response.status = 429;
      } else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        response.error = 'Request Timeout';
        response.code = this.ERROR_CODES.TIMEOUT;
        response.status = 408;
      } else if (error.name === 'ApiError' || error.message.includes('API')) {
        response.error = 'External API Error';
        response.code = this.ERROR_CODES.API_ERROR;
        response.status = 502;
      }
      
      // Log the error with stack trace if available
      console.error(`[ERROR] ${response.error} (${response.code}) for request ${context.requestId}: ${response.message}`);
      if (error.stack) {
        console.error(`[ERROR] Stack trace for request ${context.requestId}:\n${error.stack}`);
      }
    } else if (typeof error === 'string') {
      response.message = error;
      console.error(`[ERROR] String error for request ${context.requestId}: ${error}`);
    } else {
      // For unknown error types, try to stringify if possible
      try {
        const errorStr = JSON.stringify(error);
        response.message = `Unknown error: ${errorStr}`;
        response.details = error;
        console.error(`[ERROR] Unknown error type for request ${context.requestId}: ${errorStr}`);
      } catch (e) {
        console.error(`[ERROR] Unserializable error for request ${context.requestId}`);
      }
    }
    
    // Log the final error response
    console.log(`[ERROR] Request ${context.requestId} failed after ${duration.toFixed(2)}ms with status ${response.status}`);
    
    return response;
  }
  
  /**
   * Create a custom error with a specific type
   */
  createError(type: string, message: string, details?: any): Error {
    const error = new Error(message);
    error.name = type;
    if (details) {
      (error as any).details = details;
    }
    return error;
  }
  
  /**
   * Create a validation error
   */
  validationError(message: string, details?: any): Error {
    return this.createError('ValidationError', message, details);
  }
  
  /**
   * Create a not found error
   */
  notFoundError(message: string = 'Resource not found'): Error {
    return this.createError('NotFoundError', message);
  }
  
  /**
   * Create an unauthorized error
   */
  unauthorizedError(message: string = 'Unauthorized'): Error {
    return this.createError('UnauthorizedError', message);
  }
  
  /**
   * Create a forbidden error
   */
  forbiddenError(message: string = 'Forbidden'): Error {
    return this.createError('ForbiddenError', message);
  }
  
  /**
   * Create a rate limit error
   */
  rateLimitError(message: string = 'Rate limit exceeded'): Error {
    return this.createError('RateLimitError', message);
  }
  
  /**
   * Create a timeout error
   */
  timeoutError(message: string = 'Request timed out'): Error {
    return this.createError('TimeoutError', message);
  }
  
  /**
   * Create an API error
   */
  apiError(message: string, details?: any): Error {
    return this.createError('ApiError', message, details);
  }
}
