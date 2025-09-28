/**
 * Ultra-Fast Alert Hook
 * Integrates all performance optimizations for <100ms alert response time
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { binanceWebSocket } from '../services/BinanceWebSocketService';
import { fastAlertEngine } from '../services/FastAlertEngine';
import { workerManager } from '../services/WorkerManager';
import { networkOptimizer } from '../services/NetworkOptimizer';
import { notificationService } from '../services/NotificationService';

export const useUltraFastAlerts = () => {
  // State management with efficient data structures
  const [alerts, setAlerts] = useState(new Map());
  const [activeSymbols, setActiveSymbols] = useState(new Set());
  const [priceData, setPriceData] = useState(new Map());
  const [alertHistory, setAlertHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for stable references
  const alertsRef = useRef(new Map());
  const subscriptionsRef = useRef(new Map());
  const performanceRef = useRef({
    totalAlerts: 0,
    triggeredAlerts: 0,
    averageResponseTime: 0,
    lastResponseTime: 0
  });
  
  // Memoized configurations
  const config = useMemo(() => ({
    maxAlertHistory: 100,
    performanceUpdateInterval: 5000,
    priceUpdateThrottle: 16, // 60fps
    batchSize: 50
  }), []);

  /**
   * Initialize ultra-fast alert system
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    console.log('🚀 Initializing Ultra-Fast Alert System...');
    const startTime = performance.now();
    
    try {
      // Initialize all services in parallel for maximum speed
      await Promise.all([
        // WebSocket service is auto-initialized
        Promise.resolve(),
        
        // Initialize worker manager
        workerManager.initialize?.() || Promise.resolve(),
        
        // Initialize notification service
        notificationService.initialize?.() || Promise.resolve(),
        
        // Test network optimizer
        networkOptimizer.fetch('/api/health').catch(() => {})
      ]);
      
      // Setup alert engine callbacks
      setupAlertEngineCallbacks();
      
      // Setup performance monitoring
      setupPerformanceMonitoring();
      
      const initTime = performance.now() - startTime;
      console.log(`✅ Ultra-Fast Alert System initialized in ${initTime.toFixed(2)}ms`);
      
      setIsInitialized(true);
      
    } catch (error) {
      console.error('❌ Failed to initialize Ultra-Fast Alert System:', error);
      throw error;
    }
  }, [isInitialized]);

  /**
   * Setup alert engine callbacks
   */
  const setupAlertEngineCallbacks = useCallback(() => {
    // Alert triggered callback
    const unsubscribeAlert = fastAlertEngine.onAlert((alertData) => {
      handleAlertTriggered(alertData);
    });
    
    // Performance update callback
    const unsubscribePerformance = fastAlertEngine.onPerformanceUpdate((metrics) => {
      updatePerformanceMetrics(metrics);
    });
    
    // Store unsubscribe functions
    subscriptionsRef.current.set('alertEngine', [unsubscribeAlert, unsubscribePerformance]);
  }, []);

  /**
   * Setup performance monitoring
   */
  const setupPerformanceMonitoring = useCallback(() => {
    const interval = setInterval(() => {
      const metrics = {
        alerts: fastAlertEngine.getPerformanceMetrics(),
        webSocket: binanceWebSocket.getPerformanceMetrics(),
        workers: workerManager.getMetrics(),
        network: networkOptimizer.getMetrics(),
        notifications: notificationService.getMetrics()
      };
      
      setPerformanceMetrics(metrics);
      
      // Log performance summary
      const avgResponseTime = metrics.alerts.averageProcessingTime || 0;
      if (avgResponseTime > 100) {
        console.warn(`⚠️ Alert response time above target: ${avgResponseTime.toFixed(2)}ms`);
      }
      
    }, config.performanceUpdateInterval);
    
    subscriptionsRef.current.set('performanceMonitoring', [() => clearInterval(interval)]);
  }, [config.performanceUpdateInterval]);

  /**
   * Add alert with ultra-fast processing
   */
  const addAlert = useCallback(async (alertConfig) => {
    const startTime = performance.now();
    
    try {
      // Validate alert configuration
      if (!alertConfig.symbol || !alertConfig.targetValue) {
        throw new Error('Invalid alert configuration');
      }
      
      // Optimize alert structure
      const optimizedAlert = {
        id: alertConfig.id || generateAlertId(),
        symbol: alertConfig.symbol.toUpperCase(),
        targetValue: parseFloat(alertConfig.targetValue),
        direction: alertConfig.direction || '>',
        condition: alertConfig.condition || 'PRICE',
        basePrice: parseFloat(alertConfig.basePrice || alertConfig.currentPrice || 0),
        isActive: true,
        createdAt: new Date(),
        ...alertConfig
      };
      
      // Add to alert engine
      const success = fastAlertEngine.addAlert(optimizedAlert);
      if (!success) {
        throw new Error('Failed to add alert to processing engine');
      }
      
      // Update state
      const newAlerts = new Map(alertsRef.current);
      newAlerts.set(optimizedAlert.id, optimizedAlert);
      alertsRef.current = newAlerts;
      setAlerts(newAlerts);
      
      // Update active symbols
      const newSymbols = new Set(activeSymbols);
      newSymbols.add(optimizedAlert.symbol);
      setActiveSymbols(newSymbols);
      
      // Update performance metrics
      const processingTime = performance.now() - startTime;
      performanceRef.current.totalAlerts++;
      performanceRef.current.lastResponseTime = processingTime;
      
      console.log(`✅ Alert added in ${processingTime.toFixed(2)}ms: ${optimizedAlert.symbol}`);
      
      return optimizedAlert;
      
    } catch (error) {
      console.error('❌ Failed to add alert:', error);
      throw error;
    }
  }, [activeSymbols]);

  /**
   * Remove alert
   */
  const removeAlert = useCallback((alertId) => {
    const startTime = performance.now();
    
    try {
      // Remove from alert engine
      fastAlertEngine.removeAlert(alertId);
      
      // Update state
      const newAlerts = new Map(alertsRef.current);
      const alert = newAlerts.get(alertId);
      newAlerts.delete(alertId);
      alertsRef.current = newAlerts;
      setAlerts(newAlerts);
      
      // Update active symbols if no more alerts for this symbol
      if (alert) {
        const symbolHasOtherAlerts = Array.from(newAlerts.values())
          .some(a => a.symbol === alert.symbol);
        
        if (!symbolHasOtherAlerts) {
          const newSymbols = new Set(activeSymbols);
          newSymbols.delete(alert.symbol);
          setActiveSymbols(newSymbols);
        }
      }
      
      const processingTime = performance.now() - startTime;
      console.log(`🗑️ Alert removed in ${processingTime.toFixed(2)}ms: ${alertId}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to remove alert:', error);
      return false;
    }
  }, [activeSymbols]);

  /**
   * Handle alert triggered with ultra-fast response
   */
  const handleAlertTriggered = useCallback(async (alertData) => {
    const startTime = performance.now();
    
    try {
      console.log(`🚨 ULTRA-FAST ALERT TRIGGERED: ${alertData.symbol}`);
      
      // Update performance metrics
      performanceRef.current.triggeredAlerts++;
      
      // Add to history
      const newHistory = [alertData, ...alertHistory.slice(0, config.maxAlertHistory - 1)];
      setAlertHistory(newHistory);
      
      // Send instant notification
      await notificationService.sendNotification({
        title: `🚨 ${alertData.symbol} Alert`,
        body: `${alertData.conditionResult.reason}`,
        type: 'alert',
        sound: 'alert',
        data: {
          alertId: alertData.id,
          symbol: alertData.symbol,
          price: alertData.priceData.price,
          change: alertData.conditionResult.currentValue
        },
        requireInteraction: true
      });
      
      // Calculate total response time
      const totalResponseTime = performance.now() - startTime + (alertData.processingTime || 0);
      performanceRef.current.averageResponseTime = 
        (performanceRef.current.averageResponseTime + totalResponseTime) / 2;
      
      console.log(`⚡ Alert notification sent in ${totalResponseTime.toFixed(2)}ms`);
      
      // Target achieved if under 100ms
      if (totalResponseTime < 100) {
        console.log(`🎯 TARGET ACHIEVED: ${totalResponseTime.toFixed(2)}ms response time`);
      }
      
    } catch (error) {
      console.error('❌ Error handling triggered alert:', error);
    }
  }, [alertHistory, config.maxAlertHistory]);

  /**
   * Update performance metrics
   */
  const updatePerformanceMetrics = useCallback((metrics) => {
    performanceRef.current = {
      ...performanceRef.current,
      ...metrics
    };
  }, []);

  /**
   * Get real-time price for symbol
   */
  const getPrice = useCallback((symbol) => {
    return binanceWebSocket.getLatestPrice(symbol?.toUpperCase());
  }, []);

  /**
   * Get multiple prices efficiently
   */
  const getPrices = useCallback((symbols) => {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    return binanceWebSocket.getLatestPrices(upperSymbols);
  }, []);

  /**
   * Subscribe to real-time price updates
   */
  const subscribeToPrice = useCallback((symbol, callback) => {
    const upperSymbol = symbol.toUpperCase();
    
    // Throttle updates for smooth performance
    let lastUpdate = 0;
    const throttledCallback = (data) => {
      const now = performance.now();
      if (now - lastUpdate >= config.priceUpdateThrottle) {
        callback(data);
        lastUpdate = now;
      }
    };
    
    const unsubscribe = binanceWebSocket.subscribe(upperSymbol, throttledCallback);
    
    // Store subscription
    const symbolSubs = subscriptionsRef.current.get('priceSubscriptions') || new Map();
    symbolSubs.set(upperSymbol, unsubscribe);
    subscriptionsRef.current.set('priceSubscriptions', symbolSubs);
    
    return unsubscribe;
  }, [config.priceUpdateThrottle]);

  /**
   * Calculate technical indicators using worker
   */
  const calculateIndicator = useCallback(async (type, symbol, data, options = {}) => {
    try {
      switch (type.toLowerCase()) {
        case 'rsi':
          return await workerManager.calculateRSI(symbol, data, options.period || 14);
          
        case 'ema':
          return await workerManager.calculateEMA(symbol, data, options.period || 20);
          
        case 'volume':
          return await workerManager.analyzeVolume(data, options.lookback || 20);
          
        case 'patterns':
          return await workerManager.detectPatterns(data);
          
        default:
          throw new Error(`Unknown indicator type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Failed to calculate ${type} for ${symbol}:`, error);
      throw error;
    }
  }, []);

  /**
   * Batch process multiple alerts
   */
  const batchProcessAlerts = useCallback(async (alertConfigs) => {
    const startTime = performance.now();
    
    try {
      // Process alerts in batches for optimal performance
      const batches = [];
      for (let i = 0; i < alertConfigs.length; i += config.batchSize) {
        batches.push(alertConfigs.slice(i, i + config.batchSize));
      }
      
      const results = [];
      for (const batch of batches) {
        const batchPromises = batch.map(config => addAlert(config));
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }
      
      const processingTime = performance.now() - startTime;
      console.log(`📦 Batch processed ${alertConfigs.length} alerts in ${processingTime.toFixed(2)}ms`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      throw error;
    }
  }, [addAlert, config.batchSize]);

  /**
   * Get performance summary
   */
  const getPerformanceSummary = useCallback(() => {
    return {
      ...performanceRef.current,
      isOptimal: performanceRef.current.averageResponseTime < 100,
      systemHealth: {
        webSocket: binanceWebSocket.getHealthStatus(),
        alertEngine: fastAlertEngine.getStatus(),
        workers: workerManager.getMetrics(),
        network: networkOptimizer.getMetrics(),
        notifications: notificationService.getMetrics()
      }
    };
  }, []);

  /**
   * Generate unique alert ID
   */
  const generateAlertId = () => {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cleanup all subscriptions
      subscriptionsRef.current.forEach((unsubscribeFunctions) => {
        unsubscribeFunctions.forEach(unsubscribe => {
          try {
            unsubscribe();
          } catch (error) {
            console.warn('⚠️ Error during cleanup:', error);
          }
        });
      });
      
      console.log('🧹 Ultra-Fast Alert Hook cleaned up');
    };
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    initialize().catch(console.error);
  }, [initialize]);

  return {
    // State
    alerts: Array.from(alerts.values()),
    activeSymbols: Array.from(activeSymbols),
    alertHistory,
    performanceMetrics,
    isInitialized,
    
    // Actions
    addAlert,
    removeAlert,
    batchProcessAlerts,
    
    // Price data
    getPrice,
    getPrices,
    subscribeToPrice,
    
    // Technical analysis
    calculateIndicator,
    
    // Performance
    getPerformanceSummary,
    
    // System status
    isOptimal: performanceRef.current.averageResponseTime < 100
  };
};

export default useUltraFastAlerts;
