/**
 * Metrics Service
 * 
 * Collects and reports metrics for API calls and cache performance
 */

interface ApiCallMetrics {
  requestId: string;
  duration: number;
  eventCount: number;
  sources: {
    ticketmaster: number;
    predictHQ: number;
  };
}

export class MetricsService {
  private apiCalls: Record<string, ApiCallMetrics> = {};
  private cacheHits = 0;
  private cacheMisses = 0;
  private startTime = Date.now();
  
  /**
   * Record an API call with metrics
   */
  recordApiCall(metrics: ApiCallMetrics): void {
    this.apiCalls[metrics.requestId] = metrics;
    
    // Log metrics for monitoring
    console.log(`[METRICS] API call ${metrics.requestId} completed in ${metrics.duration.toFixed(2)}ms with ${metrics.eventCount} events`);
    console.log(`[METRICS] Sources: Ticketmaster=${metrics.sources.ticketmaster}, PredictHQ=${metrics.sources.predictHQ}`);
  }
  
  /**
   * Record a cache hit
   */
  recordCacheHit(requestId: string): void {
    this.cacheHits++;
    console.log(`[METRICS] Cache hit for request ${requestId}`);
  }
  
  /**
   * Record a cache miss
   */
  recordCacheMiss(requestId: string): void {
    this.cacheMisses++;
    console.log(`[METRICS] Cache miss for request ${requestId}`);
  }
  
  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate
    };
  }
  
  /**
   * Get API call metrics
   */
  getApiCallMetrics(): { count: number; avgDuration: number; totalEvents: number } {
    const calls = Object.values(this.apiCalls);
    const count = calls.length;
    
    if (count === 0) {
      return { count: 0, avgDuration: 0, totalEvents: 0 };
    }
    
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
    const totalEvents = calls.reduce((sum, call) => sum + call.eventCount, 0);
    
    return {
      count,
      avgDuration: totalDuration / count,
      totalEvents
    };
  }
  
  /**
   * Get all metrics as a summary
   */
  getMetricsSummary(): Record<string, any> {
    const uptime = Date.now() - this.startTime;
    const cacheMetrics = this.getCacheMetrics();
    const apiMetrics = this.getApiCallMetrics();
    
    return {
      uptime,
      cache: cacheMetrics,
      api: apiMetrics,
      timestamp: new Date().toISOString()
    };
  }
}
