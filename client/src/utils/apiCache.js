// Simple in-memory cache with TTL support
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.ttlTimers = new Map();
  }

  // Set cache with TTL (time to live in milliseconds)
  set(key, value, ttl = 5 * 60 * 1000) { // Default 5 minutes
    // Clear existing timer if any
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set TTL timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.ttlTimers.set(key, timer);
  }

  // Get cached value
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.delete(key);
      return null;
    }

    return cached.value;
  }

  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Delete cached value
  delete(key) {
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
      this.ttlTimers.delete(key);
    }
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    // Clear all timers
    this.ttlTimers.forEach(timer => clearTimeout(timer));
    this.ttlTimers.clear();
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const apiCache = new ApiCache();

// Cache key generators
export const getCacheKey = {
  cryptos: (page, limit, spotOnly) => `cryptos_${page}_${limit}_${spotOnly}`,
  alerts: (page, limit) => `alerts_${page}_${limit}`,
  rsi: (symbol, period, timeframe) => `rsi_${symbol}_${period}_${timeframe}`,
  conditions: (symbol, filters) => `conditions_${symbol}_${JSON.stringify(filters)}`,
  marketData: (symbol) => `market_${symbol}`,
};

export default apiCache;
