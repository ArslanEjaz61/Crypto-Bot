/**
 * Ultra-Fast Binance WebSocket Service
 * Provides real-time price updates with <100ms latency
 */

class BinanceWebSocketService {
  constructor() {
    this.connections = new Map(); // symbol -> WebSocket connection
    this.subscribers = new Map(); // symbol -> Set of callbacks
    this.reconnectAttempts = new Map(); // symbol -> attempt count
    this.reconnectTimeouts = new Map(); // symbol -> timeout ID
    this.priceCache = new Map(); // symbol -> latest price data
    this.performanceMetrics = new Map(); // symbol -> performance data
    
    // Performance optimization settings
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.connectionTimeout = 10000;
    this.pingInterval = 30000; // Keep connections alive
    
    // Batch processing for multiple symbols
    this.batchSize = 100;
    this.streamBuffer = new Map();
    this.batchTimer = null;
    
    // Connection pooling
    this.connectionPool = new Set();
    this.maxConnections = 10;
    
    this.initializeGlobalStream();
  }

  /**
   * Initialize global ticker stream for all symbols
   * More efficient than individual connections
   */
  initializeGlobalStream() {
    const globalStreamUrl = 'wss://stream.binance.com:9443/ws/!ticker@arr';
    
    try {
      this.globalConnection = new WebSocket(globalStreamUrl);
      
      this.globalConnection.onopen = () => {
        console.log('🚀 Global Binance WebSocket connected - Ultra-fast mode enabled');
        this.startPerformanceMonitoring();
      };
      
      this.globalConnection.onmessage = (event) => {
        this.handleGlobalTickerUpdate(event);
      };
      
      this.globalConnection.onerror = (error) => {
        console.error('❌ Global WebSocket error:', error);
        this.reconnectGlobalStream();
      };
      
      this.globalConnection.onclose = () => {
        console.warn('⚠️ Global WebSocket disconnected - attempting reconnect');
        this.reconnectGlobalStream();
      };
      
      // Keep connection alive with ping
      this.pingInterval = setInterval(() => {
        if (this.globalConnection?.readyState === WebSocket.OPEN) {
          this.globalConnection.ping?.();
        }
      }, this.pingInterval);
      
    } catch (error) {
      console.error('❌ Failed to initialize global stream:', error);
      setTimeout(() => this.initializeGlobalStream(), 5000);
    }
  }

  /**
   * Handle global ticker updates with ultra-fast processing
   */
  handleGlobalTickerUpdate(event) {
    const startTime = performance.now();
    
    try {
      const tickers = JSON.parse(event.data);
      
      // Batch process all ticker updates
      const updates = new Map();
      
      tickers.forEach(ticker => {
        const symbol = ticker.s;
        const price = parseFloat(ticker.c);
        const priceChange24h = parseFloat(ticker.P);
        const volume24h = parseFloat(ticker.q);
        
        // Cache the latest data
        const priceData = {
          symbol,
          price,
          priceChange24h,
          volume24h,
          timestamp: Date.now(),
          high24h: parseFloat(ticker.h),
          low24h: parseFloat(ticker.l),
          open24h: parseFloat(ticker.o),
          count: parseInt(ticker.c),
          lastPrice: price
        };
        
        this.priceCache.set(symbol, priceData);
        
        // Check if we have subscribers for this symbol
        if (this.subscribers.has(symbol)) {
          updates.set(symbol, priceData);
        }
      });
      
      // Notify subscribers in batches for better performance
      this.batchNotifySubscribers(updates);
      
      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics('global_update', processingTime, tickers.length);
      
      // Ultra-fast processing target: <50ms for all tickers
      if (processingTime > 50) {
        console.warn(`⚠️ Slow processing detected: ${processingTime.toFixed(2)}ms for ${tickers.length} tickers`);
      }
      
    } catch (error) {
      console.error('❌ Error processing global ticker update:', error);
    }
  }

  /**
   * Batch notify subscribers for optimal performance
   */
  batchNotifySubscribers(updates) {
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
      updates.forEach((priceData, symbol) => {
        const callbacks = this.subscribers.get(symbol);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(priceData);
            } catch (error) {
              console.error(`❌ Error in subscriber callback for ${symbol}:`, error);
            }
          });
        }
      });
    });
  }

  /**
   * Subscribe to real-time price updates for a symbol
   */
  subscribe(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol).add(callback);
    
    // Send cached data immediately if available
    const cachedData = this.priceCache.get(symbol);
    if (cachedData) {
      // Use setTimeout to ensure async delivery
      setTimeout(() => callback(cachedData), 0);
    }
    
    console.log(`📡 Subscribed to ${symbol} - Real-time updates enabled`);
    
    // Return unsubscribe function
    return () => this.unsubscribe(symbol, callback);
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribe(symbol, callback) {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      
      // Clean up empty subscribers
      if (callbacks.size === 0) {
        this.subscribers.delete(symbol);
      }
    }
    
    console.log(`📡 Unsubscribed from ${symbol}`);
  }

  /**
   * Get latest cached price data
   */
  getLatestPrice(symbol) {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get multiple symbols' latest prices
   */
  getLatestPrices(symbols) {
    const prices = new Map();
    symbols.forEach(symbol => {
      const data = this.priceCache.get(symbol);
      if (data) {
        prices.set(symbol, data);
      }
    });
    return prices;
  }

  /**
   * Reconnect global stream with exponential backoff
   */
  reconnectGlobalStream() {
    const attempts = this.reconnectAttempts.get('global') || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached for global stream');
      return;
    }
    
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, attempts),
      this.maxReconnectDelay
    );
    
    this.reconnectAttempts.set('global', attempts + 1);
    
    console.log(`🔄 Reconnecting global stream in ${delay}ms (attempt ${attempts + 1})`);
    
    setTimeout(() => {
      this.initializeGlobalStream();
    }, delay);
  }

  /**
   * Performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      
      if (metrics.averageLatency > 100) {
        console.warn('⚠️ High latency detected:', metrics);
      }
      
      // Log performance every 30 seconds
      console.log('📊 WebSocket Performance:', {
        activeSubscriptions: this.subscribers.size,
        cachedSymbols: this.priceCache.size,
        averageLatency: `${metrics.averageLatency.toFixed(2)}ms`,
        updateRate: `${metrics.updatesPerSecond.toFixed(1)}/sec`
      });
    }, 30000);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(operation, latency, itemCount = 1) {
    const key = operation;
    const existing = this.performanceMetrics.get(key) || {
      totalLatency: 0,
      totalOperations: 0,
      totalItems: 0,
      lastUpdate: Date.now()
    };
    
    existing.totalLatency += latency;
    existing.totalOperations += 1;
    existing.totalItems += itemCount;
    existing.lastUpdate = Date.now();
    
    this.performanceMetrics.set(key, existing);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    let totalLatency = 0;
    let totalOperations = 0;
    let totalItems = 0;
    
    this.performanceMetrics.forEach(metrics => {
      totalLatency += metrics.totalLatency;
      totalOperations += metrics.totalOperations;
      totalItems += metrics.totalItems;
    });
    
    return {
      averageLatency: totalOperations > 0 ? totalLatency / totalOperations : 0,
      totalOperations,
      totalItems,
      updatesPerSecond: totalOperations / 30, // Approximate
      cacheSize: this.priceCache.size,
      activeSubscriptions: this.subscribers.size
    };
  }

  /**
   * Health check
   */
  getHealthStatus() {
    return {
      globalConnection: this.globalConnection?.readyState === WebSocket.OPEN,
      activeSubscriptions: this.subscribers.size,
      cachedSymbols: this.priceCache.size,
      connectionUptime: Date.now() - (this.connectionStartTime || Date.now()),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear intervals
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Close connections
    if (this.globalConnection) {
      this.globalConnection.close();
    }
    
    // Clear timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    
    // Clear data structures
    this.connections.clear();
    this.subscribers.clear();
    this.priceCache.clear();
    this.performanceMetrics.clear();
    
    console.log('🧹 WebSocket service destroyed');
  }
}

// Singleton instance for optimal performance
export const binanceWebSocket = new BinanceWebSocketService();
export default BinanceWebSocketService;
