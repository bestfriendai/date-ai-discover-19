/**
 * Error handling utilities for event search functions
 */

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',      // Informational or minor issues
  MEDIUM = 'medium', // Non-critical but important issues
  HIGH = 'high',    // Serious issues affecting function
  CRITICAL = 'critical' // Critical issues requiring immediate attention
}

/**
 * Log an error with context
 * @param error The error to log
 * @param severity The severity level
 * @param context The context in which the error occurred
 * @param metadata Additional metadata
 */
export function logError(
  error: unknown,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context: string = 'GENERAL',
  metadata: Record<string, unknown> = {}
): void {
  const errorObj = error instanceof Error ? error : 
                  typeof error === 'string' ? new Error(error) :
                  new Error(JSON.stringify(error));
  
  console.error(`[${severity.toUpperCase()}] [${context}] ${errorObj.message}`, {
    stack: errorObj.stack,
    ...metadata
  });
}

/**
 * Validate that a value is defined
 * @param value The value to check
 * @param message The error message
 */
export function validateDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

/**
 * Try/catch wrapper for async functions that returns result and error
 * @param fn The function to execute
 * @param context The context for error logging
 * @param severity The severity level for error logging
 * @returns Object containing result and/or error
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): Promise<{ result?: T; error?: Error }> {
  try {
    const result = await fn();
    return { result };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logError(errorObj, severity, context);
    return { error: errorObj };
  }
}