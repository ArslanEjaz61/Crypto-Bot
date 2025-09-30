/**
 * High-Performance Web Worker for Background Alert Processing
 * Handles heavy calculations without blocking the main thread
 */

// Performance monitoring
let workerMetrics = {
  tasksProcessed: 0,
  averageProcessingTime: 0,
  maxProcessingTime: 0,
  totalProcessingTime: 0,
  errorCount: 0,
  startTime: Date.now()
};

// Cache for expensive calculations
const calculationCache = new Map();
const CACHE_EXPIRY = 30000; // 30 seconds

// Technical indicator calculators
class TechnicalIndicators {
  /**
   * Ultra-fast RSI calculation using optimized algorithm
   */
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const startTime = performance.now();
    
    let gains = 0;
    let losses = 0;
    
    // Initial calculation
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI for the last price
    const rs = avgGain / (avgLoss || 0.000001);
    const rsi = 100 - (100 / (1 + rs));
    
    const processingTime = performance.now() - startTime;
    updateMetrics('rsi_calculation', processingTime);
    
    return {
      value: rsi,
      period,
      processingTime
    };
  }

  /**
   * Fast EMA calculation
   */
  static calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const startTime = performance.now();
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first EMA value
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    // Calculate EMA for remaining prices
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    const processingTime = performance.now() - startTime;
    updateMetrics('ema_calculation', processingTime);
    
    return {
      value: ema,
      period,
      processingTime
    };
  }

  /**
   * Volume analysis
   */
  static analyzeVolume(volumeData, lookbackPeriod = 20) {
    if (volumeData.length < lookbackPeriod) return null;
    
    const startTime = performance.now();
    
    const recent = volumeData.slice(-lookbackPeriod);
    const average = recent.reduce((sum, vol) => sum + vol, 0) / lookbackPeriod;
    const current = volumeData[volumeData.length - 1];
    
    const volumeRatio = current / average;
    const isVolumeSpike = volumeRatio > 2.0; // 2x average
    
    const processingTime = performance.now() - startTime;
    updateMetrics('volume_analysis', processingTime);
    
    return {
      current,
      average,
      ratio: volumeRatio,
      isSpike: isVolumeSpike,
      processingTime
    };
  }

  /**
   * Price pattern recognition
   */
  static detectPricePatterns(ohlcData) {
    if (ohlcData.length < 3) return null;
    
    const startTime = performance.now();
    const latest = ohlcData[ohlcData.length - 1];
    const { open, high, low, close } = latest;
    
    const bodySize = Math.abs(close - open);
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;
    const totalRange = high - low;
    
    const patterns = [];
    
    // Doji pattern
    if (bodySize <= totalRange * 0.1) {
      patterns.push('DOJI');
    }
    
    // Hammer pattern
    if (lowerWick > bodySize * 2 && upperWick < bodySize) {
      patterns.push('HAMMER');
    }
    
    // Shooting star
    if (upperWick > bodySize * 2 && lowerWick < bodySize) {
      patterns.push('SHOOTING_STAR');
    }
    
    const processingTime = performance.now() - startTime;
    updateMetrics('pattern_detection', processingTime);
    
    return {
      patterns,
      candle: latest,
      processingTime
    };
  }
}

// Alert condition evaluators
class ConditionEvaluators {
  /**
   * Fast percentage change evaluation
   */
  static evaluatePercentageChange(currentPrice, basePrice, targetPercent, direction) {
    const change = ((currentPrice - basePrice) / basePrice) * 100;
    let triggered = false;
    
    switch (direction) {
      case '>':
        triggered = change >= targetPercent;
        break;
      case '<':
        triggered = change <= targetPercent;
        break;
      case '<>':
        triggered = Math.abs(change) >= Math.abs(targetPercent);
        break;
    }
    
    return {
      triggered,
      currentChange: change,
      targetPercent,
      direction,
      currentPrice,
      basePrice
    };
  }

  /**
   * RSI condition evaluation
   */
  static evaluateRSI(rsiValue, targetLevel, condition) {
    let triggered = false;
    
    switch (condition) {
      case 'ABOVE':
        triggered = rsiValue >= targetLevel;
        break;
      case 'BELOW':
        triggered = rsiValue <= targetLevel;
        break;
      case 'OVERBOUGHT':
        triggered = rsiValue >= 70;
        break;
      case 'OVERSOLD':
        triggered = rsiValue <= 30;
        break;
    }
    
    return {
      triggered,
      currentRSI: rsiValue,
      targetLevel,
      condition
    };
  }

  /**
   * Combined condition evaluation
   */
  static evaluateCombined(conditions) {
    const results = [];
    let allMet = true;
    let anyMet = false;
    
    for (const condition of conditions) {
      let result = false;
      
      switch (condition.type) {
        case 'PRICE':
          result = condition.currentPrice >= condition.targetPrice;
          break;
        case 'PERCENTAGE':
          result = this.evaluatePercentageChange(
            condition.currentPrice,
            condition.basePrice,
            condition.targetPercent,
            condition.direction
          ).triggered;
          break;
        case 'RSI':
          result = this.evaluateRSI(
            condition.rsiValue,
            condition.targetLevel,
            condition.condition
          ).triggered;
          break;
      }
      
      results.push({ ...condition, result });
      
      if (!result) allMet = false;
      if (result) anyMet = true;
    }
    
    return {
      results,
      allMet,
      anyMet,
      logic: conditions.logic || 'AND'
    };
  }
}

// Cache management
function getCachedResult(key) {
  const cached = calculationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.result;
  }
  return null;
}

function setCachedResult(key, result) {
  calculationCache.set(key, {
    result,
    timestamp: Date.now()
  });
  
  // Cleanup old cache entries
  if (calculationCache.size > 1000) {
    const entries = Array.from(calculationCache.entries());
    const cutoff = Date.now() - CACHE_EXPIRY;
    
    entries.forEach(([key, value]) => {
      if (value.timestamp < cutoff) {
        calculationCache.delete(key);
      }
    });
  }
}

// Performance tracking
function updateMetrics(operation, processingTime) {
  workerMetrics.tasksProcessed++;
  workerMetrics.totalProcessingTime += processingTime;
  workerMetrics.averageProcessingTime = workerMetrics.totalProcessingTime / workerMetrics.tasksProcessed;
  
  if (processingTime > workerMetrics.maxProcessingTime) {
    workerMetrics.maxProcessingTime = processingTime;
  }
}

// Message handler
self.onmessage = function(e) {
  const startTime = performance.now();
  const { type, data, id } = e.data;
  
  try {
    let result = null;
    
    switch (type) {
      case 'CALCULATE_RSI':
        const cacheKey = `rsi_${data.symbol}_${data.period}_${data.prices.length}`;
        result = getCachedResult(cacheKey);
        
        if (!result) {
          result = TechnicalIndicators.calculateRSI(data.prices, data.period);
          setCachedResult(cacheKey, result);
        }
        break;
        
      case 'CALCULATE_EMA':
        const emaCacheKey = `ema_${data.symbol}_${data.period}_${data.prices.length}`;
        result = getCachedResult(emaCacheKey);
        
        if (!result) {
          result = TechnicalIndicators.calculateEMA(data.prices, data.period);
          setCachedResult(emaCacheKey, result);
        }
        break;
        
      case 'ANALYZE_VOLUME':
        result = TechnicalIndicators.analyzeVolume(data.volumeData, data.lookbackPeriod);
        break;
        
      case 'DETECT_PATTERNS':
        result = TechnicalIndicators.detectPricePatterns(data.ohlcData);
        break;
        
      case 'EVALUATE_CONDITION':
        switch (data.conditionType) {
          case 'PERCENTAGE':
            result = ConditionEvaluators.evaluatePercentageChange(
              data.currentPrice,
              data.basePrice,
              data.targetPercent,
              data.direction
            );
            break;
            
          case 'RSI':
            result = ConditionEvaluators.evaluateRSI(
              data.rsiValue,
              data.targetLevel,
              data.condition
            );
            break;
            
          case 'COMBINED':
            result = ConditionEvaluators.evaluateCombined(data.conditions);
            break;
        }
        break;
        
      case 'BATCH_PROCESS':
        result = data.tasks.map(task => {
          // Process each task individually
          const taskResult = processTask(task);
          return { taskId: task.id, result: taskResult };
        });
        break;
        
      case 'GET_METRICS':
        result = {
          ...workerMetrics,
          cacheSize: calculationCache.size,
          uptime: Date.now() - workerMetrics.startTime
        };
        break;
        
      case 'CLEAR_CACHE':
        calculationCache.clear();
        result = { success: true, message: 'Cache cleared' };
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    const processingTime = performance.now() - startTime;
    updateMetrics(type, processingTime);
    
    // Send result back to main thread
    self.postMessage({
      id,
      type: 'RESULT',
      result,
      processingTime,
      timestamp: Date.now()
    });
    
    // Performance warning
    if (processingTime > 50) {
      self.postMessage({
        type: 'WARNING',
        message: `Slow processing detected: ${processingTime.toFixed(2)}ms for ${type}`,
        processingTime
      });
    }
    
  } catch (error) {
    workerMetrics.errorCount++;
    
    self.postMessage({
      id,
      type: 'ERROR',
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  }
};

// Helper function to process individual tasks
function processTask(task) {
  switch (task.type) {
    case 'RSI':
      return TechnicalIndicators.calculateRSI(task.data.prices, task.data.period);
    case 'EMA':
      return TechnicalIndicators.calculateEMA(task.data.prices, task.data.period);
    case 'VOLUME':
      return TechnicalIndicators.analyzeVolume(task.data.volumeData);
    case 'PATTERNS':
      return TechnicalIndicators.detectPricePatterns(task.data.ohlcData);
    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

// Periodic cache cleanup
setInterval(() => {
  const sizeBefore = calculationCache.size;
  const cutoff = Date.now() - CACHE_EXPIRY;
  
  calculationCache.forEach((value, key) => {
    if (value.timestamp < cutoff) {
      calculationCache.delete(key);
    }
  });
  
  const cleaned = sizeBefore - calculationCache.size;
  if (cleaned > 0) {
    self.postMessage({
      type: 'INFO',
      message: `Cache cleanup: ${cleaned} entries removed`,
      cacheSize: calculationCache.size
    });
  }
}, 60000); // Every minute

// Send ready signal
self.postMessage({
  type: 'READY',
  message: 'Alert processing worker initialized',
  timestamp: Date.now()
});
