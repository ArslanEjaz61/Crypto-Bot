/**
 * Ultra-Fast Client-Side Alert Processing Engine
 * Target: <100ms alert response time
 */

import { binanceWebSocket } from './BinanceWebSocketService';

class FastAlertEngine {
  constructor() {
    // Optimized data structures for O(1) lookups
    this.alerts = new Map(); // alertId -> alert config
    this.symbolAlerts = new Map(); // symbol -> Set of alertIds
    this.activeSubscriptions = new Set(); // active symbol subscriptions
    this.alertHistory = new Map(); // alertId -> last trigger data
    this.conditionCache = new Map(); // cache for expensive calculations
    
    // Performance optimization settings
    this.debounceDelay = 100; // ms - prevent spam alerts
    this.cacheExpiry = 5000; // ms - cache expensive calculations
    this.maxHistorySize = 1000; // limit memory usage
    
    // Batch processing
    this.processingQueue = [];
    this.processingTimer = null;
    this.batchSize = 50;
    
    // Performance metrics
    this.metrics = {
      alertsProcessed: 0,
      alertsTriggered: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      cacheHitRate: 0,
      totalCacheRequests: 0,
      cacheHits: 0
    };
    
    // Alert callbacks
    this.alertCallbacks = new Set();
    this.performanceCallbacks = new Set();
    
    this.initializeEngine();
  }

  /**
   * Initialize the alert processing engine
   */
  initializeEngine() {
    console.log('🚀 FastAlertEngine initialized - Ultra-fast processing enabled');
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    // Setup cleanup intervals
    this.setupCleanupIntervals();
  }

  /**
   * Add alert to processing engine
   */
  addAlert(alert) {
    const alertId = alert.id || alert._id;
    const symbol = alert.symbol;
    
    // Validate alert configuration
    if (!this.validateAlert(alert)) {
      console.error('❌ Invalid alert configuration:', alert);
      return false;
    }
    
    // Store alert with optimized structure
    const optimizedAlert = this.optimizeAlertStructure(alert);
    this.alerts.set(alertId, optimizedAlert);
    
    // Index by symbol for fast lookups
    if (!this.symbolAlerts.has(symbol)) {
      this.symbolAlerts.set(symbol, new Set());
    }
    this.symbolAlerts.get(symbol).add(alertId);
    
    // Subscribe to real-time data if not already subscribed
    if (!this.activeSubscriptions.has(symbol)) {
      this.subscribeToSymbol(symbol);
    }
    
    console.log(`✅ Alert added: ${symbol} - ${alert.condition} (ID: ${alertId})`);
    return true;
  }

  /**
   * Remove alert from processing engine
   */
  removeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    const symbol = alert.symbol;
    
    // Remove from data structures
    this.alerts.delete(alertId);
    this.symbolAlerts.get(symbol)?.delete(alertId);
    this.alertHistory.delete(alertId);
    
    // Cleanup empty symbol subscriptions
    if (this.symbolAlerts.get(symbol)?.size === 0) {
      this.symbolAlerts.delete(symbol);
      this.unsubscribeFromSymbol(symbol);
    }
    
    console.log(`🗑️ Alert removed: ${alertId}`);
    return true;
  }

  /**
   * Subscribe to symbol price updates
   */
  subscribeToSymbol(symbol) {
    const unsubscribe = binanceWebSocket.subscribe(symbol, (priceData) => {
      this.processPriceUpdate(symbol, priceData);
    });
    
    this.activeSubscriptions.add(symbol);
    console.log(`📡 Subscribed to real-time updates: ${symbol}`);
    
    return unsubscribe;
  }

  /**
   * Unsubscribe from symbol price updates
   */
  unsubscribeFromSymbol(symbol) {
    // WebSocket service handles unsubscription internally
    this.activeSubscriptions.delete(symbol);
    console.log(`📡 Unsubscribed from updates: ${symbol}`);
  }

  /**
   * Process price update with ultra-fast algorithms
   */
  processPriceUpdate(symbol, priceData) {
    const startTime = performance.now();
    
    try {
      const symbolAlertIds = this.symbolAlerts.get(symbol);
      if (!symbolAlertIds || symbolAlertIds.size === 0) return;
      
      // Process all alerts for this symbol in parallel
      const processingPromises = Array.from(symbolAlertIds).map(alertId => 
        this.processAlertCondition(alertId, priceData)
      );
      
      // Use Promise.allSettled for better error handling
      Promise.allSettled(processingPromises).then(results => {
        const errors = results.filter(r => r.status === 'rejected');
        if (errors.length > 0) {
          console.warn(`⚠️ ${errors.length} alert processing errors for ${symbol}`);
        }
      });
      
      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime, symbolAlertIds.size);
      
      // Target: <50ms processing time
      if (processingTime > 50) {
        console.warn(`⚠️ Slow alert processing: ${processingTime.toFixed(2)}ms for ${symbol}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing price update for ${symbol}:`, error);
    }
  }

  /**
   * Process individual alert condition with caching
   */
  async processAlertCondition(alertId, priceData) {
    const alert = this.alerts.get(alertId);
    if (!alert) return;
    
    const startTime = performance.now();
    
    try {
      // Check cache first for expensive calculations
      const cacheKey = `${alertId}_${priceData.timestamp}`;
      this.metrics.totalCacheRequests++;
      
      let conditionResult = this.conditionCache.get(cacheKey);
      if (conditionResult !== undefined) {
        this.metrics.cacheHits++;
        return conditionResult;
      }
      
      // Fast condition evaluation
      conditionResult = await this.evaluateCondition(alert, priceData);
      
      // Cache result with expiry
      this.conditionCache.set(cacheKey, conditionResult);
      setTimeout(() => this.conditionCache.delete(cacheKey), this.cacheExpiry);
      
      // Check if alert should trigger
      if (conditionResult.shouldTrigger && this.shouldTriggerAlert(alert, priceData)) {
        await this.triggerAlert(alert, priceData, conditionResult);
      }
      
      // Update processing metrics
      const processingTime = performance.now() - startTime;
      if (processingTime > 10) { // Target: <10ms per alert
        console.warn(`⚠️ Slow alert condition: ${processingTime.toFixed(2)}ms for ${alert.symbol}`);
      }
      
      return conditionResult;
      
    } catch (error) {
      console.error(`❌ Error processing alert ${alertId}:`, error);
      return { shouldTrigger: false, error: error.message };
    }
  }

  /**
   * Ultra-fast condition evaluation
   */
  async evaluateCondition(alert, priceData) {
    const { condition, targetValue, direction, symbol } = alert;
    const currentPrice = priceData.price;
    
    switch (condition.type) {
      case 'PRICE':
        return this.evaluatePriceCondition(currentPrice, targetValue, direction);
        
      case 'PERCENTAGE':
        return this.evaluatePercentageCondition(alert, priceData);
        
      case 'RSI':
        return await this.evaluateRSICondition(alert, priceData);
        
      case 'VOLUME':
        return this.evaluateVolumeCondition(alert, priceData);
        
      case 'COMBINED':
        return await this.evaluateCombinedCondition(alert, priceData);
        
      default:
        console.warn(`⚠️ Unknown condition type: ${condition.type}`);
        return { shouldTrigger: false, reason: 'Unknown condition type' };
    }
  }

  /**
   * Fast price condition evaluation
   */
  evaluatePriceCondition(currentPrice, targetValue, direction) {
    let shouldTrigger = false;
    let reason = '';
    
    switch (direction) {
      case '>':
      case 'ABOVE':
        shouldTrigger = currentPrice >= targetValue;
        reason = `Price ${currentPrice} >= ${targetValue}`;
        break;
        
      case '<':
      case 'BELOW':
        shouldTrigger = currentPrice <= targetValue;
        reason = `Price ${currentPrice} <= ${targetValue}`;
        break;
        
      case '<>':
      case 'EITHER':
        shouldTrigger = currentPrice >= targetValue || currentPrice <= targetValue;
        reason = `Price ${currentPrice} reached target ${targetValue}`;
        break;
    }
    
    return {
      shouldTrigger,
      reason,
      currentValue: currentPrice,
      targetValue,
      direction
    };
  }

  /**
   * Fast percentage change evaluation
   */
  evaluatePercentageCondition(alert, priceData) {
    const { basePrice, targetValue, direction } = alert;
    const currentPrice = priceData.price;
    
    const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;
    let shouldTrigger = false;
    let reason = '';
    
    switch (direction) {
      case '>':
        shouldTrigger = percentageChange >= targetValue;
        reason = `Change ${percentageChange.toFixed(2)}% >= ${targetValue}%`;
        break;
        
      case '<':
        shouldTrigger = percentageChange <= targetValue;
        reason = `Change ${percentageChange.toFixed(2)}% <= ${targetValue}%`;
        break;
        
      case '<>':
        shouldTrigger = Math.abs(percentageChange) >= Math.abs(targetValue);
        reason = `Change ${Math.abs(percentageChange).toFixed(2)}% >= ${Math.abs(targetValue)}%`;
        break;
    }
    
    return {
      shouldTrigger,
      reason,
      currentValue: percentageChange,
      targetValue,
      direction,
      basePrice,
      currentPrice
    };
  }

  /**
   * Check if alert should trigger (debouncing and rate limiting)
   */
  shouldTriggerAlert(alert, priceData) {
    const alertId = alert.id;
    const now = Date.now();
    const lastTrigger = this.alertHistory.get(alertId);
    
    // Debouncing: prevent spam alerts
    if (lastTrigger && (now - lastTrigger.timestamp) < this.debounceDelay) {
      return false;
    }
    
    // Rate limiting based on alert configuration
    if (alert.cooldownMs && lastTrigger && (now - lastTrigger.timestamp) < alert.cooldownMs) {
      return false;
    }
    
    return true;
  }

  /**
   * Trigger alert with ultra-fast notification
   */
  async triggerAlert(alert, priceData, conditionResult) {
    const startTime = performance.now();
    const alertId = alert.id;
    
    try {
      // Update alert history
      this.alertHistory.set(alertId, {
        timestamp: Date.now(),
        priceData,
        conditionResult,
        alertConfig: alert
      });
      
      // Prepare alert data
      const alertData = {
        id: alertId,
        symbol: alert.symbol,
        condition: alert.condition,
        priceData,
        conditionResult,
        timestamp: Date.now(),
        processingTime: performance.now() - startTime
      };
      
      // Notify all registered callbacks (non-blocking)
      this.notifyAlertCallbacks(alertData);
      
      // Update metrics
      this.metrics.alertsTriggered++;
      
      console.log(`🚨 ALERT TRIGGERED: ${alert.symbol} - ${conditionResult.reason}`);
      
      // Cleanup old history to prevent memory leaks
      if (this.alertHistory.size > this.maxHistorySize) {
        this.cleanupAlertHistory();
      }
      
    } catch (error) {
      console.error(`❌ Error triggering alert ${alertId}:`, error);
    }
  }

  /**
   * Notify alert callbacks asynchronously
   */
  notifyAlertCallbacks(alertData) {
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alertData);
        } catch (error) {
          console.error('❌ Error in alert callback:', error);
        }
      });
    });
  }

  /**
   * Optimize alert structure for fast processing
   */
  optimizeAlertStructure(alert) {
    return {
      id: alert.id || alert._id,
      symbol: alert.symbol,
      condition: {
        type: alert.targetType?.toUpperCase() || 'PRICE',
        value: alert.targetValue,
        direction: alert.direction
      },
      targetValue: parseFloat(alert.targetValue),
      direction: alert.direction,
      basePrice: parseFloat(alert.basePrice || alert.currentPrice),
      cooldownMs: alert.cooldownMs || 60000, // 1 minute default
      isActive: alert.isActive !== false,
      createdAt: alert.createdAt || new Date(),
      
      // Pre-calculate expensive values
      _optimized: true,
      _cacheKey: `${alert.symbol}_${alert.targetValue}_${alert.direction}`
    };
  }

  /**
   * Validate alert configuration
   */
  validateAlert(alert) {
    if (!alert.symbol || !alert.targetValue || !alert.direction) {
      return false;
    }
    
    if (typeof alert.targetValue !== 'number' && isNaN(parseFloat(alert.targetValue))) {
      return false;
    }
    
    return true;
  }

  /**
   * Register alert callback
   */
  onAlert(callback) {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  /**
   * Register performance callback
   */
  onPerformanceUpdate(callback) {
    this.performanceCallbacks.add(callback);
    return () => this.performanceCallbacks.delete(callback);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(processingTime, alertCount = 1) {
    this.metrics.alertsProcessed += alertCount;
    this.metrics.lastProcessingTime = processingTime;
    
    // Calculate running average
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.alertsProcessed - alertCount);
    this.metrics.averageProcessingTime = (totalTime + processingTime) / this.metrics.alertsProcessed;
    
    // Update cache hit rate
    this.metrics.cacheHitRate = this.metrics.totalCacheRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalCacheRequests) * 100 
      : 0;
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      
      // Notify performance callbacks
      this.performanceCallbacks.forEach(callback => {
        try {
          callback(metrics);
        } catch (error) {
          console.error('❌ Error in performance callback:', error);
        }
      });
      
      // Log performance every 30 seconds
      console.log('📊 Alert Engine Performance:', {
        alertsProcessed: metrics.alertsProcessed,
        alertsTriggered: metrics.alertsTriggered,
        averageProcessingTime: `${metrics.averageProcessingTime.toFixed(2)}ms`,
        cacheHitRate: `${metrics.cacheHitRate.toFixed(1)}%`,
        activeAlerts: this.alerts.size,
        activeSubscriptions: this.activeSubscriptions.size
      });
      
      // Reset counters for next interval
      this.metrics.alertsProcessed = 0;
      this.metrics.alertsTriggered = 0;
      
    }, 30000);
  }

  /**
   * Setup cleanup intervals
   */
  setupCleanupIntervals() {
    // Cleanup cache every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
    
    // Cleanup alert history every 10 minutes
    setInterval(() => {
      this.cleanupAlertHistory();
    }, 10 * 60 * 1000);
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const sizeBefore = this.conditionCache.size;
    // Cache cleanup is handled by individual timeouts
    const sizeAfter = this.conditionCache.size;
    
    if (sizeBefore !== sizeAfter) {
      console.log(`🧹 Cache cleanup: ${sizeBefore - sizeAfter} entries removed`);
    }
  }

  /**
   * Cleanup old alert history
   */
  cleanupAlertHistory() {
    if (this.alertHistory.size <= this.maxHistorySize) return;
    
    const entries = Array.from(this.alertHistory.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, this.maxHistorySize);
    
    this.alertHistory.clear();
    entries.forEach(([key, value]) => {
      this.alertHistory.set(key, value);
    });
    
    console.log(`🧹 Alert history cleanup: kept ${this.maxHistorySize} most recent entries`);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      activeAlerts: this.alerts.size,
      activeSubscriptions: this.activeSubscriptions.size,
      cacheSize: this.conditionCache.size,
      historySize: this.alertHistory.size,
      timestamp: Date.now()
    };
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      isRunning: true,
      alerts: this.alerts.size,
      subscriptions: this.activeSubscriptions.size,
      performance: this.getPerformanceMetrics(),
      health: 'optimal'
    };
  }

  /**
   * Destroy engine and cleanup resources
   */
  destroy() {
    // Clear all data structures
    this.alerts.clear();
    this.symbolAlerts.clear();
    this.alertHistory.clear();
    this.conditionCache.clear();
    this.alertCallbacks.clear();
    this.performanceCallbacks.clear();
    
    // Unsubscribe from all symbols
    this.activeSubscriptions.forEach(symbol => {
      this.unsubscribeFromSymbol(symbol);
    });
    this.activeSubscriptions.clear();
    
    console.log('🧹 FastAlertEngine destroyed');
  }
}

// Singleton instance for optimal performance
export const fastAlertEngine = new FastAlertEngine();
export default FastAlertEngine;
