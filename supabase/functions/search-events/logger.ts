/**
 * Logger utility for API key usage and monitoring
 */

interface LogEntry {
  timestamp: string;
  service: string;
  action: string;
  status: 'success' | 'error';
  details?: Record<string, unknown>;
}

interface UsageMetrics {
  requests: number;
  errors: number;
  lastUsed: Date;
  averageResponseTime: number;
  totalResponseTime: number;
}

// In-memory storage for metrics
const metricsStore = new Map<string, UsageMetrics>();

// In-memory circular buffer for recent logs
const MAX_LOG_ENTRIES = 1000;
const recentLogs: LogEntry[] = [];

/**
 * Add a log entry to the circular buffer
 */
function addLogEntry(entry: LogEntry): void {
  if (recentLogs.length >= MAX_LOG_ENTRIES) {
    recentLogs.shift(); // Remove oldest entry
  }
  recentLogs.push(entry);
}

/**
 * Update metrics for a service
 */
function updateMetrics(service: string, responseTime: number, isError: boolean): void {
  const metrics = metricsStore.get(service) || {
    requests: 0,
    errors: 0,
    lastUsed: new Date(),
    averageResponseTime: 0,
    totalResponseTime: 0
  };

  metrics.requests++;
  if (isError) {
    metrics.errors++;
  }
  metrics.lastUsed = new Date();
  metrics.totalResponseTime += responseTime;
  metrics.averageResponseTime = metrics.totalResponseTime / metrics.requests;

  metricsStore.set(service, metrics);
}

/**
 * Log an API key usage event
 */
export function logApiKeyUsage(
  service: string,
  action: string,
  status: 'success' | 'error',
  responseTime: number,
  details?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    service,
    action,
    status,
    details
  };

  // Add to circular buffer
  addLogEntry(entry);

  // Update metrics
  updateMetrics(service, responseTime, status === 'error');

  // Log to console for monitoring
  console.log(`[API_KEY_USAGE] ${service} - ${action} - ${status}`, {
    responseTime,
    ...details
  });
}

/**
 * Get recent logs for a service
 */
export function getRecentLogs(service?: string, limit = 100): LogEntry[] {
  const filteredLogs = service
    ? recentLogs.filter(log => log.service === service)
    : recentLogs;
  
  return filteredLogs.slice(-limit);
}

/**
 * Get metrics for a service
 */
export function getServiceMetrics(service: string): UsageMetrics | undefined {
  return metricsStore.get(service);
}

/**
 * Get metrics for all services
 */
export function getAllMetrics(): Record<string, UsageMetrics> {
  return Object.fromEntries(metricsStore.entries());
}

/**
 * Reset metrics for a service
 */
export function resetMetrics(service: string): void {
  metricsStore.delete(service);
}

/**
 * Calculate success rate for a service
 */
export function getSuccessRate(service: string): number {
  const metrics = metricsStore.get(service);
  if (!metrics || metrics.requests === 0) return 0;

  return ((metrics.requests - metrics.errors) / metrics.requests) * 100;
}

/**
 * Get health status for a service
 */
export function getServiceHealth(service: string): {
  status: 'healthy' | 'degraded' | 'failing';
  details: Record<string, unknown>;
} {
  const metrics = metricsStore.get(service);
  if (!metrics) {
    return {
      status: 'healthy', // No data = assume healthy
      details: { reason: 'No metrics available' }
    };
  }

  const successRate = getSuccessRate(service);
  const avgResponseTime = metrics.averageResponseTime;

  if (successRate < 90 || avgResponseTime > 2000) {
    return {
      status: 'failing',
      details: {
        successRate,
        avgResponseTime,
        reason: successRate < 90 ? 'High error rate' : 'High latency'
      }
    };
  }

  if (successRate < 95 || avgResponseTime > 1000) {
    return {
      status: 'degraded',
      details: {
        successRate,
        avgResponseTime,
        reason: successRate < 95 ? 'Elevated error rate' : 'Elevated latency'
      }
    };
  }

  return {
    status: 'healthy',
    details: {
      successRate,
      avgResponseTime
    }
  };
}