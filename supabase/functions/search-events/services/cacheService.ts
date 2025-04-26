/**
 * Cache Service
 * 
 * Provides caching functionality for API responses with TTL support
 * Enhanced with persistent storage options and improved memory management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size?: number; // Size estimation in bytes
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache size
  private currentCacheSize = 0;
  private hitCount = 0;
  private missCount = 0;
  
  constructor() {
    this.cache = new Map();
    
    // Clean expired cache entries every minute
    setInterval(() => this.cleanExpiredEntries(), 60 * 1000);
    
    // Log cache stats every 5 minutes
    setInterval(() => this.logCacheStats(), 5 * 60 * 1000);
  }
  
  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (entry.size) {
        this.currentCacheSize -= entry.size;
      }
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return entry.data as T;
  }
  
  /**
   * Set a value in the cache with TTL
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const timestamp = Date.now();
    const expiresAt = timestamp + ttl;
    
    // Estimate size of the data in bytes
    const jsonData = JSON.stringify(data);
    const size = new TextEncoder().encode(jsonData).length;
    
    // Check if adding this item would exceed the max cache size
    // If so, evict items until we have enough space
    if (this.currentCacheSize + size > this.MAX_CACHE_SIZE) {
      this.evictItems(size);
    }
    
    // Add the new item to the cache
    this.cache.set(key, { data, timestamp, expiresAt, size });
    this.currentCacheSize += size;
  }
  
  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry && entry.size) {
      this.currentCacheSize -= entry.size;
    }
    return this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.currentCacheSize = 0;
  }
  
  /**
   * Clean expired cache entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let freedSpace = 0;
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        if (entry.size) {
          this.currentCacheSize -= entry.size;
          freedSpace += entry.size;
        }
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`[CACHE] Cleaned ${removedCount} expired entries, freed ${(freedSpace / 1024).toFixed(2)}KB`);
    }
  }
  
  /**
   * Evict items from the cache to make room for new items
   * Uses a simple LRU-like algorithm based on expiration time
   */
  private evictItems(requiredSpace: number): void {
    // Sort entries by expiration time (closest to expiring first)
    const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    
    let freedSpace = 0;
    let evictedCount = 0;
    
    // Remove entries until we have enough space
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      if (entry.size) {
        this.currentCacheSize -= entry.size;
        freedSpace += entry.size;
      }
      evictedCount++;
    }
    
    console.log(`[CACHE] Evicted ${evictedCount} entries to free ${(freedSpace / 1024).toFixed(2)}KB`);
  }
  
  /**
   * Log cache statistics
   */
  private logCacheStats(): void {
    const hitRate = (this.hitCount + this.missCount > 0) ? 
      (this.hitCount / (this.hitCount + this.missCount) * 100).toFixed(2) : '0';
    
    console.log(`[CACHE] Stats: ${this.cache.size} entries, ${(this.currentCacheSize / 1024 / 1024).toFixed(2)}MB used`);
    console.log(`[CACHE] Hit rate: ${hitRate}% (${this.hitCount} hits, ${this.missCount} misses)`);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): Record<string, any> {
    const hitRate = (this.hitCount + this.missCount > 0) ? 
      (this.hitCount / (this.hitCount + this.missCount) * 100) : 0;
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.currentCacheSize,
      memoryUsageMB: (this.currentCacheSize / 1024 / 1024).toFixed(2),
      maxSizeMB: (this.MAX_CACHE_SIZE / 1024 / 1024).toFixed(2),
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }
}
