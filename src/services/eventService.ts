import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';
import { loadingManager } from '@/components/shared/GlobalLoadingIndicator';

/**
 * Enhanced in-memory cache with improved memory management, performance tracking,
 * and automatic cleanup of expired entries.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size?: number; // Approximate size in bytes
}

class EventCache {
  private static instance: EventCache;
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of entries to store
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours maximum age
  private hitCount = 0;
  private missCount = 0;
  private cleanupInterval: number | null = null;
  private statsInterval: number | null = null;

  private constructor() {
    this.cache = new Map();
    this.setupIntervals();
  }

  /**
   * Set up automatic cleanup and stats logging intervals
   */
  private setupIntervals(): void {
    // Clear any existing intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Clean expired cache entries every minute
    this.cleanupInterval = window.setInterval(() => this.cleanExpiredEntries(), 60 * 1000);

    // Log cache stats every 5 minutes in development
    const isDevelopment = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1');

    if (isDevelopment) {
      this.statsInterval = window.setInterval(() => this.logCacheStats(), 5 * 60 * 1000);
    }
  }

  /**
   * Get the singleton instance of the cache
   */
  public static getInstance(): EventCache {
    if (!EventCache.instance) {
      EventCache.instance = new EventCache();
    }
    return EventCache.instance;
  }

  /**
   * Get a value from the cache with type safety
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  public set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Don't cache null or undefined values
    if (data === null || data === undefined) {
      return;
    }

    const timestamp = Date.now();
    const expiresAt = timestamp + ttl;

    // Estimate size of the data in bytes
    let size: number | undefined;
    try {
      const jsonData = JSON.stringify(data);
      size = new TextEncoder().encode(jsonData).length;
    } catch (e) {
      // If we can't stringify the data, don't track its size
      console.warn('[CACHE] Could not estimate size for:', key);
    }

    // Check if we need to evict entries due to cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntries();
    }

    this.cache.set(key, { data, timestamp, expiresAt, size });
  }

  /**
   * Invalidate a specific cache entry
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache and reset statistics
   */
  public clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;
    let freedBytes = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
        if (entry.size) {
          freedBytes += entry.size;
        }
      }
    }

    if (removedCount > 0 && typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1')) {
      console.log(`[CACHE] Cleaned ${removedCount} expired entries, freed ${(freedBytes / 1024).toFixed(2)}KB`);
    }
  }

  /**
   * Evict oldest entries to make room for new ones
   */
  private evictOldestEntries(): void {
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove the oldest 20% of entries
    const entriesToRemove = Math.max(1, Math.floor(entries.length * 0.2));
    let removedCount = 0;
    let freedBytes = 0;

    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      removedCount++;
      if (entry.size) {
        freedBytes += entry.size;
      }
    }

    if (removedCount > 0 && typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1')) {
      console.log(`[CACHE] Evicted ${removedCount} oldest entries, freed ${(freedBytes / 1024).toFixed(2)}KB`);
    }
  }

  /**
   * Log cache statistics to console in development
   */
  private logCacheStats(): void {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ?
      (this.hitCount / totalRequests * 100).toFixed(1) : '0';

    // Calculate total cache size
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      if (entry.size) {
        totalSize += entry.size;
      }
    }

    const sizeInKB = (totalSize / 1024).toFixed(2);

    console.log(`[CACHE] Stats: ${this.cache.size} entries, ${sizeInKB}KB used`);
    console.log(`[CACHE] Hit rate: ${hitRate}% (${this.hitCount} hits, ${this.missCount} misses)`);
  }

  /**
   * Get cache statistics for monitoring
   */
  public getStats(): Record<string, any> {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ?
      (this.hitCount / totalRequests * 100) : 0;

    // Calculate total cache size
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      if (entry.size) {
        totalSize += entry.size;
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: hitRate.toFixed(1) + '%',
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      oldestEntry: this.getOldestEntryAge()
    };
  }

  /**
   * Get the age of the oldest cache entry in seconds
   */
  private getOldestEntryAge(): number | null {
    if (this.cache.size === 0) {
      return null;
    }

    const now = Date.now();
    let oldestTimestamp = now;

    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return Math.floor((now - oldestTimestamp) / 1000);
  }
}

// Export the singleton instance
export const eventCache = EventCache.getInstance();

// Define SearchParams interface locally to avoid conflicts
interface SearchParams {
  query?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
  offset?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  latitude?: number;
  longitude?: number;
  categories?: string[];
  keyword?: string;
  page?: number;
}

/**
 * Performance monitoring service to track API calls and performance metrics
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, {
    calls: number;
    errors: number;
    totalTime: number;
    lastCall: number;
    maxTime: number;
    minTime: number;
  }>;

  private constructor() {
    this.metrics = new Map();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking a new API call
   * @param operation Name of the operation being tracked
   * @returns Function to call when operation completes
   */
  public startOperation(operation: string): (success: boolean) => void {
    const startTime = performance.now();

    return (success: boolean) => {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Get existing metrics or create new ones
      const existing = this.metrics.get(operation) || {
        calls: 0,
        errors: 0,
        totalTime: 0,
        lastCall: Date.now(),
        maxTime: 0,
        minTime: Number.MAX_VALUE
      };

      // Update metrics
      existing.calls += 1;
      existing.totalTime += executionTime;
      existing.lastCall = Date.now();
      existing.maxTime = Math.max(existing.maxTime, executionTime);
      existing.minTime = Math.min(existing.minTime, executionTime);

      if (!success) {
        existing.errors += 1;
      }

      // Save updated metrics
      this.metrics.set(operation, existing);

      // Log performance in development
      const isDevelopment = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1');

      if (isDevelopment) {
        console.log(
          `[PERF] ${operation}: ${executionTime.toFixed(2)}ms ` +
          `(avg: ${(existing.totalTime / existing.calls).toFixed(2)}ms, ` +
          `success: ${success ? 'yes' : 'no'})`
        );
      }

      return executionTime;
    };
  }

  /**
   * Get all performance metrics
   */
  public getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [operation, metrics] of this.metrics.entries()) {
      result[operation] = {
        ...metrics,
        avgTime: metrics.calls > 0 ? (metrics.totalTime / metrics.calls).toFixed(2) : 0,
        errorRate: metrics.calls > 0 ? (metrics.errors / metrics.calls * 100).toFixed(1) + '%' : '0%',
        lastCallTime: new Date(metrics.lastCall).toISOString()
      };
    }

    return result;
  }

  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.metrics.clear();
  }
}

// Export the singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Utility function to retry failed API calls with exponential backoff
 * @param operation Function to retry
 * @param retries Maximum number of retries
 * @param delay Initial delay in milliseconds
 * @param backoffFactor Factor to increase delay on each retry
 * @returns Promise with the operation result
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 300,
  backoffFactor = 2
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Don't retry if we've exhausted our retries
    if (retries <= 0) {
      throw error;
    }

    // Don't retry for certain error types
    if (error instanceof Error) {
      // Don't retry for timeout errors
      if (error.message === 'Request timed out') {
        throw error;
      }

      // Don't retry for client-side validation errors
      if (error.message.includes('Invalid parameters')) {
        throw error;
      }
    }

    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry with increased delay
    return retryWithBackoff(operation, retries - 1, delay * backoffFactor, backoffFactor);
  }
}

/**
 * Search for events using the Supabase Edge Function (search-events-unified)
 * This function fetches events from both Ticketmaster and PredictHQ APIs
 * @param params Search parameters
 * @returns Promise with search results
 */
export async function searchEvents(params: SearchParams): Promise<{
  events: Event[];
  metadata?: Record<string, any>;
}> {
  // Generate a unique ID for this loading operation
  const loadingId: string = `search-events-${Date.now()}`;
  loadingManager.startLoading(loadingId, 'Searching for events...');

  // Start performance monitoring
  const endOperation = performanceMonitor.startOperation('searchEvents');

  try {
    const cacheKey = `search:${JSON.stringify(params)}`;
    const eventCache = EventCache.getInstance();

    // Check cache first
    const cachedResult = eventCache.get<{
      events: Event[];
      metadata?: Record<string, any>;
    }>(cacheKey);

    if (cachedResult) {
      endOperation(true); // Success from cache
      loadingManager.stopLoading(loadingId);
      return cachedResult;
    }

    // Prepare API parameters
    const apiParams: SearchParams = { ...params };

    // Add default limit if not specified
    if (!apiParams.limit) {
      apiParams.limit = 20;
    }

    // Ensure we have at least some parameters to avoid empty request body
    if (!apiParams.lat && !apiParams.lng && !apiParams.latitude && !apiParams.longitude) {
      // Add default coordinates if none provided (New York City)
      apiParams.latitude = 40.7128;
      apiParams.longitude = -74.0060;
      apiParams.radius = apiParams.radius || 30; // Default 30 mile radius
    }

    // Add timeout handling for the function call
    const timeoutMs = 15000; // 15 seconds timeout

    try {
      // Use retry mechanism for the API call
      const functionResult = await retryWithBackoff(async () => {
        // Create a promise that rejects after the timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('Request timed out'));
          }, timeoutMs);
        });

        // Race the function call against the timeout
        // Use the unified search-events function that works reliably
        return Promise.race([
          supabase.functions.invoke('search-events-unified', {
            body: apiParams,
            headers: { 'Content-Type': 'application/json' }
          }),
          timeoutPromise
        ]);
      }, 2); // Retry up to 2 times (3 attempts total)

      // If we get here, the function call completed before the timeout
      const { data, error } = functionResult;

      const success = !error && !!data;
      endOperation(success);

      if (error) {
        console.error(`[ERROR] searchEvents failed:`, error);
        loadingManager.stopLoading(loadingId);
        return { events: [] };
      }

      if (!data) {
        console.warn(`[WARN] searchEvents returned no data`);
        loadingManager.stopLoading(loadingId);
        return { events: [] };
      }

      // Process and normalize the events
      const events = (data.events || []).map((event: any) => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        category: event.category || 'other',
        location: event.location || 'Location TBA',
        date: event.date || 'Date TBA',
        time: event.time || 'Time TBA',
        image: event.image || '',
        url: event.url || '',
        venue: event.venue || null,
        start: event.start || null,
        source: event.source || 'unknown',
        coordinates: event.coordinates || null
      }));

      const result = {
        events,
        metadata: data.metadata || {},
        sourceStats: data.sourceStats || null
      };

      // Cache the result
      eventCache.set(cacheKey, result);

      console.log(`[API] searchEvents completed, found ${events.length} events`);
      loadingManager.stopLoading(loadingId);
      return result;
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.message === 'Request timed out') {
        console.error(`[ERROR] Request timed out after ${timeoutMs}ms`);
        loadingManager.stopLoading(loadingId);
        return { events: [] };
      }

      // Handle other errors
      console.error('[ERROR] searchEvents failed:', error);
      loadingManager.stopLoading(loadingId);
      return { events: [] };
    }
  } catch (error) {
    console.error('[ERROR] searchEvents unexpected error:', error);
    loadingManager.stopLoading(loadingId);
    return { events: [] };
  }
}

/**
 * Get event details by ID with improved error handling and caching
 * @param id Event ID to fetch
 * @returns Promise with event details or null if not found
 */
export async function getEventById(id: string): Promise<Event | null> {
  // Generate a unique ID for this loading operation
  const loadingId = `get-event-${id}-${Date.now()}`;
  loadingManager.startLoading(loadingId, `Loading event details...`);

  // Start performance monitoring
  const endOperation = performanceMonitor.startOperation('getEventById');

  try {
    if (!id) {
      console.error('[ERROR] getEventById called with invalid ID');
      endOperation(false);
      loadingManager.stopLoading(loadingId);
      return null;
    }

    const cacheKey = `event:${id}`;
    const eventCache = EventCache.getInstance();

    // Check cache first
    const cachedEvent = eventCache.get<Event>(cacheKey);
    if (cachedEvent) {
      console.log(`[CACHE] Using cached data for event ${id}`);
      endOperation(true);
      loadingManager.stopLoading(loadingId);
      return cachedEvent;
    }

    // If not in local database, fetch from API with timeout handling
    const timeoutMs = 10000; // 10 seconds timeout

    try {
      // Use retry mechanism for the API call
      const functionResult = await retryWithBackoff(async () => {
        // Create a promise that rejects after the timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('Request timed out'));
          }, timeoutMs);
        });

        // Race the function call against the timeout
        return Promise.race([
          supabase.functions.invoke('get-event', {
            body: { id },
            headers: { 'Content-Type': 'application/json' }
          }),
          timeoutPromise
        ]);
      }, 2); // Retry up to 2 times (3 attempts total)

      // If we get here, the function call completed before the timeout
      const { data, error } = functionResult;

      if (error) {
        console.error('[ERROR] Error fetching event by ID:', error);
        endOperation(false);
        loadingManager.stopLoading(loadingId);
        return null;
      }

      if (!data?.event) {
        endOperation(false);
        loadingManager.stopLoading(loadingId);
        return null;
      }

      // Cache the event data
      eventCache.set(cacheKey, data.event);

      endOperation(true);
      loadingManager.stopLoading(loadingId);
      return data.event;
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.message === 'Request timed out') {
        console.error('[ERROR] Request timed out after', timeoutMs, 'ms');
        endOperation(false);
        loadingManager.stopLoading(loadingId);
        return null;
      }

      // Re-throw other errors to be caught by the outer try/catch
      throw error;
    }
  } catch (error) {
    console.error('[ERROR] Error getting event by ID:', error);
    endOperation(false);
    loadingManager.stopLoading(loadingId);
    return null;
  }
}
