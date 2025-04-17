/**
 * Performance monitoring utility for tracking key metrics
 */

// Store performance marks and measures
interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// Global performance data store
const performanceData: Record<string, PerformanceEntry> = {};

// Performance thresholds for warnings (in ms)
const PERFORMANCE_THRESHOLDS = {
  mapInitialization: 2000,
  eventFetching: 3000,
  eventFiltering: 500,
  markerRendering: 1000,
  apiCall: 5000,
  uiInteraction: 100
};

/**
 * Start timing an operation
 */
export function startMeasure(name: string, metadata?: Record<string, any>): void {
  performanceData[name] = {
    name,
    startTime: performance.now(),
    metadata
  };
  
  console.log(`[PERF] Started measuring: ${name}`);
}

/**
 * End timing an operation and log the result
 */
export function endMeasure(name: string, additionalMetadata?: Record<string, any>): number | undefined {
  const entry = performanceData[name];
  
  if (!entry) {
    console.warn(`[PERF] No measurement started for: ${name}`);
    return undefined;
  }
  
  const endTime = performance.now();
  const duration = endTime - entry.startTime;
  
  // Update the entry
  entry.endTime = endTime;
  entry.duration = duration;
  
  if (additionalMetadata) {
    entry.metadata = { ...entry.metadata, ...additionalMetadata };
  }
  
  // Log the result
  const threshold = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS];
  
  if (threshold && duration > threshold) {
    console.warn(`[PERF] ⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
  } else {
    console.log(`[PERF] Completed: ${name} in ${duration.toFixed(2)}ms`);
  }
  
  // Log additional metadata if available
  if (entry.metadata) {
    console.log(`[PERF] ${name} details:`, entry.metadata);
  }
  
  return duration;
}

/**
 * Get all performance measurements
 */
export function getAllMeasurements(): Record<string, PerformanceEntry> {
  return { ...performanceData };
}

/**
 * Clear all performance measurements
 */
export function clearMeasurements(): void {
  Object.keys(performanceData).forEach(key => {
    delete performanceData[key];
  });
}

/**
 * Measure a function execution time
 */
export function measureFunction<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  ...args: Parameters<T>
): ReturnType<T> {
  startMeasure(name);
  try {
    const result = fn(...args);
    
    // Handle promises
    if (result instanceof Promise) {
      return result
        .then(value => {
          endMeasure(name, { success: true });
          return value;
        })
        .catch(error => {
          endMeasure(name, { success: false, error: error.message });
          throw error;
        }) as ReturnType<T>;
    }
    
    endMeasure(name, { success: true });
    return result;
  } catch (error: any) {
    endMeasure(name, { success: false, error: error.message });
    throw error;
  }
}

/**
 * Create a wrapped version of a function that measures performance
 */
export function createMeasuredFunction<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    return measureFunction(name, fn, ...args);
  };
}

/**
 * Report performance metrics to the console
 */
export function reportPerformanceMetrics(): void {
  console.group('[PERF] Performance Report');
  
  const entries = Object.values(performanceData);
  
  if (entries.length === 0) {
    console.log('No performance data available');
    console.groupEnd();
    return;
  }
  
  // Sort by duration (slowest first)
  const sortedEntries = entries
    .filter(entry => entry.duration !== undefined)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  
  console.log(`Total operations measured: ${entries.length}`);
  
  // Report slowest operations
  console.log('Slowest operations:');
  sortedEntries.slice(0, 5).forEach(entry => {
    const threshold = PERFORMANCE_THRESHOLDS[entry.name as keyof typeof PERFORMANCE_THRESHOLDS];
    const isOverThreshold = threshold && (entry.duration || 0) > threshold;
    
    console.log(
      `${isOverThreshold ? '⚠️ ' : ''}${entry.name}: ${entry.duration?.toFixed(2)}ms` + 
      (threshold ? ` (threshold: ${threshold}ms)` : '')
    );
  });
  
  console.groupEnd();
}

// Export a singleton instance
export const PerformanceMonitor = {
  startMeasure,
  endMeasure,
  getAllMeasurements,
  clearMeasurements,
  measureFunction,
  createMeasuredFunction,
  reportPerformanceMetrics
};

export default PerformanceMonitor;
