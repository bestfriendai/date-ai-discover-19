/**
 * Enhanced error handling utilities for search-events function
 * This module provides improved error handling, validation, and reporting
 */

import { ApiKeyError, formatApiError } from './errors.ts';

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  error: string;
  errorType: string;
  details?: string;
  status: number;
  timestamp: string;
  path?: string;
}

/**
 * HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Error severity levels for logging
 */
export enum ErrorSeverity {
  LOW = 'low',      // Minor issues that don't affect functionality
  MEDIUM = 'medium', // Issues that may affect some functionality
  HIGH = 'high',    // Serious issues that affect core functionality
  CRITICAL = 'critical' // Fatal errors that prevent operation
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  path?: string,
  status?: number
): ErrorResponse {
  // Format the base error information
  const formattedError = formatApiError(error);
  
  // Determine appropriate HTTP status code based on error type
  let responseStatus = status || HttpStatus.INTERNAL_SERVER_ERROR;
  if (error instanceof ApiKeyError) {
    responseStatus = HttpStatus.UNAUTHORIZED;
  } else if (error instanceof Error) {
    if (error.name === 'RequestValidationError') {
      responseStatus = HttpStatus.BAD_REQUEST;
    }
  }

  return {
    error: formattedError.error,
    errorType: formattedError.errorType,
    details: formattedError.details,
    status: responseStatus,
    timestamp: new Date().toISOString(),
    path
  };
}

/**
 * Log an error with appropriate severity level and context
 */
export function logError(
  error: unknown,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context: string = 'GENERAL',
  additionalInfo: Record<string, unknown> = {}
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const timestamp = new Date().toISOString();
  
  // Format the log message based on severity
  const prefix = `[${timestamp}] [${context}] [${severity.toUpperCase()}]`;
  
  // Log with appropriate console method based on severity
  if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
    console.error(
      `${prefix} Error: ${errorObj.message}`,
      { error: errorObj, stack: errorObj.stack, ...additionalInfo }
    );
  } else if (severity === ErrorSeverity.MEDIUM) {
    console.warn(
      `${prefix} Error: ${errorObj.message}`,
      { error: errorObj, ...additionalInfo }
    );
  } else {
    console.log(
      `${prefix} Error: ${errorObj.message}`,
      { error: errorObj, ...additionalInfo }
    );
  }
}

/**
 * Try to execute a function and handle errors in a standardized way
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): Promise<{ result: T | null; error: Error | null }> {
  try {
    const result = await fn();
    return { result, error: null };
  } catch (error) {
    logError(error, severity, context);
    return { result: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Validate that a value is defined and not null
 */
export function validateDefined<T>(
  value: T | undefined | null,
  errorMessage: string
): T {
  if (value === undefined || value === null) {
    throw new Error(errorMessage);
  }
  return value;
}