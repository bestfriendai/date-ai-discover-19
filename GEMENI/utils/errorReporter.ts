// Centralized error reporting utility
// In development, logs to console. In production, sends to a monitoring service

import { getConfig } from '@/config/env';

// Determine environment
const isDev = import.meta.env.DEV || getConfig('VITE_VERCEL_ENV') === 'development';

// Store the original console methods to avoid recursion
const originalConsoleError = (typeof window !== 'undefined' && window.console && window.console.error)
  ? window.console.error.bind(window.console)
  : (...args: any[]) => {};

const originalConsoleWarn = (typeof window !== 'undefined' && window.console && window.console.warn)
  ? window.console.warn.bind(window.console)
  : (...args: any[]) => {};

// Flag to prevent recursive error reporting
let isReportingError = false;

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error context interface
export interface ErrorContext {
  severity?: ErrorSeverity;
  context?: string;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Safely stringify objects for error reporting
 */
function safeStringify(obj: any, maxDepth = 3, maxLen = 1000): string {
  const seen = new WeakSet();
  function _stringify(obj: any, depth: number): any {
    if (depth > maxDepth) return '[Max depth reached]';
    if (obj && typeof obj === 'object') {
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
      const out: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        try {
          out[key] = _stringify(obj[key], depth + 1);
        } catch (e) {
          out[key] = '[Error serializing]';
        }
      }
      return out;
    }
    return obj;
  }
  let result = '';
  try {
    result = JSON.stringify(_stringify(obj, 0));
  } catch (e) {
    result = '[Unserializable object]';
  }
  if (result.length > maxLen) result = result.slice(0, maxLen) + '...';
  return result;
}

/**
 * Show a toast notification for the error if available
 */
function showErrorToast(message: string, title = 'Error') {
  if (typeof window !== 'undefined' && window.toast) {
    window.toast({
      title,
      description: message,
      variant: 'destructive',
      duration: 5000,
    });
  }
}

/**
 * Main error reporting function
 * @param error The error object or message
 * @param errorContext Additional context for the error
 */
export default function errorReporter(error: unknown, errorContext: ErrorContext = {}) {
  if (isReportingError) return; // Prevent recursion
  isReportingError = true;

  try {
    // Extract error details
    const errorObj = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
    const { severity = ErrorSeverity.MEDIUM, context = 'GENERAL', tags = {}, user, metadata = {} } = errorContext;

    // Prepare error data
    const errorData = {
      message: errorObj.message,
      stack: errorObj.stack,
      name: errorObj.name,
      severity,
      context,
      tags,
      user,
      metadata,
      timestamp: new Date().toISOString(),
      environment: isDev ? 'development' : 'production',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    if (isDev) {
      // In development, log detailed error information to console
      originalConsoleError(`[ERROR] [${severity.toUpperCase()}] [${context}]`, errorObj);
      if (Object.keys(metadata).length > 0) {
        originalConsoleError('[ERROR METADATA]', metadata);
      }
    } else {
      // In production, send to monitoring service
      // This is where you would integrate with a service like Sentry

      // Example Sentry integration (commented out):
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.withScope((scope) => {
      //     scope.setLevel(severity as any);
      //     scope.setTags(tags);
      //     if (user) scope.setUser(user);
      //     scope.setExtras(metadata);
      //     Sentry.captureException(errorObj);
      //   });
      // }

      // For now, log a simplified version to console
      const msg = safeStringify(errorData);
      originalConsoleError('[ERROR REPORT]', msg);
    }

    // Show toast notification for high severity errors in UI
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      showErrorToast(
        errorObj.message || 'An unexpected error occurred',
        severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Error'
      );
    }
  } catch (e) {
    // If error reporting itself fails, log a basic message
    originalConsoleError('[ERROR REPORT] Failed to report error:', e);
    originalConsoleError('Original error:', error);
  }

  isReportingError = false;
}

/**
 * Log a warning with context
 */
export function logWarning(message: string, context = 'GENERAL', metadata: Record<string, any> = {}) {
  if (isDev) {
    originalConsoleWarn(`[WARNING] [${context}] ${message}`, metadata);
  } else {
    // In production, could send warnings to monitoring service at lower priority
    originalConsoleWarn(`[WARNING] [${context}] ${message}`);
  }
}
