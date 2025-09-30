// Server-side request throttling and deduplication
const requestCache = new Map();
const activeRequests = new Map();

/**
 * Request throttling class to prevent duplicate API calls
 */
class RequestThrottle {
  constructor() {
    this.cache = new Map();
    this.activeRequests = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    this.maxActiveRequests = 5;
  }

  /**
   * Check if a request is already in progress
   */
  isRequestActive(url) {
    return this.activeRequests.has(url);
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(url) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Add request to active list
   */
  addActiveRequest(url, promise) {
    this.activeRequests.set(url, promise);
  }

  /**
   * Remove request from active list
   */
  removeActiveRequest(url) {
    this.activeRequests.delete(url);
  }

  /**
   * Cache response data
   */
  cacheResponse(url, data) {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clean up old cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [url, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * Get request count
   */
  getRequestCount() {
    return {
      active: this.activeRequests.size,
      cached: this.cache.size,
      maxActive: this.maxActiveRequests,
    };
  }
}

// Global request throttle instance
const requestThrottle = new RequestThrottle();

// Clean cache every 5 minutes
setInterval(() => {
  requestThrottle.cleanCache();
}, 5 * 60 * 1000);

/**
 * Enhanced API request function with throttling and caching
 */
const makeThrottledRequest = async (url, options = {}, maxRetries = 3) => {
  const requestKey = `${url}_${JSON.stringify(options)}`;

  // Check if request is already in progress
  if (requestThrottle.isRequestActive(requestKey)) {
    console.log(`🔄 Request already in progress for: ${url}, waiting...`);
    return await requestThrottle.activeRequests.get(requestKey);
  }

  // Check cache first
  const cachedResponse = requestThrottle.getCachedResponse(requestKey);
  if (cachedResponse) {
    console.log(`✅ Using cached response for: ${url}`);
    return cachedResponse;
  }

  // Check if we have too many active requests
  if (
    requestThrottle.activeRequests.size >= requestThrottle.maxActiveRequests
  ) {
    console.log(
      `⚠️ Too many active requests (${requestThrottle.activeRequests.size}), waiting...`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return makeThrottledRequest(url, options, maxRetries);
  }

  // Create the request promise
  const requestPromise = makeRequestWithRetry(url, options, maxRetries);

  // Add to active requests
  requestThrottle.addActiveRequest(requestKey, requestPromise);

  try {
    const response = await requestPromise;

    // Cache successful response
    requestThrottle.cacheResponse(requestKey, response);

    return response;
  } finally {
    // Remove from active requests
    requestThrottle.removeActiveRequest(requestKey);
  }
};

/**
 * Make request with retry logic and improved timeout handling
 */
const makeRequestWithRetry = async (url, options = {}, maxRetries = 5) => {
  const axios = require("axios");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 API Request attempt ${attempt}/${maxRetries} for ${url}`);

      const https = require("https");
      const dns = require("dns");

      const httpsAgent = new https.Agent({
        family: 4, // Force IPv4
        lookup: dns.lookup,
        keepAlive: true,
        maxSockets: 3, // Reduced from 5
        timeout: 5000, // Reduced timeout to 5 seconds
        rejectUnauthorized: true,
      });

      const requestOptions = {
        timeout: 30000, // 30 second timeout for production
        headers: {
          "User-Agent": "Trading-Pairs-Trend-Alert/1.0",
          Accept: "application/json",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
        },
        httpsAgent: httpsAgent,
        maxRedirects: 2, // Reduced redirects
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        },
        ...options,
      };

      const response = await axios.get(url, requestOptions);

      console.log(`✅ API Request successful on attempt ${attempt}`);
      return response;
    } catch (error) {
      console.error(`❌ API Request attempt ${attempt} failed:`, error.message);

      // Check if it's a retryable error
      const isRetryableError =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ENETUNREACH" ||
        error.message.includes("timeout") ||
        error.message.includes("Network Error");

      if (isRetryableError && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // If not retryable or max retries reached, throw error
      throw error;
    }
  }
};

/**
 * Get request statistics
 */
const getRequestStats = () => {
  return requestThrottle.getRequestCount();
};

module.exports = {
  makeThrottledRequest,
  makeRequestWithRetry,
  getRequestStats,
  requestThrottle,
};
