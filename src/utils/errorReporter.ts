// Centralized error reporting utility
// In development, logs to console. In production, extend to send to a service (e.g., Sentry)

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

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
  let result = JSON.stringify(_stringify(obj, 0));
  if (result.length > maxLen) result = result.slice(0, maxLen) + '...';
  return result;
}

export default function errorReporter(...args: any[]) {
  if (isDev) {
    // Log to console in dev
    // eslint-disable-next-line no-console
    console.error('[ERROR REPORT]', ...args);
  } else {
    // In production, send to monitoring service
    // Example: Sentry.captureException(args)
    // For now, just log to console
    try {
      const msg = safeStringify(args);
      // eslint-disable-next-line no-console
      console.error('[ERROR REPORT]', msg);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ERROR REPORT] (failed to stringify)', args);
    }
  }
}
