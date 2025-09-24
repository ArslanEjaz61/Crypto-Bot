const Alert = require("../models/alertModel");
const Crypto = require("../models/cryptoModel");
const Notification = require("../models/notificationModel");
const { sendAlertNotification } = require("../utils/telegramService");
const { sendAlertEmail } = require("../utils/emailService");
const axios = require("axios");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const BINANCE_API_BASE = "https://api.binance.com";

/**
 * COMPREHENSIVE ALERT SERVICE - FIXED VERSION
 * This service addresses all the critical issues found in the audit:
 * 1. Proper Min Daily Volume filtering
 * 2. Correct Change % calculation with proper base prices
 * 3. Complete Alert Count & Continuous Monitoring system
 * 4. Comprehensive debug logging
 * 5. Proper candle-based alert tracking
 */

/**
 * Get current price from Binance API
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<number>} Current price
 */
async function getCurrentPrice(symbol) {
  try {
    const https = require("https");
    const dns = require("dns");

    const httpsAgent = new https.Agent({
      family: 4, // Force IPv4
      lookup: dns.lookup,
    });

    const response = await axios.get(
      `${BINANCE_API_BASE}/api/v3/ticker/price`,
      {
        params: { symbol: symbol },
        timeout: 5000,
        httpsAgent: httpsAgent,
      }
    );
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(
      `❌ Error fetching current price for ${symbol}:`,
      error.message
    );
    return null;
  }
}

/**
 * Get 24h volume data from Binance API
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} Volume data with 24h volume
 */
async function getVolumeData(symbol) {
  try {
    const https = require("https");
    const dns = require("dns");

    const httpsAgent = new https.Agent({
      family: 4, // Force IPv4
      lookup: dns.lookup,
    });

    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/ticker/24hr`, {
      params: { symbol: symbol },
      timeout: 5000,
      httpsAgent: httpsAgent,
    });

    const data = response.data;
    // Use quoteVolume (USDT volume) as it's more accurate for USDT pairs
    const volume24h =
      parseFloat(data.quoteVolume) ||
      parseFloat(data.volume) * parseFloat(data.weightedAvgPrice);

    return {
      volume24h: volume24h,
      baseVolume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      priceChangePercent24h: parseFloat(data.priceChangePercent),
    };
  } catch (error) {
    console.error(
      `❌ Error fetching volume data for ${symbol}:`,
      error.message
    );
    return null;
  }
}

/**
 * Get current candle data for a specific timeframe
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Timeframe (1m, 5m, 15m, 1h, 4h, 12h, 1d)
 * @returns {Promise<Object>} Current candle data
 */
async function getCurrentCandleData(symbol, timeframe) {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: timeframe,
        limit: 1,
      },
      timeout: 10000,
    });

    if (!response.data || response.data.length < 1) {
      throw new Error("No candle data received");
    }

    const kline = response.data[0];
    return {
      openTime: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: parseInt(kline[6]),
      timestamp: new Date(parseInt(kline[0])),
    };
  } catch (error) {
    console.error(
      `❌ Error fetching ${timeframe} candle for ${symbol}:`,
      error.message
    );
    return null;
  }
}

/**
 * Get historical candle data for percentage change calculations
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Timeframe
 * @param {number} limit - Number of candles to fetch
 * @returns {Promise<Array>} Array of historical candle data
 */
async function getHistoricalCandleData(symbol, timeframe, limit = 2) {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: timeframe,
        limit: limit,
      },
      timeout: 10000,
    });

    if (!response.data || response.data.length < 1) {
      throw new Error("No historical candle data received");
    }

    return response.data.map((kline) => ({
      openTime: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: parseInt(kline[6]),
      timestamp: new Date(parseInt(kline[0])),
    }));
  } catch (error) {
    console.error(
      `❌ Error fetching historical ${timeframe} candles for ${symbol}:`,
      error.message
    );
    return [];
  }
}

/**
 * Calculate percentage change with proper base price determination
 * @param {number} currentPrice - Current price
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Timeframe for percentage calculation
 * @param {Object} alert - Alert object
 * @returns {Promise<Object>} Percentage change data with debugging info
 */
async function calculatePercentageChange(
  currentPrice,
  symbol,
  timeframe,
  alert
) {
  console.log(`📊 === PERCENTAGE CALCULATION DEBUG ===`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Timeframe: ${timeframe}`);
  console.log(`   Current Price: ${currentPrice}`);

  let basePrice;
  let basePriceSource;

  // Determine the correct base price based on timeframe
  if (timeframe === "1MIN") {
    // For 1-minute alerts, use the current 1-minute candle open price
    const minuteCandle = await getCurrentCandleData(symbol, "1m");
    if (minuteCandle) {
      basePrice = minuteCandle.open;
      basePriceSource = "1-minute candle open";
      console.log(`   Base Price Source: ${basePriceSource}`);
      console.log(
        `   Candle Open Time: ${minuteCandle.timestamp.toISOString()}`
      );
      console.log(
        `   Candle OHLC: O:${minuteCandle.open} H:${minuteCandle.high} L:${minuteCandle.low} C:${minuteCandle.close}`
      );
    } else {
      basePrice = alert.basePrice;
      basePriceSource = "alert base price (fallback)";
      console.log(
        `   Base Price Source: ${basePriceSource} (candle fetch failed)`
      );
    }
  } else {
    // For other timeframes, get the appropriate candle data
    const binanceTimeframe =
      {
        "5MIN": "5m",
        "15MIN": "15m",
        "1HR": "1h",
        "4HR": "4h",
        "12HR": "12h",
        D: "1d",
      }[timeframe] || "1h";

    const candleData = await getCurrentCandleData(symbol, binanceTimeframe);
    if (candleData) {
      basePrice = candleData.open;
      basePriceSource = `${timeframe} candle open`;
      console.log(`   Base Price Source: ${basePriceSource}`);
      console.log(`   Candle Open Time: ${candleData.timestamp.toISOString()}`);
      console.log(
        `   Candle OHLC: O:${candleData.open} H:${candleData.high} L:${candleData.low} C:${candleData.close}`
      );
    } else {
      basePrice = alert.basePrice;
      basePriceSource = "alert base price (fallback)";
      console.log(
        `   Base Price Source: ${basePriceSource} (candle fetch failed)`
      );
    }
  }

  const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;

  console.log(`   Base Price: ${basePrice}`);
  console.log(`   Price Difference: ${currentPrice - basePrice}`);
  console.log(`   Percentage Change: ${percentageChange.toFixed(6)}%`);
  console.log(
    `   Calculation: (${currentPrice} - ${basePrice}) / ${basePrice} * 100 = ${percentageChange.toFixed(
      6
    )}%`
  );

  return {
    percentageChange,
    basePrice,
    basePriceSource,
    currentPrice,
    priceDifference: currentPrice - basePrice,
  };
}

/**
 * Check if percentage change meets alert conditions
 * @param {number} percentageChange - Calculated percentage change
 * @param {Object} alert - Alert object
 * @returns {Object} Result with debugging info
 */
function checkPercentageCondition(percentageChange, alert) {
  const targetValue = parseFloat(alert.targetValue);
  const direction = alert.direction;

  console.log(`🎯 === ALERT CONDITION CHECK ===`);
  console.log(`   Symbol: ${alert.symbol}`);
  console.log(`   Direction: ${direction}`);
  console.log(`   Target Value: ${targetValue}%`);
  console.log(`   Actual Change: ${percentageChange.toFixed(6)}%`);

  let conditionMet = false;
  let reason = "";

  if (direction === ">") {
    conditionMet = percentageChange >= targetValue;
    reason = `${percentageChange.toFixed(6)}% >= ${targetValue}%`;
  } else if (direction === "<") {
    conditionMet = percentageChange <= -targetValue;
    reason = `${percentageChange.toFixed(6)}% <= -${targetValue}%`;
  } else if (direction === "<>") {
    conditionMet = Math.abs(percentageChange) >= Math.abs(targetValue);
    reason = `|${percentageChange.toFixed(6)}%| >= |${targetValue}%|`;
  }

  console.log(`   Condition: ${reason}`);
  console.log(`   Result: ${conditionMet ? "✅ TRIGGER" : "❌ NO TRIGGER"}`);

  return {
    conditionMet,
    reason,
    targetValue,
    actualChange: percentageChange,
  };
}

/**
 * Check if alert count limit is reached for the current candle
 * @param {Object} alert - Alert object
 * @param {string} timeframe - Alert count timeframe
 * @returns {Promise<Object>} Alert count check result
 */
async function checkAlertCountLimit(alert, timeframe) {
  console.log(`🔢 === ALERT COUNT LIMIT CHECK ===`);
  console.log(`   Symbol: ${alert.symbol}`);
  console.log(`   Timeframe: ${timeframe}`);
  console.log(`   Alert Count Enabled: ${alert.alertCountEnabled}`);
  console.log(`   Max Alerts Per Timeframe: ${alert.maxAlertsPerTimeframe}`);

  if (!alert.alertCountEnabled || !timeframe) {
    console.log(`   Result: ✅ NO LIMIT (alert count disabled)`);
    return { canSendAlert: true, reason: "Alert count disabled" };
  }

  // Get current candle data for the alert count timeframe
  const binanceTimeframe =
    {
      "5MIN": "5m",
      "15MIN": "15m",
      "1HR": "1h",
      "4HR": "4h",
      "12HR": "12h",
      D: "1d",
    }[timeframe] || "5m";

  const currentCandle = await getCurrentCandleData(
    alert.symbol,
    binanceTimeframe
  );
  if (!currentCandle) {
    console.log(
      `   Result: ⚠️ WARNING (could not fetch candle data - allowing alert)`
    );
    return {
      canSendAlert: true,
      reason: "Could not fetch candle data - allowing alert",
    };
  }

  const currentCandleOpenTime = currentCandle.openTime.toString();
  console.log(`   Current Candle Open Time: ${currentCandleOpenTime}`);
  console.log(
    `   Current Candle Timestamp: ${currentCandle.timestamp.toISOString()}`
  );

  // Initialize timeframeAlertCounters if it doesn't exist
  if (!alert.timeframeAlertCounters) {
    alert.timeframeAlertCounters = new Map();
  }

  // Check if this is a new candle
  const counter = alert.timeframeAlertCounters.get(timeframe);
  const isNewCandle =
    !counter || counter.lastCandleOpenTime !== currentCandleOpenTime;

  console.log(
    `   Previous Candle Open Time: ${counter?.lastCandleOpenTime || "none"}`
  );
  console.log(`   Is New Candle: ${isNewCandle}`);
  console.log(`   Current Count: ${counter?.count || 0}`);

  if (isNewCandle) {
    // New candle detected - reset counter to 0 (will be incremented after alert is sent)
    console.log(`   ✅ NEW CANDLE DETECTED - Resetting counter to 0`);
    alert.timeframeAlertCounters.set(timeframe, {
      count: 0,
      lastCandleOpenTime: currentCandleOpenTime,
      lastResetTime: new Date(),
    });
    await alert.save();
    console.log(
      `   Result: ✅ CAN SEND ALERT (new candle, counter reset to 0)`
    );
    return {
      canSendAlert: true,
      reason: "New candle detected, counter reset",
      currentCount: 0,
      maxCount: alert.maxAlertsPerTimeframe,
      isNewCandle: true,
    };
  }

  // Check if limit is reached for current candle
  const currentCount = counter.count || 0;
  const limitReached = currentCount >= alert.maxAlertsPerTimeframe;

  if (limitReached) {
    console.log(
      `   Result: 🚫 BLOCKED (limit reached: ${currentCount}/${alert.maxAlertsPerTimeframe})`
    );
    console.log(
      `   This candle (${currentCandleOpenTime}) has already triggered ${currentCount} alerts`
    );
    return {
      canSendAlert: false,
      reason: `Alert count limit reached for this candle (${currentCount}/${alert.maxAlertsPerTimeframe})`,
      currentCount,
      maxCount: alert.maxAlertsPerTimeframe,
      isNewCandle: false,
    };
  } else {
    console.log(
      `   Result: ✅ CAN SEND ALERT (count: ${currentCount}/${alert.maxAlertsPerTimeframe})`
    );
    return {
      canSendAlert: true,
      reason: `Within limit for this candle (${currentCount}/${alert.maxAlertsPerTimeframe})`,
      currentCount,
      maxCount: alert.maxAlertsPerTimeframe,
      isNewCandle: false,
    };
  }
}

/**
 * Increment alert count for the current candle
 * @param {Object} alert - Alert object
 * @param {string} timeframe - Alert count timeframe
 * @returns {Promise<void>}
 */
async function incrementAlertCount(alert, timeframe) {
  if (!alert.alertCountEnabled || !timeframe) {
    console.log(
      `📈 Skipping alert count increment - alert count disabled or no timeframe`
    );
    return;
  }

  console.log(`📈 === INCREMENTING ALERT COUNT ===`);
  console.log(`   Symbol: ${alert.symbol}`);
  console.log(`   Timeframe: ${timeframe}`);

  // Get current candle data
  const binanceTimeframe =
    {
      "5MIN": "5m",
      "15MIN": "15m",
      "1HR": "1h",
      "4HR": "4h",
      "12HR": "12h",
      D: "1d",
    }[timeframe] || "5m";

  const currentCandle = await getCurrentCandleData(
    alert.symbol,
    binanceTimeframe
  );
  if (!currentCandle) {
    console.log(
      `⚠️ Could not increment alert count - no candle data for ${alert.symbol}`
    );
    return;
  }

  const currentCandleOpenTime = currentCandle.openTime.toString();

  // Initialize timeframeAlertCounters if it doesn't exist
  if (!alert.timeframeAlertCounters) {
    alert.timeframeAlertCounters = new Map();
  }

  const counter = alert.timeframeAlertCounters.get(timeframe);
  const isNewCandle =
    !counter || counter.lastCandleOpenTime !== currentCandleOpenTime;

  console.log(`   Current Candle Open Time: ${currentCandleOpenTime}`);
  console.log(
    `   Previous Candle Open Time: ${counter?.lastCandleOpenTime || "none"}`
  );
  console.log(`   Is New Candle: ${isNewCandle}`);
  console.log(`   Previous Count: ${counter?.count || 0}`);

  if (isNewCandle) {
    // New candle - set count to 1 (this is the first alert for this candle)
    alert.timeframeAlertCounters.set(timeframe, {
      count: 1,
      lastCandleOpenTime: currentCandleOpenTime,
      lastResetTime: new Date(),
    });
    console.log(
      `📈 Alert count set for ${alert.symbol} ${timeframe}: 1 (new candle)`
    );
  } else {
    // Same candle - increment existing count
    const newCount = (counter.count || 0) + 1;
    alert.timeframeAlertCounters.set(timeframe, {
      count: newCount,
      lastCandleOpenTime: currentCandleOpenTime,
      lastResetTime: counter.lastResetTime || new Date(),
    });
    console.log(
      `📈 Alert count incremented for ${alert.symbol} ${timeframe}: ${newCount} (same candle)`
    );
  }

  await alert.save();
  console.log(`✅ Alert count saved successfully`);
}

/**
 * Main alert processing function with comprehensive fixes
 * @returns {Promise<Object>} Processing stats
 */
const processAlertsComprehensive = async (io = null) => {
  const stats = {
    processed: 0,
    triggered: 0,
    notificationsSent: 0,
    errors: 0,
    skipped: 0,
    volumeFiltered: 0,
    changePercentFiltered: 0,
    countLimited: 0,
  };

  try {
    console.log(`\n🚀 === COMPREHENSIVE ALERT PROCESSING STARTED ===`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    // Get all active alerts
    const activeAlerts = await Alert.find({ isActive: true });

    if (activeAlerts.length === 0) {
      console.log("❌ No active alerts to process");
      return stats;
    }

    console.log(`✅ Found ${activeAlerts.length} active alerts`);

    // CRITICAL: Only process alerts that were explicitly created by user action
    const userCreatedAlerts = activeAlerts.filter((alert) => {
      const isUserCreated = alert.userExplicitlyCreated === true;
      if (!isUserCreated) {
        console.log(
          `🚫 SKIPPING BACKGROUND ALERT: ${alert.symbol} - Not explicitly created by user`
        );
        stats.skipped++;
      }
      return isUserCreated;
    });

    if (userCreatedAlerts.length === 0) {
      console.log(
        "🚫 No user-created alerts to process - background alerts disabled"
      );
      return stats;
    }

    console.log(
      `✅ Processing ${userCreatedAlerts.length} user-created alerts (skipped ${stats.skipped} background alerts)`
    );

    // Get all favorite pairs from the database
    const favoriteCryptos = await Crypto.find({ isFavorite: true });
    const favoriteSymbols = favoriteCryptos.map((crypto) => crypto.symbol);

    console.log(
      `🔍 FAVORITES FILTER: Found ${favoriteSymbols.length} favorite pairs:`,
      favoriteSymbols
    );

    // Filter user-created alerts to only process those for favorite pairs
    const favoriteAlerts = userCreatedAlerts.filter((alert) => {
      const isFavorite = favoriteSymbols.includes(alert.symbol);
      if (!isFavorite) {
        console.log(
          `⏭️ SKIPPING NON-FAV PAIR: ${alert.symbol} - NOT in favorites`
        );
        stats.skipped++;
      } else {
        console.log(
          `✅ PROCESSING FAV PAIR: ${alert.symbol} - IS in favorites`
        );
      }
      return isFavorite;
    });

    stats.processed = favoriteAlerts.length;

    if (favoriteAlerts.length === 0) {
      console.log("🚫 No user-created alerts for favorite pairs to process");
      return stats;
    }

    console.log(
      `✅ Processing ${favoriteAlerts.length} user-created alerts for favorite pairs (skipped ${stats.skipped} non-favorite alerts)`
    );

    // Process each alert (only for favorite pairs)
    for (const alert of favoriteAlerts) {
      try {
        console.log(`\n🔍 === PROCESSING ALERT: ${alert.symbol} ===`);
        console.log(`   Alert ID: ${alert._id}`);
        console.log(`   Target: ${alert.direction} ${alert.targetValue}%`);
        console.log(`   Change % Value: ${alert.changePercentValue}%`);
        console.log(`   Timeframe: ${alert.changePercentTimeframe || "1MIN"}`);
        console.log(`   Min Daily Volume: ${alert.minDailyVolume}`);
        console.log(`   Alert Count Enabled: ${alert.alertCountEnabled}`);
        console.log(`   Alert Count Timeframe: ${alert.alertCountTimeframe}`);

        // ==========================================
        // STEP 1: MIN DAILY VOLUME FILTER (MUST PASS FIRST)
        // ==========================================
        console.log(`\n📊 === STEP 1: MIN DAILY VOLUME FILTER ===`);

        const volumeData = await getVolumeData(alert.symbol);
        if (!volumeData) {
          console.warn(
            `⚠️ Could not fetch volume data for ${alert.symbol}, skipping alert ${alert._id}`
          );
          stats.errors++;
          continue;
        }

        console.log(`   Symbol: ${alert.symbol}`);
        console.log(
          `   Current 24h Quote Volume (USDT): ${volumeData.volume24h.toLocaleString()}`
        );
        console.log(
          `   Required Min Volume: ${alert.minDailyVolume.toLocaleString()}`
        );
        console.log(
          `   Volume Check: ${volumeData.volume24h} >= ${alert.minDailyVolume}`
        );

        // CRITICAL: Min Daily Volume Filter - Skip if volume requirement not met
        if (
          alert.minDailyVolume > 0 &&
          volumeData.volume24h < alert.minDailyVolume
        ) {
          console.log(`   Result: ❌ VOLUME FILTER FAILED - Skipping alert`);
          console.log(
            `   Volume too low by: ${(
              alert.minDailyVolume - volumeData.volume24h
            ).toLocaleString()} USDT`
          );
          console.log(
            `   Percentage below requirement: ${(
              ((alert.minDailyVolume - volumeData.volume24h) /
                alert.minDailyVolume) *
              100
            ).toFixed(2)}%`
          );
          stats.volumeFiltered++;
          continue; // Skip this alert - volume requirement not met
        } else {
          console.log(`   Result: ✅ VOLUME FILTER PASSED`);
          if (alert.minDailyVolume > 0) {
            console.log(
              `   Volume exceeds requirement by: +${(
                volumeData.volume24h - alert.minDailyVolume
              ).toLocaleString()} USDT`
            );
            console.log(
              `   Percentage above requirement: +${(
                ((volumeData.volume24h - alert.minDailyVolume) /
                  alert.minDailyVolume) *
                100
              ).toFixed(2)}%`
            );
          } else {
            console.log(`   No volume requirement set (minDailyVolume = 0)`);
          }
        }

        // ==========================================
        // STEP 2: GET CURRENT PRICE
        // ==========================================
        console.log(`\n💰 === STEP 2: GET CURRENT PRICE ===`);

        const currentPrice = await getCurrentPrice(alert.symbol);
        if (!currentPrice) {
          console.warn(
            `⚠️ Could not fetch current price for ${alert.symbol}, skipping alert ${alert._id}`
          );
          stats.errors++;
          continue;
        }

        console.log(`   Current Price: ${currentPrice}`);

        // ==========================================
        // STEP 3: CALCULATE PERCENTAGE CHANGE
        // ==========================================
        console.log(`\n📈 === STEP 3: CALCULATE PERCENTAGE CHANGE ===`);

        const timeframe = alert.changePercentTimeframe || "1MIN";
        const changeData = await calculatePercentageChange(
          currentPrice,
          alert.symbol,
          timeframe,
          alert
        );

        // ==========================================
        // STEP 4: CHECK PERCENTAGE CONDITION (MUST PASS SECOND)
        // ==========================================
        console.log(`\n🎯 === STEP 4: CHECK PERCENTAGE CONDITION ===`);

        // CRITICAL: Use changePercentValue (not targetValue) for change percentage threshold
        const changePercentThreshold = alert.changePercentValue || 0;
        console.log(
          `   Change Percent Threshold (from changePercentValue): ${changePercentThreshold}%`
        );
        console.log(`   Target Value (basic alert): ${alert.targetValue}%`);
        console.log(
          `   Actual Change Percent: ${changeData.percentageChange.toFixed(6)}%`
        );
        console.log(
          `   Absolute Actual Change: ${Math.abs(
            changeData.percentageChange
          ).toFixed(6)}%`
        );
        console.log(`   Direction: ${alert.direction}`);

        let changeConditionMet = false;
        let changeReason = "";

        // CRITICAL: Change % condition logic
        if (changePercentThreshold === 0) {
          // If threshold is 0%, always pass this condition
          changeConditionMet = true;
          changeReason = "Change % threshold is 0% - condition always passes";
        } else {
          // Check based on direction and absolute change
          const absoluteChange = Math.abs(changeData.percentageChange);
          const absoluteThreshold = Math.abs(changePercentThreshold);

          if (alert.direction === ">") {
            // For upward direction: actual change must be >= threshold AND positive
            changeConditionMet =
              changeData.percentageChange >= changePercentThreshold;
            changeReason = `${changeData.percentageChange.toFixed(
              6
            )}% >= ${changePercentThreshold}% (upward)`;
          } else if (alert.direction === "<") {
            // For downward direction: actual change must be <= -threshold AND negative
            changeConditionMet =
              changeData.percentageChange <= -changePercentThreshold;
            changeReason = `${changeData.percentageChange.toFixed(
              6
            )}% <= -${changePercentThreshold}% (downward)`;
          } else if (alert.direction === "<>") {
            // For either direction: absolute change must be >= absolute threshold
            changeConditionMet = absoluteChange >= absoluteThreshold;
            changeReason = `|${changeData.percentageChange.toFixed(
              6
            )}%| >= |${changePercentThreshold}%| (either direction)`;
          }
        }

        console.log(`   Condition: ${changeReason}`);
        console.log(
          `   Result: ${
            changeConditionMet
              ? "✅ CHANGE % CONDITION MET"
              : "❌ CHANGE % CONDITION NOT MET"
          }`
        );

        // CRITICAL: Change % Filter - Skip if change requirement not met
        if (!changeConditionMet) {
          console.log(`   Result: ❌ CHANGE % FILTER FAILED - Skipping alert`);
          stats.changePercentFiltered++;
          continue; // Skip this alert - change % requirement not met
        }

        // ==========================================
        // STEP 5: CHECK ALERT COUNT LIMIT (DUPLICATION CONTROL)
        // ==========================================
        console.log(`\n🔢 === STEP 5: CHECK ALERT COUNT LIMIT ===`);

        const alertCountTimeframe = alert.alertCountTimeframe || "5MIN";
        const countCheck = await checkAlertCountLimit(
          alert,
          alertCountTimeframe
        );

        if (!countCheck.canSendAlert) {
          console.log(`   Result: 🚫 BLOCKED - Alert count limit reached`);
          console.log(`   Reason: ${countCheck.reason}`);
          stats.countLimited++;
          continue; // Skip this alert - count limit reached
        }

        console.log(`   Result: ✅ CAN SEND ALERT`);
        console.log(`   Reason: ${countCheck.reason}`);

        // ==========================================
        // STEP 6: TRIGGER ALERT (ALL CONDITIONS PASSED)
        // ==========================================
        console.log(`\n🚨 === STEP 6: TRIGGER ALERT ===`);
        console.log(`   Symbol: ${alert.symbol}`);
        console.log(
          `   Volume Condition: ✅ PASSED (${volumeData.volume24h.toLocaleString()} >= ${alert.minDailyVolume.toLocaleString()})`
        );
        console.log(`   Change % Condition: ✅ PASSED (${changeReason})`);
        console.log(`   Count Limit: ✅ PASSED (${countCheck.reason})`);
        console.log(`   Base Price Source: ${changeData.basePriceSource}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);

        stats.triggered++;

        // Increment alert count for duplication control
        await incrementAlertCount(alert, alertCountTimeframe);

        // Create triggered alert record
        try {
          const {
            createTriggeredAlert,
          } = require("../controllers/triggeredAlertController");

          const conditionMet = {
            type: "COMBINED_CONDITIONS",
            targetValue: changePercentThreshold,
            actualValue: changeData.percentageChange,
            timeframe: timeframe,
            indicator: "combined_volume_and_change",
            description: `Combined conditions met: Volume ${volumeData.volume24h.toLocaleString()} >= ${alert.minDailyVolume.toLocaleString()} AND ${changeReason}`,
            volumeCondition: {
              actual: volumeData.volume24h,
              required: alert.minDailyVolume,
              passed: true,
            },
            changeCondition: {
              actual: changeData.percentageChange,
              required: changePercentThreshold,
              direction: alert.direction,
              timeframe: timeframe,
              passed: true,
              reason: changeReason,
            },
          };

          const marketData = {
            price: currentPrice,
            volume: volumeData.volume24h,
            priceChange24h: volumeData.priceChangePercent24h,
            priceChangePercent24h: volumeData.priceChangePercent24h,
            basePrice: changeData.basePrice,
            basePriceSource: changeData.basePriceSource,
          };

          const notificationDetails = [
            {
              type: "EMAIL",
              recipient: alert.email,
              sentAt: new Date(),
              status: "PENDING",
            },
          ];

          const triggeredAlertRecord = await createTriggeredAlert(
            alert._id,
            conditionMet,
            marketData,
            notificationDetails
          );
          console.log(`📝 Triggered alert record created for ${alert.symbol}`);

          // Emit socket event for real-time chart updates
          if (io) {
            io.emit("triggered-alert-created", {
              triggeredAlert: triggeredAlertRecord,
              alert: alert,
              marketData: marketData,
              conditionMet: conditionMet,
              timestamp: new Date().toISOString(),
            });
            console.log(
              `📡 Socket event emitted for triggered alert: ${alert.symbol}`
            );
          }
        } catch (recordError) {
          console.error(
            `❌ Error creating triggered alert record for ${alert._id}:`,
            recordError
          );
        }

        // Send notifications
        try {
          // Send Email notification
          await sendAlertEmail(
            alert.email,
            alert,
            {
              price: currentPrice,
              volume24h: volumeData.volume24h,
              priceChangePercent24h: volumeData.priceChangePercent24h,
            },
            {
              candle: {
                [timeframe]: {
                  open: changeData.basePrice,
                  close: currentPrice,
                },
              },
              rsi: {},
              ema: {},
            }
          );

          stats.notificationsSent++;
          console.log(
            `📧 Email alert notification sent to ${alert.email} for ${alert.symbol}`
          );
        } catch (emailError) {
          stats.errors++;
          console.error(
            `❌ Error sending email alert notification for ${alert._id}:`,
            emailError
          );
        }

        // Send Telegram notification
        try {
          const success = await sendAlertNotification(alert, {
            currentPrice: currentPrice,
            currentVolume: volumeData.volume24h,
            previousPrice: changeData.basePrice,
            previousVolume: 0,
            candle: {
              [timeframe]: { open: changeData.basePrice, close: currentPrice },
            },
            rsi: {},
            emaData: {},
            volumeHistory: [],
            marketData: { dailyVolume: volumeData.volume24h },
          });

          if (success) {
            console.log(
              `📱 Telegram alert notification sent for ${alert.symbol}`
            );
          } else {
            console.error(
              `❌ Failed to send Telegram notification for ${alert._id}`
            );
          }
        } catch (telegramError) {
          console.error(
            `❌ Error sending Telegram alert notification for ${alert._id}:`,
            telegramError
          );
        }

        // Update alert last triggered time
        alert.lastTriggered = new Date();
        await alert.save();

        console.log(`✅ Alert processing completed for ${alert.symbol}`);
      } catch (alertError) {
        stats.errors++;
        console.error(`❌ Error processing alert ${alert._id}:`, alertError);
      }
    }

    console.log(`\n📊 === PROCESSING COMPLETED ===`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Triggered: ${stats.triggered}`);
    console.log(`   Notifications Sent: ${stats.notificationsSent}`);
    console.log(`   Volume Filtered: ${stats.volumeFiltered}`);
    console.log(`   Change % Filtered: ${stats.changePercentFiltered}`);
    console.log(`   Count Limited: ${stats.countLimited}`);
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);

    return stats;
  } catch (error) {
    console.error("❌ Error in processAlertsComprehensive:", error);
    stats.errors++;
    return stats;
  }
};

module.exports = {
  processAlertsComprehensive,
  getCurrentPrice,
  getVolumeData,
  getCurrentCandleData,
  getHistoricalCandleData,
  calculatePercentageChange,
  checkPercentageCondition,
  checkAlertCountLimit,
  incrementAlertCount,
};
