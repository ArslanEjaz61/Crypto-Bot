/**
 * Network Optimization Service
 * Implements connection pooling, request batching, and intelligent retry logic
 */

class NetworkOptimizer {
  constructor() {
    // Connection pool configuration
    this.maxConnections = 10;
    this.connectionPool = new Map(); // host -> connection info
    this.activeRequests = new Map(); // requestId -> request info
    this.requestQueue = [];
    this.batchQueue = new Map(); // endpoint -> requests[]
    
    // Batching configuration
    this.batchDelay = 50; // ms - delay before sending batch
    this.maxBatchSize = 100;
    this.batchTimers = new Map();
    
    // Retry configuration
    this.maxRetries = 3;
    this.baseRetryDelay = 1000; // ms
    this.maxRetryDelay = 10000; // ms
    this.retryableStatuses = [408, 429, 500, 502, 503, 504];
    
    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchesSent: 0,
      requestsSavedByBatching: 0
    };
    
    // Response cache
    this.responseCache = new Map();
    this.cacheExpiry = 30000; // 30 seconds
    this.maxCacheSize = 1000;
    
    // Request deduplication
    this.pendingRequests = new Map(); // key -> Promise
    
    this.initialize();
  }

  /**
   * Initialize the network optimizer
   */
  initialize() {
    console.log('🚀 NetworkOptimizer initialized - High-performance networking enabled');
    
    // Start periodic cleanup
    this.startCleanupIntervals();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    // Setup connection health monitoring
    this.startConnectionHealthCheck();
  }

  /**
   * Optimized fetch with connection pooling and retry logic
   */
  async fetch(url, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(url, options);
      const cachedResponse = this.getFromCache(cacheKey);
      
      if (cachedResponse) {
        this.metrics.cacheHits++;
        return cachedResponse;
      }
      
      this.metrics.cacheMisses++;
      
      // Check for duplicate requests
      const dedupeKey = this.getDedupeKey(url, options);
      if (this.pendingRequests.has(dedupeKey)) {
        console.log(`🔄 Deduplicating request: ${url}`);
        return await this.pendingRequests.get(dedupeKey);
      }
      
      // Create request promise
      const requestPromise = this.executeRequest(url, options, requestId);
      this.pendingRequests.set(dedupeKey, requestPromise);
      
      // Execute request
      const response = await requestPromise;
      
      // Cache successful responses
      if (response.ok) {
        this.setCache(cacheKey, response.clone());
      }
      
      // Update metrics
      const responseTime = performance.now() - startTime;
      this.updateMetrics(true, responseTime);
      
      // Cleanup
      this.pendingRequests.delete(dedupeKey);
      
      return response;
      
    } catch (error) {
      // Update metrics
      const responseTime = performance.now() - startTime;
      this.updateMetrics(false, responseTime);
      
      // Cleanup
      const dedupeKey = this.getDedupeKey(url, options);
      this.pendingRequests.delete(dedupeKey);
      
      throw error;
    }
  }

  /**
   * Execute request with retry logic
   */
  async executeRequest(url, options, requestId, attempt = 1) {
    try {
      // Apply connection pooling optimizations
      const optimizedOptions = this.optimizeRequestOptions(url, options);
      
      // Execute fetch
      const response = await fetch(url, optimizedOptions);
      
      // Check if retry is needed
      if (!response.ok && this.shouldRetry(response.status, attempt)) {
        return await this.retryRequest(url, options, requestId, attempt, response);
      }
      
      return response;
      
    } catch (error) {
      // Network error - retry if appropriate
      if (attempt < this.maxRetries) {
        return await this.retryRequest(url, options, requestId, attempt, null, error);
      }
      
      throw error;
    }
  }

  /**
   * Retry request with exponential backoff
   */
  async retryRequest(url, options, requestId, attempt, response = null, error = null) {
    const delay = Math.min(
      this.baseRetryDelay * Math.pow(2, attempt - 1),
      this.maxRetryDelay
    );
    
    console.warn(`🔄 Retrying request (${attempt}/${this.maxRetries}): ${url} after ${delay}ms`);
    this.metrics.retriedRequests++;
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the request
    return await this.executeRequest(url, options, requestId, attempt + 1);
  }

  /**
   * Batch multiple requests to the same endpoint
   */
  async batchRequest(endpoint, requests) {
    return new Promise((resolve, reject) => {
      // Add requests to batch queue
      if (!this.batchQueue.has(endpoint)) {
        this.batchQueue.set(endpoint, []);
      }
      
      const batch = this.batchQueue.get(endpoint);
      requests.forEach(request => {
        batch.push({ ...request, resolve, reject });
      });
      
      // Set timer to send batch
      if (!this.batchTimers.has(endpoint)) {
        const timer = setTimeout(() => {
          this.sendBatch(endpoint);
        }, this.batchDelay);
        
        this.batchTimers.set(endpoint, timer);
      }
      
      // Send immediately if batch is full
      if (batch.length >= this.maxBatchSize) {
        this.sendBatch(endpoint);
      }
    });
  }

  /**
   * Send batched requests
   */
  async sendBatch(endpoint) {
    const batch = this.batchQueue.get(endpoint);
    if (!batch || batch.length === 0) return;
    
    console.log(`📦 Sending batch request: ${batch.length} requests to ${endpoint}`);
    
    // Clear batch and timer
    this.batchQueue.delete(endpoint);
    const timer = this.batchTimers.get(endpoint);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(endpoint);
    }
    
    try {
      // Create batch request payload
      const batchPayload = {
        requests: batch.map(req => ({
          id: req.id,
          method: req.method || 'GET',
          params: req.params,
          data: req.data
        }))
      };
      
      // Send batch request
      const response = await this.fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchPayload)
      });
      
      const results = await response.json();
      
      // Distribute results to individual request promises
      results.forEach(result => {
        const originalRequest = batch.find(req => req.id === result.id);
        if (originalRequest) {
          if (result.error) {
            originalRequest.reject(new Error(result.error));
          } else {
            originalRequest.resolve(result.data);
          }
        }
      });
      
      // Update metrics
      this.metrics.batchesSent++;
      this.metrics.requestsSavedByBatching += batch.length - 1;
      
    } catch (error) {
      // Reject all requests in the batch
      batch.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Optimize request options for connection pooling
   */
  optimizeRequestOptions(url, options) {
    const optimized = { ...options };
    
    // Add keep-alive header
    if (!optimized.headers) {
      optimized.headers = {};
    }
    
    optimized.headers['Connection'] = 'keep-alive';
    optimized.headers['Keep-Alive'] = 'timeout=30, max=100';
    
    // Add compression support
    optimized.headers['Accept-Encoding'] = 'gzip, deflate, br';
    
    // Set reasonable timeout
    if (!optimized.timeout) {
      optimized.timeout = 15000; // 15 seconds
    }
    
    return optimized;
  }

  /**
   * Check if request should be retried
   */
  shouldRetry(status, attempt) {
    return attempt < this.maxRetries && this.retryableStatuses.includes(status);
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key
   */
  getCacheKey(url, options) {
    const method = options.method || 'GET';
    const headers = JSON.stringify(options.headers || {});
    const body = options.body || '';
    
    return `${method}:${url}:${headers}:${body}`;
  }

  /**
   * Generate deduplication key
   */
  getDedupeKey(url, options) {
    return this.getCacheKey(url, options);
  }

  /**
   * Get response from cache
   */
  getFromCache(key) {
    const cached = this.responseCache.get(key);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.responseCache.delete(key);
      return null;
    }
    
    return cached.response.clone();
  }

  /**
   * Set response in cache
   */
  setCache(key, response) {
    // Check cache size limit
    if (this.responseCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.responseCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      toRemove.forEach(([key]) => {
        this.responseCache.delete(key);
      });
    }
    
    this.responseCache.set(key, {
      response: response.clone(),
      timestamp: Date.now()
    });
  }

  /**
   * Update performance metrics
   */
  updateMetrics(success, responseTime) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = 
      this.metrics.totalResponseTime / this.metrics.totalRequests;
  }

  /**
   * Start cleanup intervals
   */
  startCleanupIntervals() {
    // Cache cleanup every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
    
    // Connection pool cleanup every 2 minutes
    setInterval(() => {
      this.cleanupConnectionPool();
    }, 2 * 60 * 1000);
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const sizeBefore = this.responseCache.size;
    const now = Date.now();
    
    this.responseCache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheExpiry) {
        this.responseCache.delete(key);
      }
    });
    
    const cleaned = sizeBefore - this.responseCache.size;
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: ${cleaned} expired entries removed`);
    }
  }

  /**
   * Cleanup connection pool
   */
  cleanupConnectionPool() {
    // Remove stale connections
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    this.connectionPool.forEach((connection, host) => {
      if (now - connection.lastUsed > staleThreshold) {
        this.connectionPool.delete(host);
        console.log(`🧹 Removed stale connection: ${host}`);
      }
    });
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const metrics = this.getMetrics();
      
      console.log('📊 Network Performance:', {
        totalRequests: metrics.totalRequests,
        successRate: `${metrics.successRate.toFixed(1)}%`,
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
        cacheHitRate: `${metrics.cacheHitRate.toFixed(1)}%`,
        batchesSent: metrics.batchesSent,
        requestsSaved: metrics.requestsSavedByBatching
      });
      
      // Reset counters for next interval
      this.metrics.totalRequests = 0;
      this.metrics.successfulRequests = 0;
      this.metrics.failedRequests = 0;
      this.metrics.totalResponseTime = 0;
      this.metrics.batchesSent = 0;
      this.metrics.requestsSavedByBatching = 0;
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Start connection health monitoring
   */
  startConnectionHealthCheck() {
    setInterval(async () => {
      // Check connection health for active endpoints
      const healthChecks = Array.from(this.connectionPool.keys()).map(async host => {
        try {
          const response = await fetch(`${host}/health`, {
            method: 'HEAD',
            timeout: 15000 // Increased to 15 seconds
          });
          
          return { host, healthy: response.ok };
        } catch (error) {
          return { host, healthy: false };
        }
      });
      
      const results = await Promise.allSettled(healthChecks);
      results.forEach(result => {
        if (result.status === 'fulfilled' && !result.value.healthy) {
          console.warn(`⚠️ Unhealthy connection detected: ${result.value.host}`);
          this.connectionPool.delete(result.value.host);
        }
      });
      
    }, 60000); // Every minute
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const total = this.metrics.totalRequests || 1;
    
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / total) * 100,
      failureRate: (this.metrics.failedRequests / total) * 100,
      retryRate: (this.metrics.retriedRequests / total) * 100,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
      cacheSize: this.responseCache.size,
      activeConnections: this.connectionPool.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.responseCache.clear();
    console.log('✅ Response cache cleared');
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchesSent: 0,
      requestsSavedByBatching: 0
    };
    
    console.log('✅ Network metrics reset');
  }

  /**
   * Destroy network optimizer
   */
  destroy() {
    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    
    // Clear all data structures
    this.connectionPool.clear();
    this.activeRequests.clear();
    this.requestQueue = [];
    this.batchQueue.clear();
    this.responseCache.clear();
    this.pendingRequests.clear();
    
    console.log('🧹 NetworkOptimizer destroyed');
  }
}

// Singleton instance
export const networkOptimizer = new NetworkOptimizer();
export default NetworkOptimizer;
