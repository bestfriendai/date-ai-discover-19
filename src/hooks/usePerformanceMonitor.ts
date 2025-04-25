import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
  memoryUsage?: number;
}

/**
 * Hook to monitor component performance
 * @param componentName Name of the component to monitor
 * @param enabled Whether monitoring is enabled
 * @returns Object with performance metrics
 */
export function usePerformanceMonitor(componentName: string, enabled = true) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const metricsRef = useRef<PerformanceMetrics>({
    componentName,
    renderTime: 0,
    renderCount: 0,
  });

  // Update metrics on each render
  useEffect(() => {
    if (!enabled) return;

    const now = performance.now();
    const renderTime = now - lastRenderTime.current;
    renderCount.current += 1;

    // Update metrics
    metricsRef.current = {
      componentName,
      renderTime,
      renderCount: renderCount.current,
      // Try to get memory usage if available
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
    };

    // Log performance metrics every 10 renders or if render time is high
    if (renderCount.current % 10 === 0 || renderTime > 50) {
      console.log(
        `[PERFORMANCE] ${componentName}: render #${renderCount.current} took ${renderTime.toFixed(2)}ms`
      );
    }

    // Reset timer for next render
    lastRenderTime.current = now;

    // Cleanup
    return () => {
      if (renderCount.current === 1) {
        console.log(
          `[PERFORMANCE] ${componentName}: mounted and unmounted after ${renderTime.toFixed(2)}ms`
        );
      }
    };
  });

  return metricsRef.current;
}

/**
 * Utility to measure function execution time
 * @param fn Function to measure
 * @param fnName Optional name for logging
 * @returns The result of the function
 */
export function measureExecutionTime<T>(fn: () => T, fnName = 'Function'): T {
  const start = performance.now();
  const result = fn();
  const executionTime = performance.now() - start;
  
  console.log(`[PERFORMANCE] ${fnName} executed in ${executionTime.toFixed(2)}ms`);
  
  return result;
}

/**
 * Utility to create a debounced function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Utility to create a throttled function
 * @param fn Function to throttle
 * @param limit Limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}

export default usePerformanceMonitor;