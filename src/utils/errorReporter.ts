// Centralized error reporting utility
// In development, logs to console. In production, extend to send to a service (e.g., Sentry)

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
// Store the original console.error to avoid recursion
const originalConsoleError = (typeof window !== 'undefined' && window.console && window.console.error)
  ? window.console.error.bind(window.console)
  : (...args: any[]) => {};

let isReportingError = false;

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

export default function errorReporter(...args: any[]) {
  if (isReportingError) return; // Prevent recursion
  isReportingError = true;
  try {
    if (isDev) {
      // Log to original console.error in dev
      originalConsoleError('[ERROR REPORT]', ...args);
    } else {
      // In production, send to monitoring service
      // Example: Sentry.captureException(args)
      // For now, just log to original console
      const msg = safeStringify(args);
      originalConsoleError('[ERROR REPORT]', msg);
    }
  } catch (e) {
    originalConsoleError('[ERROR REPORT] (failed to stringify or log)', args);
  }
  isReportingError = false;
}
