const mongoose = require('mongoose');

const alertSchema = mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
    },
    // Basic alert conditions
    direction: {
      type: String,
      enum: ['>', '<', '<>'], // Up, Down, Either way
      required: true,
    },
    targetType: {
      type: String,
      enum: ['price', 'percentage'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    // Tracking options
    trackingMode: {
      type: String,
      enum: ['current', 'interval'],
      default: 'current',
    },
    intervalMinutes: {
      type: Number,
      default: 0,
    },
    // Candle conditions
    candleTimeframe: {
      type: String,
      enum: ['5MIN', '15MIN', '1HR', '4HR', '12HR', 'D', 'W'],
      default: '1HR',
    },
    candleCondition: {
      type: String,
      enum: ['ABOVE_OPEN', 'BELOW_OPEN', 'NONE'],
      default: 'NONE',
    },
    
    // RSI conditions
    rsiEnabled: {
      type: Boolean,
      default: false,
    },
    rsiTimeframe: {
      type: String,
      enum: ['5MIN', '15MIN', '1HR', '4HR', '12HR', 'D'],
      default: '1HR',
    },
    rsiPeriod: {
      type: Number,
      default: 0,
    },
    rsiCondition: {
      type: String,
      enum: ['ABOVE', 'BELOW', 'CROSSING_UP', 'CROSSING_DOWN', 'NONE'],
      default: 'NONE',
    },
    rsiLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // EMA Fast/Slow conditions
    emaEnabled: {
      type: Boolean,
      default: false,
    },
    emaTimeframe: {
      type: String,
      enum: ['5MIN', '15MIN', '1HR', '4HR', '12HR', 'D'],
      default: '1HR',
    },
    emaFastPeriod: {
      type: Number,
      default: 0,
    },
    emaSlowPeriod: {
      type: Number,
      default: 0,
    },
    emaCondition: {
      type: String,
      enum: ['ABOVE', 'BELOW', 'CROSSING_UP', 'CROSSING_DOWN', 'NONE'],
      default: 'NONE',
    },
    
    // Volume conditions
    volumeEnabled: {
      type: Boolean,
      default: false,
    },
    volumeChangeRequired: {
      type: Number,
      default: 0, // 0 means no volume change tracking
    },
    volumeSpikeMultiplier: {
      type: Number,
      default: 0, // 0 means no volume spike checking
    },
    
    // Market filters
    market: {
      type: String,
      enum: ['SPOT', 'FUTURES', 'MARGIN', 'ALL'],
      default: 'SPOT',
    },
    exchange: {
      type: String,
      default: 'BINANCE',
    },
    tradingPair: {
      type: String,
      enum: ['USDT', 'BTC', 'ETH', 'OTHER', 'ALL'],
      default: 'USDT',
    },
    minDailyVolume: {
      type: Number,
      default: 0, // 0 means no minimum volume requirement
    },
    
    // Display chart settings
    displayChartTimeframe: {
      type: String,
      enum: ['1HR', '4HR', 'D', 'W'],
      default: '1HR',
    },
    
    // Change percentage settings
    changePercentTimeframe: {
      type: String,
      enum: ['1MIN', '5MIN', '15MIN', '1HR'],
      default: '1MIN',
    },
    changePercentValue: {
      type: Number,
      default: 0,
    },
    
    // Alert count settings
    alertCountTimeframe: {
      type: String,
      enum: ['5MIN', '15MIN', '1HR'],
      default: '5MIN',
    },
    
    // Basic alert settings
    alertTime: {
      type: String, // Store as HH:MM format
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    comment: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
    },
    
    // Notification tracking
    notificationStatus: {
      type: Object,
      default: {},
      // Structure: { telegram: { sent: Boolean, sentAt: Date, error: String } }
    },
  },
  {
    timestamps: true,
  }
);

// Add a method to check if the alert should be triggered
alertSchema.methods.shouldTrigger = function(data) {
  // Destructure market data parameters
  const { 
    currentPrice, 
    currentVolume, 
    previousPrice, 
    previousVolume,
    candle,
    rsi,
    emaData,
    volumeHistory,
    marketData
  } = data;
  
  // If already triggered and has not been at least 6 hours, don't trigger again
  // This prevents multiple triggers for the same price movement
  if (this.lastTriggered) {
    const now = new Date();
    const lastTriggered = new Date(this.lastTriggered);
    const hoursSinceLastTrigger = (now - lastTriggered) / (1000 * 60 * 60);
    
    if (hoursSinceLastTrigger < 6) {
      return false;
    }
  }
  
  // ==========================================
  // Check base price condition
  // ==========================================
  let priceConditionMet = false;
  
  if (this.targetType === 'price') {
    // Direct price comparison
    if (this.direction === '>' && currentPrice >= this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<' && currentPrice <= this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<>' && (currentPrice >= this.targetValue || currentPrice <= this.targetValue)) {
      priceConditionMet = true;
    }
  } else if (this.targetType === 'percentage') {
    // Percentage change calculation
    let basePrice = this.trackingMode === 'current' ? this.currentPrice : previousPrice;
    const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;
    
    if (this.direction === '>' && percentageChange >= this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<' && percentageChange <= -this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<>' && (percentageChange >= this.targetValue || percentageChange <= -this.targetValue)) {
      priceConditionMet = true;
    }
  }
  
  // ==========================================
  // Market filter checks
  // ==========================================
  let marketFiltersPass = true;
  
  // Skip checks if market data is not provided
  if (marketData) {
    // Check market type (SPOT, FUTURES, etc.)
    if (this.market !== 'ALL' && marketData.market !== this.market) {
      marketFiltersPass = false;
    }
    
    // Check exchange
    if (this.exchange && marketData.exchange !== this.exchange) {
      marketFiltersPass = false;
    }
    
    // Check trading pair
    if (this.tradingPair && !this.symbol.endsWith(this.tradingPair)) {
      marketFiltersPass = false;
    }
    
    // Check minimum daily volume
    if (this.minDailyVolume > 0 && marketData.dailyVolume < this.minDailyVolume) {
      marketFiltersPass = false;
    }
  }
  
  if (!marketFiltersPass) {
    return false;
  }
  
  // ==========================================
  // Check candle condition
  // ==========================================
  let candleConditionMet = true; // Default to true if no condition set
  
  if (this.candleCondition !== 'NONE' && candle) {
    // Find the candle data for the specified timeframe
    const candleData = candle[this.candleTimeframe] || candle['1HR']; // Default to 1HR if specified timeframe not available
    
    if (candleData) {
      if (this.candleCondition === 'ABOVE_OPEN' && candleData.close <= candleData.open) {
        candleConditionMet = false;
      } else if (this.candleCondition === 'BELOW_OPEN' && candleData.close >= candleData.open) {
        candleConditionMet = false;
      }
    }
  }
  
  // ==========================================
  // Check RSI condition
  // ==========================================
  let rsiConditionMet = true; // Default to true if RSI check not enabled
  
  if (this.rsiEnabled && rsi) {
    // Get RSI value for the specified timeframe
    const rsiValue = rsi[this.rsiTimeframe] || rsi['1HR']; // Default to 1HR if specified timeframe not available
    const rsiPrevious = rsi[`${this.rsiTimeframe}_previous`] || rsi['1HR_previous'];
    
    if (rsiValue !== undefined) {
      if (this.rsiCondition === 'ABOVE' && rsiValue <= this.rsiLevel) {
        rsiConditionMet = false;
      } else if (this.rsiCondition === 'BELOW' && rsiValue >= this.rsiLevel) {
        rsiConditionMet = false;
      } else if (this.rsiCondition === 'CROSSING_UP' && 
                (rsiValue <= this.rsiLevel || rsiPrevious >= this.rsiLevel)) {
        rsiConditionMet = false;
      } else if (this.rsiCondition === 'CROSSING_DOWN' && 
                (rsiValue >= this.rsiLevel || rsiPrevious <= this.rsiLevel)) {
        rsiConditionMet = false;
      }
    }
  }
  
  // ==========================================
  // Check EMA Fast/Slow condition
  // ==========================================
  let emaConditionMet = true; // Default to true if EMA check not enabled
  
  if (this.emaEnabled && emaData) {
    // Get EMA values for the specified timeframe
    const emaTimeframeData = emaData[this.emaTimeframe] || emaData['1HR']; // Default to 1HR
    const emaPreviousData = emaData[`${this.emaTimeframe}_previous`] || emaData['1HR_previous'];
    
    if (emaTimeframeData && emaPreviousData) {
      const fastEMA = emaTimeframeData[this.emaFastPeriod];
      const slowEMA = emaTimeframeData[this.emaSlowPeriod];
      const prevFastEMA = emaPreviousData[this.emaFastPeriod];
      const prevSlowEMA = emaPreviousData[this.emaSlowPeriod];
      
      if (fastEMA && slowEMA && prevFastEMA && prevSlowEMA) {
        if (this.emaCondition === 'ABOVE' && fastEMA <= slowEMA) {
          emaConditionMet = false;
        } else if (this.emaCondition === 'BELOW' && fastEMA >= slowEMA) {
          emaConditionMet = false;
        } else if (this.emaCondition === 'CROSSING_UP' && 
                  (fastEMA <= slowEMA || prevFastEMA >= prevSlowEMA)) {
          emaConditionMet = false;
        } else if (this.emaCondition === 'CROSSING_DOWN' && 
                  (fastEMA >= slowEMA || prevFastEMA <= prevSlowEMA)) {
          emaConditionMet = false;
        }
      }
    }
  }
  
  // ==========================================
  // Check volume conditions
  // ==========================================
  let volumeConditionMet = true; // Default to true if volume checks not enabled
  
  // Check volume change percent if required
  if (this.volumeChangeRequired > 0 && previousVolume) {
    const volumeChangePercent = ((currentVolume - previousVolume) / previousVolume) * 100;
    if (volumeChangePercent < this.volumeChangeRequired) {
      volumeConditionMet = false;
    }
  }
  
  // Check volume spike if enabled
  if (this.volumeEnabled && volumeHistory && volumeHistory.length > 0) {
    // Calculate average volume
    const avgVolume = volumeHistory.reduce((sum, vol) => sum + vol, 0) / volumeHistory.length;
    
    // Compare current volume with k × average volume
    if (currentVolume < (this.volumeSpikeMultiplier * avgVolume)) {
      volumeConditionMet = false;
    }
  }
  
  // All conditions must be met for the alert to trigger
  return priceConditionMet && 
         candleConditionMet && 
         rsiConditionMet && 
         emaConditionMet && 
         volumeConditionMet;
};

// Method to mark notification as sent
alertSchema.methods.markNotificationSent = function(type, error = null) {
  if (!this.notificationStatus) {
    this.notificationStatus = {};
  }
  
  this.notificationStatus[type] = {
    sent: error ? false : true,
    sentAt: new Date(),
    error: error ? error.message : null
  };
  
  // Update lastTriggered timestamp
  this.lastTriggered = new Date();
};

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
