/**
 * Event Cache Utility
 * 
 * This utility provides functions for caching event data to reduce API calls.
 * It uses localStorage for persistent caching between sessions.
 */

import type { Event } from '@/types';

// Cache configuration
const CACHE_PREFIX = 'dateai_event_cache_';
const SEARCH_CACHE_KEY = 'dateai_search_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_ITEMS = 50; // Maximum number of cached searches

// Cache entry interface
interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

// Search cache entry interface
interface SearchCacheEntry extends CacheEntry<{
  events: Event[];
  sourceStats?: any;
  meta?: any;
}> {
  key: string;
}

/**
 * Generate a cache key from search parameters
 * @param params - Search parameters
 * @returns Cache key
 */
export function generateSearchCacheKey(params: any): string {
  return JSON.stringify({
    location: params.location,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    categories: params.categories,
    keyword: params.keyword,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit
  });
}

/**
 * Check if a cache entry is valid (not expired)
 * @param entry - Cache entry
 * @returns Whether the cache entry is valid
 */
export function isCacheValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Get search results from cache
 * @param params - Search parameters
 * @returns Cached search results or null if not found
 */
export function getCachedSearchResults(params: any): {
  events: Event[];
  sourceStats?: any;
  meta?: any;
} | null {
  try {
    // Generate cache key
    const cacheKey = generateSearchCacheKey(params);
    
    // Get search cache from localStorage
    const searchCacheJson = localStorage.getItem(SEARCH_CACHE_KEY);
    if (!searchCacheJson) return null;
    
    const searchCache: SearchCacheEntry[] = JSON.parse(searchCacheJson);
    
    // Find the cache entry for this search
    const cacheEntry = searchCache.find(entry => entry.key === cacheKey);
    if (!cacheEntry) return null;
    
    // Check if the cache entry is still valid
    if (!isCacheValid(cacheEntry)) return null;
    
    console.log('[EVENT_CACHE] Returning cached search results');
    return cacheEntry.data;
  } catch (error) {
    console.error('[EVENT_CACHE] Error getting cached search results:', error);
    return null;
  }
}

/**
 * Cache search results
 * @param params - Search parameters
 * @param results - Search results
 */
export function cacheSearchResults(
  params: any,
  results: {
    events: Event[];
    sourceStats?: any;
    meta?: any;
  }
): void {
  try {
    // Generate cache key
    const cacheKey = generateSearchCacheKey(params);
    
    // Get existing search cache from localStorage
    const searchCacheJson = localStorage.getItem(SEARCH_CACHE_KEY);
    const searchCache: SearchCacheEntry[] = searchCacheJson ? JSON.parse(searchCacheJson) : [];
    
    // Remove existing entry with the same key
    const existingIndex = searchCache.findIndex(entry => entry.key === cacheKey);
    if (existingIndex !== -1) {
      searchCache.splice(existingIndex, 1);
    }
    
    // Add new entry
    searchCache.unshift({
      key: cacheKey,
      timestamp: Date.now(),
      data: results
    });
    
    // Limit the number of cached searches
    if (searchCache.length > MAX_CACHE_ITEMS) {
      searchCache.pop();
    }
    
    // Save to localStorage
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(searchCache));
    
    console.log('[EVENT_CACHE] Cached search results');
  } catch (error) {
    console.error('[EVENT_CACHE] Error caching search results:', error);
  }
}

/**
 * Get event details from cache
 * @param eventId - Event ID
 * @returns Cached event or null if not found
 */
export function getCachedEvent(eventId: string): Event | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${eventId}`;
    const eventCacheJson = localStorage.getItem(cacheKey);
    if (!eventCacheJson) return null;
    
    const eventCache: CacheEntry<Event> = JSON.parse(eventCacheJson);
    
    // Check if the cache entry is still valid
    if (!isCacheValid(eventCache)) return null;
    
    console.log(`[EVENT_CACHE] Returning cached event: ${eventId}`);
    return eventCache.data;
  } catch (error) {
    console.error('[EVENT_CACHE] Error getting cached event:', error);
    return null;
  }
}

/**
 * Cache event details
 * @param event - Event to cache
 */
export function cacheEvent(event: Event): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${event.id}`;
    
    // Create cache entry
    const cacheEntry: CacheEntry<Event> = {
      timestamp: Date.now(),
      data: event
    };
    
    // Save to localStorage
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    
    console.log(`[EVENT_CACHE] Cached event: ${event.id}`);
  } catch (error) {
    console.error('[EVENT_CACHE] Error caching event:', error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  try {
    // Clear expired search cache entries
    const searchCacheJson = localStorage.getItem(SEARCH_CACHE_KEY);
    if (searchCacheJson) {
      const searchCache: SearchCacheEntry[] = JSON.parse(searchCacheJson);
      const validSearchCache = searchCache.filter(entry => isCacheValid(entry));
      
      if (validSearchCache.length !== searchCache.length) {
        localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(validSearchCache));
        console.log(`[EVENT_CACHE] Cleared ${searchCache.length - validSearchCache.length} expired search cache entries`);
      }
    }
    
    // Clear expired event cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const eventCacheJson = localStorage.getItem(key);
        if (eventCacheJson) {
          const eventCache: CacheEntry<Event> = JSON.parse(eventCacheJson);
          if (!isCacheValid(eventCache)) {
            localStorage.removeItem(key);
            console.log(`[EVENT_CACHE] Cleared expired event cache: ${key}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[EVENT_CACHE] Error clearing expired cache:', error);
  }
}

/**
 * Initialize the event cache
 * This function should be called when the application starts
 */
export function initEventCache(): void {
  // Clear expired cache entries
  clearExpiredCache();
  
  // Set up periodic cache cleanup
  setInterval(clearExpiredCache, CACHE_TTL);
  
  console.log('[EVENT_CACHE] Initialized');
}
