const mongoose = require("mongoose");

const alertSchema = mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
    },
    // Basic alert conditions
    direction: {
      type: String,
      enum: [">", "<", "<>"], // Up, Down, Either way
      required: true,
    },
    targetType: {
      type: String,
      enum: ["price", "percentage"],
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
      enum: ["current", "interval"],
      default: "current",
    },
    intervalMinutes: {
      type: Number,
      default: 0,
    },
    // Candle conditions - Support multiple timeframes
    candleTimeframes: [
      {
        type: String,
        enum: ["5MIN", "15MIN", "1HR", "4HR", "12HR", "D", "W"],
      },
    ],
    candleCondition: {
      type: String,
      enum: [
        "ABOVE_OPEN",
        "BELOW_OPEN",
        "GREEN_CANDLE",
        "RED_CANDLE",
        "BULLISH_HAMMER",
        "BEARISH_HAMMER",
        "DOJI",
        "HAMMER",
        "LONG_UPPER_WICK",
        "LONG_LOWER_WICK",
        "NONE",
      ],
      default: "NONE",
    },

    // Candle state tracking to prevent spam alerts
    candleAlertStates: {
      type: Map,
      of: {
        triggered: { type: Boolean, default: false },
        lastTriggeredCandle: { type: String }, // Store the openTime of the last triggered candle
        lastChecked: { type: Date, default: Date.now },
      },
      default: new Map(),
    },

    // RSI conditions
    rsiEnabled: {
      type: Boolean,
      default: false,
    },
    rsiTimeframe: {
      type: String,
      enum: ["5MIN", "15MIN", "1HR", "4HR", "12HR", "D"],
      default: "1HR",
    },
    rsiPeriod: {
      type: Number,
      default: 0,
    },
    rsiCondition: {
      type: String,
      enum: ["ABOVE", "BELOW", "CROSSING_UP", "CROSSING_DOWN", "NONE"],
      default: "NONE",
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
      enum: ["5MIN", "15MIN", "1HR", "4HR", "12HR", "D"],
      default: "1HR",
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
      enum: ["ABOVE", "BELOW", "CROSSING_UP", "CROSSING_DOWN", "NONE"],
      default: "NONE",
    },

    // Market filters
    market: {
      type: String,
      enum: ["SPOT", "FUTURES", "MARGIN", "ALL"],
      default: "SPOT",
    },
    exchange: {
      type: String,
      default: "BINANCE",
    },
    tradingPair: {
      type: String,
      enum: ["USDT", "BTC", "ETH", "OTHER", "ALL"],
      default: "USDT",
    },
    minDailyVolume: {
      type: Number,
      default: 0, // 0 means no minimum volume requirement
    },

    // Change percentage settings
    changePercentTimeframe: {
      type: String,
      enum: ["1MIN", "5MIN", "15MIN", "1HR"],
      default: "1MIN",
    },
    changePercentValue: {
      type: Number,
      default: 0,
    },

    // Alert count settings
    alertCountTimeframe: {
      type: String,
      enum: ["5MIN", "15MIN", "1HR", "4HR", "12HR", "D"],
      default: "5MIN",
    },
    alertCountEnabled: {
      type: Boolean,
      default: false,
    },
    maxAlertsPerTimeframe: {
      type: Number,
      default: 1, // Maximum alerts allowed per timeframe candle
    },

    // Per-timeframe alert counter tracking
    timeframeAlertCounters: {
      type: Map,
      of: {
        count: { type: Number, default: 0 },
        lastCandleOpenTime: { type: String }, // Store the openTime of the last candle
        lastResetTime: { type: Date, default: Date.now }
      },
      default: new Map()
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
    userExplicitlyCreated: {
      type: Boolean,
      default: false, // CRITICAL: Only alerts with this flag set to true will be processed
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    comment: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: false,
      default: " kainat.tasadaq3@gmail.com",
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
alertSchema.methods.checkConditions = function (data) {
  console.log(`🔍 === ALERT MODEL CHECK CONDITIONS ===`);
  console.log(`🔍 Alert ID: ${this._id}`);
  console.log(`🔍 Symbol: ${this.symbol}`);
  console.log(`🔍 Target Type: ${this.targetType}`);
  console.log(`🔍 Target Value: ${this.targetValue}`);
  console.log(`🔍 Direction: ${this.direction}`);
  console.log(`🔍 User Explicitly Created: ${this.userExplicitlyCreated}`);
  console.log(`🔍 Is Active: ${this.isActive}`);
  
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
    historicalPrices, // Array of price objects with timestamp and price
  } = data;

  console.log(`🔍 Current Price: ${currentPrice}`);
  console.log(`🔍 Base Price: ${this.basePrice}`);

  // ==========================================
  // CONTINUOUS MONITORING: Check if alert should be allowed to trigger
  // ==========================================
  // Instead of a fixed 6-hour cooldown, use timeframe-based reset logic
  // This allows continuous monitoring with proper duplicate prevention
  
  console.log(`🔍 === CONTINUOUS MONITORING CHECK ===`);
  console.log(`🔍 Last triggered: ${this.lastTriggered}`);
  console.log(`🔍 Alert count enabled: ${this.alertCountEnabled}`);
  console.log(`🔍 Alert count timeframe: ${this.alertCountTimeframe}`);
  
  // If alert count is enabled, use the timeframe-based system for duplicate prevention
  if (this.alertCountEnabled && this.alertCountTimeframe) {
    console.log(`✅ Using timeframe-based continuous monitoring for ${this.alertCountTimeframe}`);
    // The alert count system will handle duplicate prevention within the same candle
    // No need for a fixed cooldown period
  } else {
    // Fallback: If no alert count system, use a shorter cooldown (30 minutes instead of 6 hours)
    if (this.lastTriggered) {
      const now = new Date();
      const lastTriggered = new Date(this.lastTriggered);
      const minutesSinceLastTrigger = (now - lastTriggered) / (1000 * 60);

      console.log(`🔍 Minutes since last trigger: ${minutesSinceLastTrigger.toFixed(2)}`);

      if (minutesSinceLastTrigger < 30) {
        console.log(`❌ Alert not triggered: Too soon since last trigger (${minutesSinceLastTrigger.toFixed(2)} minutes < 30 minutes)`);
        console.log(`💡 TIP: Enable alert count system for continuous monitoring`);
        return false;
      }
    }
  }

  // ==========================================
  // Check base price condition
  // ==========================================
  let priceConditionMet = false;

  console.log(`🔍 === PRICE CONDITION CHECK ===`);
  console.log(`🔍 Target Type: ${this.targetType}`);
  console.log(`🔍 Direction: ${this.direction}`);
  console.log(`🔍 Target Value: ${this.targetValue}`);
  console.log(`🔍 Current Price: ${currentPrice}`);

  if (this.targetType === "price") {
    console.log(`🔍 Checking direct price comparison`);
    // Direct price comparison
    if (this.direction === ">" && currentPrice >= this.targetValue) {
      console.log(`✅ Price condition met: ${currentPrice} >= ${this.targetValue}`);
      priceConditionMet = true;
    } else if (this.direction === "<" && currentPrice <= this.targetValue) {
      console.log(`✅ Price condition met: ${currentPrice} <= ${this.targetValue}`);
      priceConditionMet = true;
    } else if (
      this.direction === "<>" &&
      (currentPrice >= this.targetValue || currentPrice <= this.targetValue)
    ) {
      console.log(`✅ Price condition met: ${currentPrice} <> ${this.targetValue}`);
      priceConditionMet = true;
    } else {
      console.log(`❌ Price condition not met: ${currentPrice} ${this.direction} ${this.targetValue}`);
    }
  } else if (this.targetType === "percentage") {
    console.log(`🔍 Checking percentage change condition`);
    // Check percentage change from when alert was created (basePrice)
    if (this.changePercentValue !== undefined) {
      const basePrice = this.basePrice; // Price when alert was created
      const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;

      console.log(`🔍 Percentage Alert Check: ${this.symbol}`);
      console.log(`🔍 Current Price: ${currentPrice}, Base Price (when alert created): ${basePrice}`);
      console.log(`🔍 Calculated Change: ${percentageChange.toFixed(4)}%, Required: ${this.changePercentValue}%`);
      console.log(`🔍 Change Percent Value: ${this.changePercentValue}`);
      console.log(`🔍 Target Value: ${this.targetValue}`);

      // Check if the percentage change meets the alert criteria
      // Handle both positive and negative target percentages
      const targetValue = parseFloat(this.changePercentValue);
      const isNegativeTarget = targetValue < 0;

      if (this.direction === ">") {
        // For positive targets: check if price increased by at least target%
        // For negative targets: check if price decreased by at most target% (e.g., -5% means price dropped by 5% or less)
        if (
          isNegativeTarget
            ? percentageChange >= targetValue
            : percentageChange >= targetValue
        ) {
          console.log(
            `✅ Alert triggered: Price changed by ${percentageChange.toFixed(
              4
            )}% (required: ${targetValue}%)`
          );
          priceConditionMet = true;
        }
      } else if (this.direction === "<") {
        // For positive targets: check if price decreased by at least target%
        // For negative targets: check if price increased by at most target% (e.g., -5% means price increased by 5% or less)
        if (
          isNegativeTarget
            ? percentageChange <= targetValue
            : percentageChange <= -Math.abs(targetValue)
        ) {
          console.log(
            `✅ Alert triggered: Price changed by ${percentageChange.toFixed(
              4
            )}% (required: ${targetValue}%)`
          );
          priceConditionMet = true;
        }
      } else if (this.direction === "<>") {
        // For any direction, check if absolute change exceeds absolute target
        if (Math.abs(percentageChange) >= Math.abs(targetValue)) {
          console.log(
            `✅ Alert triggered: Price changed by ${Math.abs(
              percentageChange
            ).toFixed(4)}% (required: ${Math.abs(targetValue)}%)`
          );
          priceConditionMet = true;
        }
      }

      if (!priceConditionMet) {
        console.log(
          `❌ Alert not triggered: Change ${percentageChange.toFixed(
            4
          )}% doesn't meet requirement ${targetValue}%`
        );
      }
    } else {
      // Fallback to basic percentage change calculation using basePrice
      const basePrice = this.basePrice;
      const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;

      if (this.direction === ">" && percentageChange >= this.targetValue) {
        priceConditionMet = true;
      } else if (
        this.direction === "<" &&
        percentageChange <= -this.targetValue
      ) {
        priceConditionMet = true;
      } else if (
        this.direction === "<>" &&
        (percentageChange >= this.targetValue ||
          percentageChange <= -this.targetValue)
      ) {
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
    if (this.market !== "ALL" && marketData.market !== this.market) {
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
    if (
      this.minDailyVolume > 0 &&
      marketData.dailyVolume < this.minDailyVolume
    ) {
      console.log(`❌ MIN DAILY VOLUME FILTER FAILED for ${this.symbol}:`);
      console.log(`   Required: ${this.minDailyVolume}`);
      console.log(`   Actual: ${marketData.dailyVolume}`);
      console.log(`   Difference: ${marketData.dailyVolume - this.minDailyVolume}`);
      marketFiltersPass = false;
    } else if (this.minDailyVolume > 0) {
      console.log(`✅ MIN DAILY VOLUME FILTER PASSED for ${this.symbol}:`);
      console.log(`   Required: ${this.minDailyVolume}`);
      console.log(`   Actual: ${marketData.dailyVolume}`);
      console.log(`   Difference: ${marketData.dailyVolume - this.minDailyVolume}`);
    }
  }

  if (!marketFiltersPass) {
    return false;
  }

  // ==========================================
  // Check candle condition for multiple timeframes
  // ==========================================
  let candleConditionMet = true; // Default to true if no condition set
  let triggeredTimeframes = []; // Track which timeframes triggered

  if (
    this.candleCondition !== "NONE" &&
    candle &&
    this.candleTimeframes &&
    this.candleTimeframes.length > 0
  ) {
    candleConditionMet = false; // Start with false, set to true if any timeframe meets condition

    // Check each selected timeframe
    for (const timeframe of this.candleTimeframes) {
      const candleData = candle[timeframe];

    if (candleData) {
      const { open, high, low, close } = candleData;
      const bodySize = Math.abs(close - open);
      const upperWick = high - Math.max(open, close);
      const lowerWick = Math.min(open, close) - low;
      const totalRange = high - low;

        let timeframeConditionMet = false;

      switch (this.candleCondition) {
        case "ABOVE_OPEN":
            timeframeConditionMet = close > open;
          break;

        case "BELOW_OPEN":
            timeframeConditionMet = close < open;
          break;

        case "GREEN_CANDLE":
            timeframeConditionMet = close > open;
          break;

        case "RED_CANDLE":
            timeframeConditionMet = close < open;
          break;

        case "BULLISH_HAMMER":
            // Small body at top, long lower wick, short upper wick, bullish
            timeframeConditionMet = lowerWick > bodySize * 2 && upperWick < bodySize && close > open;
          break;

        case "BEARISH_HAMMER":
            // Small body at bottom, long upper wick, short lower wick, bearish
            timeframeConditionMet =
              upperWick > bodySize * 2 && lowerWick < bodySize && close < open;
            break;

          case "HAMMER":
            // Generic hammer: small body, long lower wick, short upper wick
            timeframeConditionMet = lowerWick > bodySize * 2 && upperWick < bodySize;
          break;

        case "DOJI":
          // Open and close are very close (within 0.1% of the range)
            timeframeConditionMet = bodySize <= totalRange * 0.001;
          break;

        case "LONG_UPPER_WICK":
          // Upper wick is at least 2x the body size
            timeframeConditionMet = upperWick >= bodySize * 2;
          break;

        case "LONG_LOWER_WICK":
          // Lower wick is at least 2x the body size
            timeframeConditionMet = lowerWick >= bodySize * 2;
          break;

        default:
            timeframeConditionMet = false;
        }

        // Check if this timeframe should trigger (condition met and not already triggered for this candle)
        if (timeframeConditionMet) {
          const candleKey = `${timeframe}_${candleData.openTime || Date.now()}`;
          const alertState = this.candleAlertStates.get(timeframe);
          
          console.log(`🔍 Checking candle alert for ${this.symbol} ${timeframe}:`);
          console.log(`   Condition: ${this.candleCondition}`);
          console.log(`   OHLC: O:${open} H:${high} L:${low} C:${close}`);
          console.log(`   Candle Key: ${candleKey}`);
          console.log(`   Alert State:`, alertState);
          
          // Only trigger if we haven't already triggered for this specific candle
          if (!alertState || alertState.lastTriggeredCandle !== candleKey) {
            triggeredTimeframes.push(timeframe);
            candleConditionMet = true;
            
            console.log(`🚨 CANDLE ALERT TRIGGERED: ${this.symbol} ${timeframe} ${this.candleCondition}`);
            console.log(`   ✅ First time triggering for this candle: ${candleKey}`);
            
            // Update the alert state for this timeframe
            this.candleAlertStates.set(timeframe, {
              triggered: true,
              lastTriggeredCandle: candleKey,
              lastChecked: new Date(),
            });
          } else {
            console.log(`⏳ Candle alert already triggered for ${this.symbol} ${timeframe} candle: ${candleKey}`);
            console.log(`   ❌ Skipping duplicate trigger`);
          }
        } else {
          console.log(`❌ Candle condition not met for ${this.symbol} ${timeframe} ${this.candleCondition}`);
        }
      }
    }
  }

  // ==========================================
  // Check RSI condition
  // ==========================================
  let rsiConditionMet = true; // Default to true if RSI check not enabled

  if (this.rsiEnabled && rsi) {
    // Get RSI value for the specified timeframe
    const rsiValue = rsi[this.rsiTimeframe] || rsi["1HR"]; // Default to 1HR if specified timeframe not available
    const rsiPrevious =
      rsi[`${this.rsiTimeframe}_previous`] || rsi["1HR_previous"];

    if (rsiValue !== undefined) {
      if (this.rsiCondition === "ABOVE" && rsiValue <= this.rsiLevel) {
        rsiConditionMet = false;
      } else if (this.rsiCondition === "BELOW" && rsiValue >= this.rsiLevel) {
        rsiConditionMet = false;
      } else if (
        this.rsiCondition === "CROSSING_UP" &&
        (rsiValue <= this.rsiLevel || rsiPrevious >= this.rsiLevel)
      ) {
        rsiConditionMet = false;
      } else if (
        this.rsiCondition === "CROSSING_DOWN" &&
        (rsiValue >= this.rsiLevel || rsiPrevious <= this.rsiLevel)
      ) {
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
    const emaTimeframeData = emaData[this.emaTimeframe] || emaData["1HR"]; // Default to 1HR
    const emaPreviousData =
      emaData[`${this.emaTimeframe}_previous`] || emaData["1HR_previous"];

    if (emaTimeframeData && emaPreviousData) {
      const fastEMA = emaTimeframeData[this.emaFastPeriod];
      const slowEMA = emaTimeframeData[this.emaSlowPeriod];
      const prevFastEMA = emaPreviousData[this.emaFastPeriod];
      const prevSlowEMA = emaPreviousData[this.emaSlowPeriod];

      if (fastEMA && slowEMA && prevFastEMA && prevSlowEMA) {
        if (this.emaCondition === "ABOVE" && fastEMA <= slowEMA) {
          emaConditionMet = false;
        } else if (this.emaCondition === "BELOW" && fastEMA >= slowEMA) {
          emaConditionMet = false;
        } else if (
          this.emaCondition === "CROSSING_UP" &&
          (fastEMA <= slowEMA || prevFastEMA >= prevSlowEMA)
        ) {
          emaConditionMet = false;
        } else if (
          this.emaCondition === "CROSSING_DOWN" &&
          (fastEMA >= slowEMA || prevFastEMA <= prevSlowEMA)
        ) {
          emaConditionMet = false;
        }
      }
    }
  }

  // Track which conditions are enabled and met
  const enabledConditions = [];
  const metConditions = [];

  console.log(`🔍 === FINAL CONDITION EVALUATION ===`);
  console.log(`🔍 Price condition met: ${priceConditionMet}`);
  console.log(`🔍 Candle condition met: ${candleConditionMet}`);
  console.log(`🔍 RSI condition met: ${rsiConditionMet}`);
  console.log(`🔍 EMA condition met: ${emaConditionMet}`);

  // Price condition is always checked
  enabledConditions.push("price");
  if (priceConditionMet) metConditions.push("price");

  // Candle condition
  if (this.candleCondition !== "NONE") {
    enabledConditions.push("candle");
    if (candleConditionMet) metConditions.push("candle");
  }

  // RSI condition
  if (this.rsiEnabled) {
    enabledConditions.push("rsi");
    if (rsiConditionMet) metConditions.push("rsi");
  }

  // EMA condition
  if (this.emaEnabled) {
    enabledConditions.push("ema");
    if (emaConditionMet) metConditions.push("ema");
  }

  console.log(`🔍 Enabled conditions: ${enabledConditions.join(", ")}`);
  console.log(`🔍 Met conditions: ${metConditions.join(", ")}`);

  // Log which conditions were met
  if (metConditions.length > 0) {
    console.log(`✅ Alert conditions met for ${this.symbol}: ${metConditions.join(", ")}`);
  } else {
    console.log(`❌ No alert conditions met for ${this.symbol}`);
  }

  // Alert triggers if ANY enabled condition is met
  const shouldTrigger = metConditions.length > 0;
  console.log(`🔍 Final result: ${shouldTrigger ? "TRIGGER" : "NO TRIGGER"}`);
  
  return shouldTrigger;
};

// Helper method to convert timeframe to minutes
alertSchema.methods.getTimeframeInMinutes = function (timeframe) {
  const timeframeMap = {
    "1MIN": 1,
    "5MIN": 5,
    "15MIN": 15,
    "1HR": 60,
  };
  return timeframeMap[timeframe] || 60; // Default to 1 hour
};

// Method to check if alert should trigger (wrapper for checkConditions)
alertSchema.methods.shouldTrigger = function (data) {
  return this.checkConditions(data);
};

// Method to mark notification as sent
alertSchema.methods.markNotificationSent = function (type, error = null) {
  if (!this.notificationStatus) {
    this.notificationStatus = {};
  }

  this.notificationStatus[type] = {
    sent: error ? false : true,
    sentAt: new Date(),
    error: error ? error.message : null,
  };

  // Update lastTriggered timestamp
  this.lastTriggered = new Date();
};

// Method to reset candle alert states for new candles
alertSchema.methods.resetCandleAlertStates = function (
  timeframe,
  newCandleOpenTime
) {
  if (!this.candleAlertStates) {
    this.candleAlertStates = new Map();
  }

  const alertState = this.candleAlertStates.get(timeframe);
  const currentCandleKey = `${timeframe}_${newCandleOpenTime}`;
  
  console.log(`🔄 Checking candle state reset for ${this.symbol} ${timeframe}:`);
  console.log(`   Current candle key: ${currentCandleKey}`);
  console.log(`   Previous alert state:`, alertState);
  
  if (alertState && alertState.lastTriggeredCandle) {
    const currentCandleKey = `${timeframe}_${newCandleOpenTime}`;

    // If this is a new candle, reset the triggered state
    if (alertState.lastTriggeredCandle !== currentCandleKey) {
      console.log(`   ✅ New candle detected! Resetting alert state for ${timeframe}`);
      this.candleAlertStates.set(timeframe, {
        triggered: false,
        lastTriggeredCandle: null,
        lastChecked: new Date(),
      });
    } else {
      console.log(`   ⏳ Same candle, keeping alert state`);
    }
  } else {
    // Initialize alert state for this timeframe
    console.log(`   🆕 Initializing alert state for ${timeframe}`);
    this.candleAlertStates.set(timeframe, {
      triggered: false,
      lastTriggeredCandle: null,
      lastChecked: new Date()
    });
  }
};

// Method to check if candle alert was already triggered for current candle
alertSchema.methods.wasCandleAlertTriggered = function (
  timeframe,
  candleOpenTime
) {
  if (!this.candleAlertStates) {
    return false;
  }

  const alertState = this.candleAlertStates.get(timeframe);
  if (!alertState) {
    return false;
  }

  const currentCandleKey = `${timeframe}_${candleOpenTime}`;
  const wasTriggered = alertState.lastTriggeredCandle === currentCandleKey && alertState.triggered;
  
  console.log(`🔍 Checking if alert was triggered for ${this.symbol} ${timeframe}:`);
  console.log(`   Current candle key: ${currentCandleKey}`);
  console.log(`   Last triggered candle: ${alertState.lastTriggeredCandle}`);
  console.log(`   Triggered: ${alertState.triggered}`);
  console.log(`   Was triggered: ${wasTriggered}`);
  
  return wasTriggered;
};

// Method to check if alert count limit is reached for a timeframe
alertSchema.methods.isAlertCountLimitReached = function (timeframe, candleOpenTime) {
  if (!this.alertCountEnabled || !this.alertCountTimeframe) {
    return false; // No limit if alert count is not enabled
  }

  // Only check limit for the configured alert count timeframe
  if (timeframe !== this.alertCountTimeframe) {
    return false;
  }

  if (!this.timeframeAlertCounters) {
    this.timeframeAlertCounters = new Map();
  }

  const counter = this.timeframeAlertCounters.get(timeframe);
  if (!counter) {
    return false; // No counter means no alerts sent yet
  }

  // Check if this is a new candle (different open time)
  const isNewCandle = counter.lastCandleOpenTime !== candleOpenTime;
  
  console.log(`🔍 === ALERT COUNT LIMIT CHECK ===`);
  console.log(`   Symbol: ${this.symbol}`);
  console.log(`   Timeframe: ${timeframe}`);
  console.log(`   Current candle open time: ${candleOpenTime}`);
  console.log(`   Last candle open time: ${counter.lastCandleOpenTime}`);
  console.log(`   Current count: ${counter.count}`);
  console.log(`   Max allowed: ${this.maxAlertsPerTimeframe}`);
  console.log(`   Is new candle: ${isNewCandle}`);
  console.log(`   Alert count enabled: ${this.alertCountEnabled}`);
  console.log(`   Alert count timeframe: ${this.alertCountTimeframe}`);

  // If it's a new candle, reset the counter
  if (isNewCandle) {
    console.log(`   ✅ New candle detected! Resetting counter for ${timeframe}`);
    this.timeframeAlertCounters.set(timeframe, {
      count: 0,
      lastCandleOpenTime: candleOpenTime,
      lastResetTime: new Date()
    });
    return false; // Counter reset, can send alert
  }

  // Check if limit is reached
  const limitReached = counter.count >= this.maxAlertsPerTimeframe;
  console.log(`   Limit reached: ${limitReached}`);
  
  if (limitReached) {
    console.log(`   🚫 ALERT BLOCKED: ${this.symbol} has already sent ${counter.count} alerts in current ${timeframe} candle`);
    console.log(`   🚫 Reason: Alert count limit reached (${counter.count}/${this.maxAlertsPerTimeframe})`);
    console.log(`   🚫 Next alert allowed when new ${timeframe} candle opens`);
  } else {
    console.log(`   ✅ ALERT ALLOWED: ${this.symbol} can send alert (${counter.count}/${this.maxAlertsPerTimeframe})`);
  }
  
  return limitReached;
};

// Method to increment alert count for a timeframe
alertSchema.methods.incrementAlertCount = function (timeframe, candleOpenTime) {
  if (!this.alertCountEnabled || !this.alertCountTimeframe) {
    return; // No counting if alert count is not enabled
  }

  // Only count for the configured alert count timeframe
  if (timeframe !== this.alertCountTimeframe) {
    return;
  }

  if (!this.timeframeAlertCounters) {
    this.timeframeAlertCounters = new Map();
  }

  const counter = this.timeframeAlertCounters.get(timeframe);
  
  // Check if this is a new candle (different open time)
  const isNewCandle = !counter || counter.lastCandleOpenTime !== candleOpenTime;
  
  if (isNewCandle) {
    // New candle, reset counter and increment
    this.timeframeAlertCounters.set(timeframe, {
      count: 1,
      lastCandleOpenTime: candleOpenTime,
      lastResetTime: new Date()
    });
    console.log(`🔄 === COUNTER RESET & INCREMENT ===`);
    console.log(`   Symbol: ${this.symbol}`);
    console.log(`   Timeframe: ${timeframe}`);
    console.log(`   Action: New candle detected - reset and increment`);
    console.log(`   New count: 1`);
    console.log(`   Candle open time: ${candleOpenTime}`);
    console.log(`   Reset time: ${new Date().toISOString()}`);
  } else {
    // Same candle, just increment
    const newCount = (counter.count || 0) + 1;
    this.timeframeAlertCounters.set(timeframe, {
      count: newCount,
      lastCandleOpenTime: candleOpenTime,
      lastResetTime: counter.lastResetTime
    });
    console.log(`📈 === COUNTER INCREMENT ===`);
    console.log(`   Symbol: ${this.symbol}`);
    console.log(`   Timeframe: ${timeframe}`);
    console.log(`   Action: Same candle - increment only`);
    console.log(`   Previous count: ${counter.count || 0}`);
    console.log(`   New count: ${newCount}`);
    console.log(`   Candle open time: ${candleOpenTime}`);
  }
};

// Method to get current alert count for a timeframe
alertSchema.methods.getAlertCount = function (timeframe) {
  if (!this.timeframeAlertCounters) {
    return 0;
  }

  const counter = this.timeframeAlertCounters.get(timeframe);
  return counter ? counter.count : 0;
};

// Method to enable continuous monitoring by setting up alert count system
alertSchema.methods.enableContinuousMonitoring = function (timeframe = '5MIN', maxAlertsPerCandle = 1) {
  console.log(`🔄 === ENABLING CONTINUOUS MONITORING ===`);
  console.log(`   Symbol: ${this.symbol}`);
  console.log(`   Timeframe: ${timeframe}`);
  console.log(`   Max alerts per candle: ${maxAlertsPerCandle}`);
  
  this.alertCountEnabled = true;
  this.alertCountTimeframe = timeframe;
  this.maxAlertsPerTimeframe = maxAlertsPerCandle;
  
  // Initialize the counter if it doesn't exist
  if (!this.timeframeAlertCounters) {
    this.timeframeAlertCounters = new Map();
  }
  
  // Initialize counter for the timeframe if it doesn't exist
  if (!this.timeframeAlertCounters.has(timeframe)) {
    this.timeframeAlertCounters.set(timeframe, {
      count: 0,
      lastCandleOpenTime: null,
      lastResetTime: new Date()
    });
  }
  
  console.log(`✅ Continuous monitoring enabled for ${this.symbol} on ${timeframe} timeframe`);
  console.log(`   Alert count enabled: ${this.alertCountEnabled}`);
  console.log(`   Alert count timeframe: ${this.alertCountTimeframe}`);
  console.log(`   Max alerts per candle: ${this.maxAlertsPerTimeframe}`);
};

// Method to check if continuous monitoring is properly configured
alertSchema.methods.isContinuousMonitoringEnabled = function () {
  return this.alertCountEnabled && 
         this.alertCountTimeframe && 
         this.maxAlertsPerTimeframe > 0;
};

const Alert = mongoose.model("Alert", alertSchema);

module.exports = Alert;
