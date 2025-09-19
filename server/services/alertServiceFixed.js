const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');
const Notification = require('../models/notificationModel');
const { sendAlertNotification } = require('../utils/telegramService');
const { sendAlertEmail } = require('../utils/emailService');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * Get current 1-minute candle data from Binance for accurate percentage calculations
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} Current 1-minute candle data
 */
async function getCurrentMinuteCandle(symbol) {
  try {
    console.log(`🔍 Fetching 1-minute candle data for ${symbol}...`);
    
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: '1m',
        limit: 2 // Get current and previous candle
      },
      timeout: 10000
    });

    if (!response.data || response.data.length < 1) {
      throw new Error('No candle data received');
    }

    // Get the current (most recent) candle
    const currentKline = response.data[response.data.length - 1];
    
    const currentCandle = {
      openTime: parseInt(currentKline[0]),
      open: parseFloat(currentKline[1]),
      high: parseFloat(currentKline[2]),
      low: parseFloat(currentKline[3]),
      close: parseFloat(currentKline[4]),
      volume: parseFloat(currentKline[5]),
      closeTime: parseInt(currentKline[6]),
      timestamp: new Date(parseInt(currentKline[0]))
    };

    console.log(`✅ Retrieved 1-minute candle for ${symbol}:`);
    console.log(`   Open Time: ${currentCandle.timestamp.toISOString()}`);
    console.log(`   OHLC: O:${currentCandle.open} H:${currentCandle.high} L:${currentCandle.low} C:${currentCandle.close}`);

    return currentCandle;
  } catch (error) {
    console.error(`❌ Error fetching 1-minute candle for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get current price from Binance
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<number>} Current price
 */
async function getCurrentPrice(symbol) {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/ticker/price`, {
      params: { symbol: symbol },
      timeout: 5000
    });
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`❌ Error fetching current price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Calculate percentage change with proper debugging
 * @param {number} currentPrice - Current price
 * @param {number} basePrice - Base price (should be 1-minute candle open for 1-minute alerts)
 * @param {string} symbol - Trading pair symbol for logging
 * @returns {Object} Percentage change data with debugging info
 */
function calculatePercentageChange(currentPrice, basePrice, symbol) {
  const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;
  
  console.log(`📊 === PERCENTAGE CALCULATION DEBUG ===`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Current Price: ${currentPrice}`);
  console.log(`   Base Price: ${basePrice}`);
  console.log(`   Price Difference: ${currentPrice - basePrice}`);
  console.log(`   Percentage Change: ${percentageChange.toFixed(6)}%`);
  console.log(`   Calculation: (${currentPrice} - ${basePrice}) / ${basePrice} * 100 = ${percentageChange.toFixed(6)}%`);
  
  return {
    percentageChange,
    priceDifference: currentPrice - basePrice,
    basePrice,
    currentPrice
  };
}

/**
 * Check if percentage change meets alert conditions with proper debugging
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
  let reason = '';
  
  if (direction === '>') {
    conditionMet = percentageChange >= targetValue;
    reason = `${percentageChange.toFixed(6)}% >= ${targetValue}%`;
  } else if (direction === '<') {
    conditionMet = percentageChange <= -targetValue;
    reason = `${percentageChange.toFixed(6)}% <= -${targetValue}%`;
  } else if (direction === '<>') {
    conditionMet = Math.abs(percentageChange) >= Math.abs(targetValue);
    reason = `|${percentageChange.toFixed(6)}%| >= |${targetValue}%|`;
  }
  
  console.log(`   Condition: ${reason}`);
  console.log(`   Result: ${conditionMet ? '✅ TRIGGER' : '❌ NO TRIGGER'}`);
  
  return {
    conditionMet,
    reason,
    targetValue,
    actualChange: percentageChange
  };
}

/**
 * Process alerts with fixed percentage calculation logic
 * @returns {Promise<Object>} Processing stats
 */
const processAlertsFixed = async () => {
  const stats = {
    processed: 0,
    triggered: 0,
    notificationsSent: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Get all active alerts
    const activeAlerts = await Alert.find({ isActive: true });
    
    if (activeAlerts.length === 0) {
      console.log('No active alerts to process');
      return stats;
    }

    console.log(`Found ${activeAlerts.length} active alerts`);

    // CRITICAL: Only process alerts that were explicitly created by user action
    const userCreatedAlerts = activeAlerts.filter(alert => {
      const isUserCreated = alert.userExplicitlyCreated === true;
      if (!isUserCreated) {
        console.log(`🚫 SKIPPING BACKGROUND ALERT: ${alert.symbol} - Not explicitly created by user`);
        stats.skipped++;
      }
      return isUserCreated;
    });

    if (userCreatedAlerts.length === 0) {
      console.log('🚫 No user-created alerts to process - background alerts disabled');
      return stats;
    }

    console.log(`✅ Processing ${userCreatedAlerts.length} user-created alerts (skipped ${stats.skipped} background alerts)`);

    // Get all favorite pairs from the database
    const favoriteCryptos = await Crypto.find({ isFavorite: true });
    const favoriteSymbols = favoriteCryptos.map(crypto => crypto.symbol);
    
    console.log(`🔍 FAVORITES FILTER: Found ${favoriteSymbols.length} favorite pairs:`, favoriteSymbols);
    
    // Filter user-created alerts to only process those for favorite pairs
    const favoriteAlerts = userCreatedAlerts.filter(alert => {
      const isFavorite = favoriteSymbols.includes(alert.symbol);
      if (!isFavorite) {
        console.log(`⏭️ SKIPPING NON-FAV PAIR: ${alert.symbol} - NOT in favorites`);
        stats.skipped++;
      } else {
        console.log(`✅ PROCESSING FAV PAIR: ${alert.symbol} - IS in favorites`);
      }
      return isFavorite;
    });
    
    stats.processed = favoriteAlerts.length;
    
    if (favoriteAlerts.length === 0) {
      console.log('🚫 No user-created alerts for favorite pairs to process');
      return stats;
    }

    console.log(`✅ Processing ${favoriteAlerts.length} user-created alerts for favorite pairs (skipped ${stats.skipped} non-favorite alerts)`);
    
    // Process each alert (only for favorite pairs)
    for (const alert of favoriteAlerts) {
      try {
        console.log(`\n🔍 === PROCESSING ALERT: ${alert.symbol} ===`);
        console.log(`   Alert ID: ${alert._id}`);
        console.log(`   Target: ${alert.direction} ${alert.targetValue}%`);
        console.log(`   Timeframe: ${alert.changePercentTimeframe || '1MIN'}`);
        
        // Get current price
        const currentPrice = await getCurrentPrice(alert.symbol);
        if (!currentPrice) {
          console.warn(`Could not fetch current price for ${alert.symbol}, skipping alert ${alert._id}`);
          continue;
        }

        // Get 1-minute candle data for accurate percentage calculation
        const minuteCandle = await getCurrentMinuteCandle(alert.symbol);
        if (!minuteCandle) {
          console.warn(`Could not fetch 1-minute candle for ${alert.symbol}, skipping alert ${alert._id}`);
          continue;
        }

        // Determine the correct base price based on timeframe
        let basePrice;
        let timeframe;
        
        if (alert.changePercentTimeframe === '1MIN') {
          // For 1-minute alerts, use the current 1-minute candle open price
          basePrice = minuteCandle.open;
          timeframe = '1-minute candle open';
          console.log(`🎯 Using 1-minute candle open as base price: ${basePrice}`);
          console.log(`   Candle started: ${minuteCandle.timestamp.toISOString()}`);
        } else {
          // For other timeframes, fall back to alert base price (when alert was created)
          basePrice = alert.basePrice;
          timeframe = 'alert creation time';
          console.log(`🎯 Using alert base price (creation time): ${basePrice}`);
        }

        // Calculate percentage change with debugging
        const changeData = calculatePercentageChange(currentPrice, basePrice, alert.symbol);
        
        // Check if percentage condition is met
        const conditionResult = checkPercentageCondition(changeData.percentageChange, alert);
        
        if (conditionResult.conditionMet) {
          console.log(`🚨 === ALERT TRIGGERED ===`);
          console.log(`   Symbol: ${alert.symbol}`);
          console.log(`   Reason: ${conditionResult.reason}`);
          console.log(`   Base Price Source: ${timeframe}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
          
          stats.triggered++;
          
          // Send notifications
          try {
            // Send Email notification
            await sendAlertEmail(alert.email, alert, {
              price: currentPrice,
              volume24h: 0, // Will be filled from crypto data
              priceChangePercent24h: 0
            }, {
              candle: { '1MIN': minuteCandle },
              rsi: {},
              ema: {}
            });
            
            stats.notificationsSent++;
            console.log(`📧 Email alert notification sent to ${alert.email} for ${alert.symbol}`);
          } catch (emailError) {
            stats.errors++;
            console.error(`Error sending email alert notification for ${alert._id}:`, emailError);
          }
          
          // Send Telegram notification
          try {
            const success = await sendAlertNotification(alert, {
              currentPrice: currentPrice,
              currentVolume: 0,
              previousPrice: basePrice,
              previousVolume: 0,
              candle: { '1MIN': minuteCandle },
              rsi: {},
              emaData: {},
              volumeHistory: [],
              marketData: {}
            });
            
            if (success) {
              console.log(`📱 Telegram alert notification sent for ${alert.symbol}`);
            } else {
              console.error(`Failed to send Telegram notification for ${alert._id}`);
            }
          } catch (telegramError) {
            console.error(`Error sending Telegram alert notification for ${alert._id}:`, telegramError);
          }
          
          // Update alert last triggered time
          alert.lastTriggered = new Date();
          await alert.save();
          
        } else {
          console.log(`❌ Alert condition not met for ${alert.symbol}`);
          console.log(`   ${conditionResult.reason}`);
        }
        
      } catch (alertError) {
        stats.errors++;
        console.error(`Error processing alert ${alert._id}:`, alertError);
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error in processAlertsFixed:', error);
    stats.errors++;
    return stats;
  }
};

module.exports = {
  processAlertsFixed,
  getCurrentMinuteCandle,
  getCurrentPrice,
  calculatePercentageChange,
  checkPercentageCondition
};
