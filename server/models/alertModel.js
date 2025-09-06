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
    basePrice: {
      type: Number,
      required: true, // Price when alert was created - used for percentage calculations
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
      enum: [
        'ABOVE_OPEN', 
        'BELOW_OPEN', 
        'GREEN_CANDLE', 
        'RED_CANDLE', 
        'BULLISH_HAMMER', 
        'BEARISH_HAMMER', 
        'DOJI', 
        'LONG_UPPER_WICK', 
        'LONG_LOWER_WICK', 
        'NONE'
      ],
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
      required: false,
      default: 'jamyasir0534@gmail.com',
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

// Method to check if alert conditions are met
alertSchema.methods.checkConditions = function(data) {
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
    marketData,
    historicalPrices // Array of price objects with timestamp and price
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
    // Check percentage change from when alert was created (basePrice)
    if (this.changePercentValue !== undefined) {
      const basePrice = this.basePrice; // Price when alert was created
      const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;
      
      console.log(`Future Price Alert Check: ${this.symbol}`);
      console.log(`Current Price: ${currentPrice}, Base Price (when alert created): ${basePrice}`);
      console.log(`Calculated Change: ${percentageChange.toFixed(4)}%, Required: ${this.changePercentValue}%`);
      
      // Check if the percentage change meets the alert criteria
      // Handle both positive and negative target percentages
      const targetValue = parseFloat(this.changePercentValue);
      const isNegativeTarget = targetValue < 0;
      
      if (this.direction === '>') {
        // For positive targets: check if price increased by at least target%
        // For negative targets: check if price decreased by at most target% (e.g., -5% means price dropped by 5% or less)
        if (isNegativeTarget ? percentageChange >= targetValue : percentageChange >= targetValue) {
          console.log(`✅ Alert triggered: Price changed by ${percentageChange.toFixed(4)}% (required: ${targetValue}%)`);
          priceConditionMet = true;
        }
      } else if (this.direction === '<') {
        // For positive targets: check if price decreased by at least target%
        // For negative targets: check if price increased by at most target% (e.g., -5% means price increased by 5% or less)
        if (isNegativeTarget ? percentageChange <= targetValue : percentageChange <= -Math.abs(targetValue)) {
          console.log(`✅ Alert triggered: Price changed by ${percentageChange.toFixed(4)}% (required: ${targetValue}%)`);
          priceConditionMet = true;
        }
      } else if (this.direction === '<>') {
        // For any direction, check if absolute change exceeds absolute target
        if (Math.abs(percentageChange) >= Math.abs(targetValue)) {
          console.log(`✅ Alert triggered: Price changed by ${Math.abs(percentageChange).toFixed(4)}% (required: ${Math.abs(targetValue)}%)`);
          priceConditionMet = true;
        }
      }
      
      if (!priceConditionMet) {
        console.log(`❌ Alert not triggered: Change ${percentageChange.toFixed(4)}% doesn't meet requirement ${targetValue}%`);
      }
    } else {
      // Fallback to basic percentage change calculation using basePrice
      const basePrice = this.basePrice;
      const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;
      
      if (this.direction === '>' && percentageChange >= this.targetValue) {
        priceConditionMet = true;
      } else if (this.direction === '<' && percentageChange <= -this.targetValue) {
        priceConditionMet = true;
      } else if (this.direction === '<>' && (percentageChange >= this.targetValue || percentageChange <= -this.targetValue)) {
        priceConditionMet = true;
      }
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
      const { open, high, low, close } = candleData;
      const bodySize = Math.abs(close - open);
      const upperWick = high - Math.max(open, close);
      const lowerWick = Math.min(open, close) - low;
      const totalRange = high - low;
      
      switch (this.candleCondition) {
        case 'ABOVE_OPEN':
          if (close <= open) candleConditionMet = false;
          break;
          
        case 'BELOW_OPEN':
          if (close >= open) candleConditionMet = false;
          break;
          
        case 'GREEN_CANDLE':
          if (close <= open) candleConditionMet = false;
          break;
          
        case 'RED_CANDLE':
          if (close >= open) candleConditionMet = false;
          break;
          
        case 'BULLISH_HAMMER':
          // Small body at top, long lower wick, short upper wick
          if (!(lowerWick > bodySize * 2 && upperWick < bodySize && close > open)) {
            candleConditionMet = false;
          }
          break;
          
        case 'BEARISH_HAMMER':
          // Small body at bottom, long upper wick, short lower wick
          if (!(upperWick > bodySize * 2 && lowerWick < bodySize && close < open)) {
            candleConditionMet = false;
          }
          break;
          
        case 'DOJI':
          // Open and close are very close (within 0.1% of the range)
          if (bodySize > totalRange * 0.001) {
            candleConditionMet = false;
          }
          break;
          
        case 'LONG_UPPER_WICK':
          // Upper wick is at least 2x the body size
          if (upperWick < bodySize * 2) {
            candleConditionMet = false;
          }
          break;
          
        case 'LONG_LOWER_WICK':
          // Lower wick is at least 2x the body size
          if (lowerWick < bodySize * 2) {
            candleConditionMet = false;
          }
          break;
          
        default:
          // Unknown condition, default to false
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
  
  // Track which conditions are enabled and met
  const enabledConditions = [];
  const metConditions = [];
  
  // Price condition is always checked
  enabledConditions.push('price');
  if (priceConditionMet) metConditions.push('price');
  
  // Candle condition
  if (this.candleCondition !== 'NONE') {
    enabledConditions.push('candle');
    if (candleConditionMet) metConditions.push('candle');
  }
  
  // RSI condition
  if (this.rsiEnabled) {
    enabledConditions.push('rsi');
    if (rsiConditionMet) metConditions.push('rsi');
  }
  
  // EMA condition
  if (this.emaEnabled) {
    enabledConditions.push('ema');
    if (emaConditionMet) metConditions.push('ema');
  }
  
  // Log which conditions were met
  if (metConditions.length > 0) {
    console.log(`Alert conditions met for ${this.symbol}: ${metConditions.join(', ')}`);
  }
  
  // Alert triggers if ANY enabled condition is met
  return metConditions.length > 0;
};

// Helper method to convert timeframe to minutes
alertSchema.methods.getTimeframeInMinutes = function(timeframe) {
  const timeframeMap = {
    '1MIN': 1,
    '5MIN': 5,
    '15MIN': 15,
    '1HR': 60
  };
  return timeframeMap[timeframe] || 60; // Default to 1 hour
};

// Method to check if alert should trigger (wrapper for checkConditions)
alertSchema.methods.shouldTrigger = function(data) {
  return this.checkConditions(data);
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
