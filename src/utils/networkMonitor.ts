/**
 * Network monitoring utility for tracking API requests
 */
import PerformanceMonitor from './performanceMonitor';

// Store for tracking in-flight requests
const inFlightRequests: Record<string, {
  url: string;
  startTime: number;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}> = {};

// Original fetch function
const originalFetch = window.fetch;

/**
 * Initialize the network monitor by patching the fetch API
 */
export function initNetworkMonitor() {
  if ((window as any).__networkMonitorInitialized) {
    return;
  }
  
  console.log('[NETWORK] Initializing network monitor');
  
  // Override the fetch function
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = '';
    }
    const method = init?.method || 'GET';
    const requestId = `${method}-${url}-${Date.now()}`;
    
    // Start tracking the request
    inFlightRequests[requestId] = {
      url,
      startTime: performance.now(),
      method,
      headers: init?.headers as Record<string, string>,
      body: init?.body
    };
    
    // Start measuring performance
    PerformanceMonitor.startMeasure(`fetch-${requestId}`, {
      url,
      method,
      headers: init?.headers
    });
    
    console.log(`[NETWORK] 🌐 ${method} request to ${url}`);
    
    try {
      // Call the original fetch function
      const response = await originalFetch(input, init);
      
      // Clone the response to avoid consuming it
      const clonedResponse = response.clone();
      
      // Get response details
      const status = response.status;
      const statusText = response.statusText;
      const contentType = response.headers.get('content-type') || '';
      const size = parseInt(response.headers.get('content-length') || '0', 10);
      
      // Calculate request duration
      const endTime = performance.now();
      const duration = endTime - inFlightRequests[requestId].startTime;
      
      // Log response details
      const logLevel = status >= 400 ? 'error' : 'log';
      console[logLevel](
        `[NETWORK] ${status < 400 ? '✅' : '❌'} ${method} ${url} - ${status} ${statusText} (${duration.toFixed(0)}ms)`,
        { status, contentType, size, duration }
      );
      
      // End performance measurement
      PerformanceMonitor.endMeasure(`fetch-${requestId}`, {
        status,
        contentType,
        size,
        duration,
        success: status < 400
      });
      
      // Clean up
      delete inFlightRequests[requestId];
      
      return response;
    } catch (error) {
      // Calculate request duration
      const endTime = performance.now();
      const duration = endTime - inFlightRequests[requestId].startTime;
      
      // Log error
      console.error(`[NETWORK] ❌ ${method} ${url} - Failed (${duration.toFixed(0)}ms)`, error);
      
      // End performance measurement
      PerformanceMonitor.endMeasure(`fetch-${requestId}`, {
        error: error instanceof Error ? error.message : String(error),
        duration,
        success: false
      });
      
      // Clean up
      delete inFlightRequests[requestId];
      
      throw error;
    }
  };
  
  // Mark as initialized
  (window as any).__networkMonitorInitialized = true;
  
  console.log('[NETWORK] Network monitor initialized successfully');
}

/**
 * Get all in-flight requests
 */
export function getInFlightRequests(): Record<string, any> {
  return { ...inFlightRequests };
}

/**
 * Get the count of in-flight requests
 */
export function getInFlightRequestCount(): number {
  return Object.keys(inFlightRequests).length;
}

/**
 * Reset the network monitor
 */
export function resetNetworkMonitor(): void {
  // Restore original fetch
  if ((window as any).__networkMonitorInitialized) {
    window.fetch = originalFetch;
    (window as any).__networkMonitorInitialized = false;
    
    // Clear in-flight requests
    Object.keys(inFlightRequests).forEach(key => {
      delete inFlightRequests[key];
    });
    
    console.log('[NETWORK] Network monitor reset');
  }
}

// Export a singleton instance
export const NetworkMonitor = {
  init: initNetworkMonitor,
  getInFlightRequests,
  getInFlightRequestCount,
  reset: resetNetworkMonitor
};

export default NetworkMonitor;
