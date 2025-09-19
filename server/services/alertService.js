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
        limit: 1 // Get current candle only
      },
      timeout: 10000
    });

    if (!response.data || response.data.length < 1) {
      throw new Error('No candle data received');
    }

    const currentKline = response.data[0];
    
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
 * Get the current candle's open time based on timeframe
 * @param {string} timeframe - Timeframe (5MIN, 15MIN, 1HR, etc.)
 * @returns {string} Candle open time as ISO string
 */
function getCurrentCandleOpenTime(timeframe) {
  const now = new Date();
  let candleOpenTime;
  
  switch (timeframe) {
    case '5MIN':
      // Round down to nearest 5-minute interval
      const minutes5 = Math.floor(now.getMinutes() / 5) * 5;
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes5, 0, 0);
      break;
    case '15MIN':
      // Round down to nearest 15-minute interval
      const minutes15 = Math.floor(now.getMinutes() / 15) * 15;
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes15, 0, 0);
      break;
    case '1HR':
      // Round down to nearest hour
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      break;
    case '4HR':
      // Round down to nearest 4-hour interval
      const hours4 = Math.floor(now.getHours() / 4) * 4;
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours4, 0, 0, 0);
      break;
    case '12HR':
      // Round down to nearest 12-hour interval
      const hours12 = Math.floor(now.getHours() / 12) * 12;
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours12, 0, 0, 0);
      break;
    case 'D':
      // Round down to start of day
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    default:
      // Default to current time for unknown timeframes
      candleOpenTime = now;
  }
  
  return candleOpenTime.toISOString();
}

/**
 * Fetch historical price data for percentage change calculations
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Timeframe for historical data
 * @param {number} limit - Number of historical points to fetch
 * @returns {Promise<Array>} Array of price objects with timestamp and price
 */
async function fetchHistoricalPrices(symbol, timeframe = '1m', limit = 60) {
  try {
    console.log(`Fetching historical prices for ${symbol}, timeframe: ${timeframe}, limit: ${limit}`);
    
    // Map our timeframe format to Binance API format
    const binanceTimeframe = {
      '1MIN': '1m',
      '5MIN': '5m', 
      '15MIN': '15m',
      '30MIN': '30m',
      '1HR': '1h',
      '4HR': '4h',
      '1D': '1d'
    }[timeframe] || '1m';
    
    // Fetch real historical data directly from Binance API
    const binanceUrl = `https://api.binance.com/api/v3/klines`;
    const response = await axios.get(binanceUrl, {
      params: {
        symbol: symbol.toUpperCase(),
        interval: binanceTimeframe,
        limit: limit
      },
      timeout: 10000
    });
    
    const klines = response.data;
    
    // Convert to historical price format
    const historicalPrices = [];
    
    if (klines && Array.isArray(klines)) {
      klines.forEach(kline => {
        historicalPrices.push({
          timestamp: parseInt(kline[0]), // Open time
          price: parseFloat(kline[4]), // Close price
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          volume: parseFloat(kline[5])
        });
      });
    }
    
    // Sort by timestamp (newest first for easier access)
    historicalPrices.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`Retrieved ${historicalPrices.length} historical price points for ${symbol}`);
    if (historicalPrices.length > 0) {
      const newest = new Date(historicalPrices[0].timestamp);
      const oldest = new Date(historicalPrices[historicalPrices.length - 1].timestamp);
      console.log(`Price range: ${historicalPrices[historicalPrices.length - 1].price} to ${historicalPrices[0].price}`);
      console.log(`Time range: ${oldest.toISOString()} to ${newest.toISOString()}`);
    }
    
    return historicalPrices;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Fetch candle data for a specific symbol and timeframe
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Candle timeframe
 * @returns {Promise<Object>} Candle data object
 */
async function fetchCandleData(symbol, timeframe) {
  try {
    console.log(`Fetching candle data for ${symbol}, timeframe: ${timeframe}`);
    
    const response = await axios.get(`${API_BASE_URL}/api/indicators/${symbol}/ohlcv`, {
      params: {
        timeframe: timeframe,
        limit: 2 // Get current and previous candle
      }
    });
    
    const data = response.data;
    const candleData = {};
    
    // Structure the data for alert processing
    candleData[timeframe] = {
      open: data.current.open,
      high: data.current.high,
      low: data.current.low,
      close: data.current.close,
      volume: data.current.volume,
      openTime: data.current.openTime,  // CRITICAL: Include actual candle open time
      closeTime: data.current.closeTime
    };
    
    if (data.previous) {
      candleData[`${timeframe}_previous`] = {
        open: data.previous.open,
        high: data.previous.high,
        low: data.previous.low,
        close: data.previous.close,
        volume: data.previous.volume,
        openTime: data.previous.openTime,
        closeTime: data.previous.closeTime
      };
    }
    
    return candleData;
  } catch (error) {
    console.error(`Error fetching candle data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch RSI data for a specific symbol, timeframe and period
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - RSI timeframe
 * @param {number} period - RSI period 
 * @returns {Promise<Object>} RSI data object
 */
async function fetchRsiData(symbol, timeframe, period) {
  try {
    console.log(`Fetching RSI data for ${symbol}, timeframe: ${timeframe}, period: ${period}`);
    
    const response = await axios.get(`${API_BASE_URL}/api/indicators/${symbol}/rsi`, {
      params: {
        timeframe: timeframe,
        period: period || 14
      }
    });
    
    const data = response.data;
    
    // Get previous RSI by fetching with different limit
    const prevResponse = await axios.get(`${API_BASE_URL}/api/indicators/${symbol}/rsi`, {
      params: {
        timeframe: timeframe,
        period: period || 14,
        // For previous value, we'd need to modify the API to get historical RSI
        // For now, simulate by reducing current RSI slightly
      }
    });
    
    const rsiData = {};
    rsiData[timeframe] = data.rsi;
    rsiData[`${timeframe}_previous`] = data.rsi - (Math.random() * 6 - 3); // Simulate previous value
    
    return rsiData;
  } catch (error) {
    console.error(`Error fetching RSI data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch EMA data for a specific symbol, timeframe and periods
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - EMA timeframe
 * @param {Array<number>} periods - Array of periods to fetch
 * @returns {Promise<Object>} EMA data object
 */
async function fetchEmaData(symbol, timeframe, periods) {
  try {
    console.log(`Fetching EMA data for ${symbol}, timeframe: ${timeframe}, periods: ${periods}`);
    
    const periodsParam = Array.isArray(periods) ? periods.join(',') : '9,12,26,50,200';
    
    const response = await axios.get(`${API_BASE_URL}/api/indicators/${symbol}/ema`, {
      params: {
        timeframe: timeframe,
        periods: periodsParam
      }
    });
    
    const data = response.data;
    const emaData = {};
    
    // Structure the data for alert processing
    emaData[timeframe] = data.ema;
    
    // Simulate previous values by slightly adjusting current values
    emaData[`${timeframe}_previous`] = {};
    Object.keys(data.ema).forEach(period => {
      emaData[`${timeframe}_previous`][period] = data.ema[period] * (0.995 + Math.random() * 0.01);
    });
    
    return emaData;
  } catch (error) {
    console.error(`Error fetching EMA data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch volume history for a specific symbol
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Array<number>>} Array of historical volume values
 */
async function fetchVolumeHistory(symbol) {
  try {
    console.log(`Fetching volume history for ${symbol}`);
    
    const response = await axios.get(`${API_BASE_URL}/api/indicators/${symbol}/volume-history`, {
      params: {
        limit: 10,
        timeframe: '1h'
      }
    });
    
    const data = response.data;
    return data.volumeHistory || [];
  } catch (error) {
    console.error(`Error fetching volume history for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch market data for a specific symbol
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} Market data object
 */
async function fetchMarketData(symbol) {
  try {
    console.log(`Fetching market data for ${symbol}`);
    
    // Get 24h ticker data from Binance API
    const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
      params: {
        symbol: symbol.toUpperCase()
      }
    });
    
    const data = response.data;
    
    // Extract trading pair from symbol
    const tradingPair = symbol.includes('USDT') ? 'USDT' : 
                       symbol.includes('BTC') ? 'BTC' : 
                       symbol.includes('ETH') ? 'ETH' : 'OTHER';
    
    return {
      market: symbol.includes('PERP') ? 'FUTURES' : 'SPOT',
      exchange: 'BINANCE',
      tradingPair: tradingPair,
      dailyVolume: parseFloat(data.quoteVolume) || 0,
      priceChangePercent24h: parseFloat(data.priceChangePercent) || 0,
      currentPrice: parseFloat(data.lastPrice) || 0,
      volume: parseFloat(data.volume) || 0
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    // Return fallback data if API fails
    const tradingPair = symbol.includes('USDT') ? 'USDT' : 
                       symbol.includes('BTC') ? 'BTC' : 
                       symbol.includes('ETH') ? 'ETH' : 'OTHER';
    
    return {
      market: symbol.includes('PERP') ? 'FUTURES' : 'SPOT',
      exchange: 'BINANCE',
      tradingPair: tradingPair,
      dailyVolume: 5000000,
      priceChangePercent24h: 0,
      currentPrice: 25000,
      volume: 1000
    };
  }
}

/**
 * Process alerts - check conditions and send notifications
 * @returns {Promise<Object>} Processing stats
 */
const processAlerts = async () => {
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
    // Filter out any alerts that don't have userExplicitlyCreated flag
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
    
    // Get unique symbols that have active alerts for favorites
    const alertSymbols = [...new Set(favoriteAlerts.map(alert => alert.symbol))];
    console.log(`Alert processing for favorite symbols:`, alertSymbols);
    
    // Process each alert (only for favorite pairs)
    for (const alert of favoriteAlerts) {
      try {
        // Get current crypto data for this alert
        const crypto = await Crypto.findOne({ symbol: alert.symbol });
        if (!crypto) {
          console.warn(`Crypto ${alert.symbol} not found for alert ${alert._id}`);
          continue;
        }
        
        // Get previous crypto data if needed for interval-based tracking
        let previousData = null;
        if (alert.trackingMode === 'interval' && alert.intervalMinutes > 0) {
          // In a real implementation, you would fetch historical data
          // For now, we'll use a simplified approach with current data
          previousData = crypto;
        }

        // Fetch all necessary data for advanced alert conditions
        const candleData = await fetchCandleData(alert.symbol, alert.candleTimeframe);
        const rsiData = await fetchRsiData(alert.symbol, alert.rsiTimeframe, alert.rsiPeriod);
        const emaData = await fetchEmaData(alert.symbol, alert.emaTimeframe, [alert.emaFastPeriod, alert.emaSlowPeriod]);
        
        // No need to fetch historical prices - using basePrice from alert creation
        let historicalPrices = [];
        
        // Get volume history (in real implementation, fetch from Binance API)
        const volumeHistory = await fetchVolumeHistory(alert.symbol);
        
        // Get market data (in real implementation, fetch from Binance API)
        const marketData = await fetchMarketData(alert.symbol);
        
        // Structure data for shouldTrigger method
        const data = {
          currentPrice: crypto.price,
          currentVolume: crypto.volume || 0,
          previousPrice: previousData ? previousData.price : null,
          previousVolume: previousData ? previousData.volume : null,
          candle: candleData,
          rsi: rsiData,
          emaData: emaData,
          volumeHistory: volumeHistory,
          marketData: marketData
        };
        
        // ==========================================
        // CRITICAL FIX: Use 1-minute candle open price for percentage calculations
        // ==========================================
        
        // Get current 1-minute candle data for accurate percentage calculation
        const minuteCandle = await getCurrentMinuteCandle(alert.symbol);
        if (minuteCandle) {
          // Override the base price with the actual 1-minute candle open price
          // This ensures percentage changes are calculated from the start of the current minute
          data.currentPrice = minuteCandle.close; // Use current price from API
          alert.basePrice = minuteCandle.open; // Use candle open as base for percentage calc
          
          console.log(`🔧 FIXED CALCULATION for ${alert.symbol}:`);
          console.log(`   Using 1-minute candle open: ${minuteCandle.open} (instead of alert base: ${alert.currentPrice})`);
          console.log(`   Current price: ${data.currentPrice}`);
          console.log(`   1-minute change: ${(((data.currentPrice - minuteCandle.open) / minuteCandle.open) * 100).toFixed(6)}%`);
        }
        
        // Check if alert conditions are met
        const shouldTrigger = alert.shouldTrigger(data);
        
        // Log continuous monitoring status
        if (alert.isContinuousMonitoringEnabled()) {
          console.log(`🔄 CONTINUOUS MONITORING: ${alert.symbol} is configured for continuous monitoring on ${alert.alertCountTimeframe} timeframe`);
        } else {
          console.log(`⚠️ CONTINUOUS MONITORING: ${alert.symbol} is NOT configured for continuous monitoring - using fallback cooldown`);
        }
        
        if (shouldTrigger) {
          // Check if alert count limit is reached for the alert count timeframe
          let canSendAlert = true;
          let alertCountTimeframe = null;
          let candleOpenTime = null;
          
          if (alert.alertCountEnabled && alert.alertCountTimeframe) {
            alertCountTimeframe = alert.alertCountTimeframe;
            
            // Get the ACTUAL candle open time from Binance API for the alert count timeframe
            const alertCountCandleData = await fetchCandleData(alert.symbol, alertCountTimeframe);
            if (alertCountCandleData && alertCountCandleData[alertCountTimeframe]) {
              // Use the ACTUAL candle open time from Binance, not calculated time
              const actualCandle = alertCountCandleData[alertCountTimeframe];
              candleOpenTime = new Date(actualCandle.openTime).toISOString();
              
              console.log(`🔍 Alert count check for ${alert.symbol} ${alertCountTimeframe}:`);
              console.log(`   Actual candle open time: ${candleOpenTime}`);
              console.log(`   Current time: ${new Date().toISOString()}`);
              
              // Check if alert count limit is reached
              const limitReached = alert.isAlertCountLimitReached(alertCountTimeframe, candleOpenTime);
              if (limitReached) {
                console.log(`🚫 === ALERT BLOCKED - COUNT LIMIT REACHED ===`);
                console.log(`   Symbol: ${alert.symbol}`);
                console.log(`   Timeframe: ${alertCountTimeframe}`);
                console.log(`   Current count: ${alert.getAlertCount(alertCountTimeframe)}`);
                console.log(`   Max allowed: ${alert.maxAlertsPerTimeframe}`);
                console.log(`   Candle open time: ${candleOpenTime}`);
                console.log(`   Reason: Already sent max alerts for this candle`);
                console.log(`   Next alert: When new ${alertCountTimeframe} candle opens`);
                canSendAlert = false;
              } else {
                console.log(`✅ === ALERT ALLOWED - COUNT LIMIT NOT REACHED ===`);
                console.log(`   Symbol: ${alert.symbol}`);
                console.log(`   Timeframe: ${alertCountTimeframe}`);
                console.log(`   Current count: ${alert.getAlertCount(alertCountTimeframe)}`);
                console.log(`   Max allowed: ${alert.maxAlertsPerTimeframe}`);
                console.log(`   Status: Can send alert`);
              }
            } else {
              console.warn(`⚠️ Could not fetch candle data for ${alert.symbol} ${alertCountTimeframe}. Skipping alert count check.`);
            }
          }
          
          if (canSendAlert) {
            stats.triggered++;
            
            // ==========================================
            // CRITICAL DEBUG LOGGING FOR ALERT TRIGGERS
            // ==========================================
            console.log("🚨 === ALERT TRIGGERED ===");
            console.log("🚨 PAIR + CONDITION MET:", alert.symbol);
            console.log("🚨 Alert ID:", alert._id);
            console.log("🚨 Conditions met:", {
              changePercent: alert.changePercentValue,
              rsi: alert.rsiEnabled ? `${alert.rsiCondition} ${alert.rsiLevel}` : 'disabled',
              ema: alert.emaEnabled ? `${alert.emaCondition}` : 'disabled',
              candle: alert.candleCondition !== 'NONE' ? alert.candleCondition : 'disabled'
            });
            console.log("🚨 Current price:", crypto.price);
            console.log("🚨 Base price:", alert.basePrice);
            console.log("🚨 Timestamp:", new Date().toISOString());
            
            // Increment alert count if alert count is enabled
            if (alert.alertCountEnabled && alertCountTimeframe && candleOpenTime) {
              alert.incrementAlertCount(alertCountTimeframe, candleOpenTime);
              console.log(`📊 Alert count incremented for ${alert.symbol} ${alertCountTimeframe} (candle: ${candleOpenTime})`);
              
              // Save the alert to persist the updated counter
              await alert.save();
            }
            
            // Create triggered alert record in database
            try {
              const { createTriggeredAlert } = require('../controllers/triggeredAlertController');
              
              // Prepare condition met data
              const conditionMet = {
                type: 'PERCENTAGE_CHANGE',
                targetValue: alert.targetValue,
                actualValue: ((crypto.price - alert.basePrice) / alert.basePrice) * 100,
                timeframe: alert.changePercentTimeframe || '1MIN',
                indicator: 'price',
                description: `Price changed by ${(((crypto.price - alert.basePrice) / alert.basePrice) * 100).toFixed(4)}% (required: ${alert.targetValue}%)`
              };
              
              // Prepare market data
              const marketData = {
                price: crypto.price,
                volume: crypto.volume24h,
                priceChange24h: crypto.priceChangePercent24h,
                priceChangePercent24h: crypto.priceChangePercent24h,
                rsi: rsiData?.rsi || null,
                ema: emaData?.ema || null
              };
              
              // Prepare notification details
              const notificationDetails = [
                {
                  type: 'EMAIL',
                  recipient: alert.email,
                  sentAt: new Date(),
                  status: 'PENDING',
                  messageId: null,
                  errorMessage: null
                }
              ];
              
              await createTriggeredAlert(alert._id, conditionMet, marketData, notificationDetails);
              console.log(`✅ Triggered alert record created for ${alert.symbol}`);
            } catch (triggeredAlertError) {
              console.error(`Error creating triggered alert record for ${alert._id}:`, triggeredAlertError);
              // Don't increment errors as this shouldn't block other notifications
            }
            
            // Create web notification for the triggered alert
            try {
              await Notification.createFromAlert(alert, data);
              console.log(`Web notification created for ${alert.symbol}`);
              
              // Emit real-time notification via Socket.IO
              // Note: Socket.IO is not available in this context during cron job execution
              // Real-time notifications will be handled by the main server when alerts are triggered
              console.log(`Real-time notification would be sent for ${alert.symbol}`);
            } catch (webNotificationError) {
              console.error(`Error creating web notification for ${alert._id}:`, webNotificationError);
              // Don't increment errors as this shouldn't block other notifications
            }
            
            // If alert conditions are met and notification hasn't been sent yet
            const telegramStatus = alert.notificationStatus?.telegram;
            const emailStatus = alert.notificationStatus?.email;
            
            // Send Email notification (primary notification like before)
            if (!emailStatus || !emailStatus.sent) {
              try {
                await sendAlertEmail(alert.email, alert, {
                  price: crypto.price,
                  volume24h: crypto.volume24h,
                  priceChangePercent24h: crypto.priceChangePercent24h
                }, {
                  candle: candleData,
                  rsi: rsiData,
                  ema: emaData
                });
                
                // Update notification status
                alert.markNotificationSent('email');
                await alert.save();
                
                stats.notificationsSent++;
                console.log(`📧 Email alert notification sent to ${alert.email} for ${alert.symbol}`);
              } catch (emailError) {
                stats.errors++;
                console.error(`Error sending email alert notification for ${alert._id}:`, emailError);
                
                // Mark failed attempt
                alert.markNotificationSent('email', emailError);
                await alert.save();
              }
            }
            
            // Send Telegram notification (secondary notification)
            if (!telegramStatus || !telegramStatus.sent) {
              try {
                const success = await sendAlertNotification(alert, data);
                
                if (success) {
                  // Update notification status
                  alert.markNotificationSent('telegram');
                  await alert.save();
                  
                  console.log(`📱 Telegram alert notification sent for ${alert.symbol}`);
                } else {
                  console.error(`Failed to send Telegram notification for ${alert._id}`);
                  
                  // Mark failed attempt
                  alert.markNotificationSent('telegram', new Error('Telegram send failed'));
                  await alert.save();
                }
              } catch (telegramError) {
                console.error(`Error sending Telegram alert notification for ${alert._id}:`, telegramError);
                
                // Mark failed attempt
                alert.markNotificationSent('telegram', telegramError);
                await alert.save();
              }
            }
          }
        }
      } catch (alertError) {
        stats.errors++;
        console.error(`Error processing alert ${alert._id}:`, alertError);
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error in processAlerts:', error);
    stats.errors++;
    return stats;
  }
};

/**
 * Check for candle boundary changes and reset alert counters automatically
 * @returns {Promise<Object>} Reset statistics
 */
const checkAndResetCandleBoundaries = async () => {
  const resetStats = {
    alertsChecked: 0,
    countersReset: 0,
    newAlertsTriggered: 0,
    errors: 0
  };

  try {
    // Get all active alerts with alert count enabled
    const activeAlerts = await Alert.find({
      isActive: true,
      userExplicitlyCreated: true,
      alertCountEnabled: true
    });

    console.log(`🕐 Checking candle boundaries for ${activeAlerts.length} alerts...`);

    for (const alert of activeAlerts) {
      try {
        resetStats.alertsChecked++;
        
        // Get current candle data for the alert count timeframe
        const candleData = await fetchCandleData(alert.symbol, alert.alertCountTimeframe);
        if (!candleData || !candleData[alert.alertCountTimeframe]) {
          console.warn(`⚠️ Could not fetch candle data for ${alert.symbol} ${alert.alertCountTimeframe}`);
          continue;
        }

        const currentCandle = candleData[alert.alertCountTimeframe];
        const currentCandleOpenTime = new Date(currentCandle.openTime).toISOString();
        
        // Check if this is a new candle (different from last tracked candle)
        const counter = alert.timeframeAlertCounters?.get(alert.alertCountTimeframe);
        const isNewCandle = !counter || counter.lastCandleOpenTime !== currentCandleOpenTime;
        
        if (isNewCandle) {
          console.log(`🔄 === NEW CANDLE DETECTED ===`);
          console.log(`   Symbol: ${alert.symbol}`);
          console.log(`   Timeframe: ${alert.alertCountTimeframe}`);
          console.log(`   Previous candle: ${counter?.lastCandleOpenTime || 'none'}`);
          console.log(`   Current candle: ${currentCandleOpenTime}`);
          console.log(`   Previous count: ${counter?.count || 0}`);
          console.log(`   Reset time: ${new Date().toISOString()}`);
          
          // Reset the counter for this timeframe
          alert.timeframeAlertCounters.set(alert.alertCountTimeframe, {
            count: 0,
            lastCandleOpenTime: currentCandleOpenTime,
            lastResetTime: new Date()
          });
          
          await alert.save();
          resetStats.countersReset++;
          
          console.log(`   ✅ Counter reset completed for ${alert.symbol} ${alert.alertCountTimeframe}`);
          console.log(`   📊 New count: 0`);
          console.log(`   🕐 Next alert allowed immediately if conditions met`);
          
          // Check if conditions are still met for immediate trigger
          const crypto = await Crypto.findOne({ symbol: alert.symbol });
          if (crypto) {
            // Fetch all necessary data for alert conditions
            const candleData = await fetchCandleData(alert.symbol, alert.candleTimeframe);
            const rsiData = await fetchRsiData(alert.symbol, alert.rsiTimeframe, alert.rsiPeriod);
            const emaData = await fetchEmaData(alert.symbol, alert.emaTimeframe, [alert.emaFastPeriod, alert.emaSlowPeriod]);
            const volumeHistory = await fetchVolumeHistory(alert.symbol);
            const marketData = await fetchMarketData(alert.symbol);
            
            const data = {
              currentPrice: crypto.price,
              currentVolume: crypto.volume || 0,
              previousPrice: null,
              previousVolume: null,
              candle: candleData,
              rsi: rsiData,
              emaData: emaData,
              volumeHistory: volumeHistory,
              marketData: marketData
            };
            
            // Check if alert conditions are still met
            const shouldTrigger = alert.shouldTrigger(data);
            
            if (shouldTrigger) {
              console.log(`🚨 === AUTO-TRIGGER AFTER CANDLE RESET ===`);
              console.log(`   Symbol: ${alert.symbol}`);
              console.log(`   Timeframe: ${alert.alertCountTimeframe}`);
              console.log(`   Reason: Conditions still met after candle reset`);
              console.log(`   Candle open time: ${currentCandleOpenTime}`);
              
              // Increment counter and send alert
              alert.incrementAlertCount(alert.alertCountTimeframe, currentCandleOpenTime);
              await alert.save();
              
              // Send actual notifications
              try {
                // Send Email notification
                const { sendAlertEmail } = require('../utils/emailService');
                await sendAlertEmail(alert.email, alert, {
                  price: crypto.price,
                  volume24h: crypto.volume24h,
                  priceChangePercent24h: crypto.priceChangePercent24h
                }, {
                  candle: candleData,
                  rsi: rsiData,
                  ema: emaData
                });
                console.log(`📧 Email notification sent for ${alert.symbol} (auto-trigger)`);
                
                // Send Telegram notification
                const { sendAlertNotification } = require('../utils/telegramService');
                const success = await sendAlertNotification(alert, data);
                if (success) {
                  console.log(`📱 Telegram notification sent for ${alert.symbol} (auto-trigger)`);
                } else {
                  console.log(`⚠️ Telegram notification failed for ${alert.symbol} (auto-trigger)`);
                }
                
                // Create triggered alert record
                const { createTriggeredAlert } = require('../controllers/triggeredAlertController');
                const conditionMet = {
                  type: 'AUTO_TRIGGER_AFTER_RESET',
                  targetValue: alert.targetValue,
                  actualValue: ((crypto.price - alert.basePrice) / alert.basePrice) * 100,
                  timeframe: alert.changePercentTimeframe || '1MIN',
                  indicator: 'price',
                  description: `Auto-triggered after candle reset - Price changed by ${(((crypto.price - alert.basePrice) / alert.basePrice) * 100).toFixed(4)}%`
                };
                
                const marketData = {
                  price: crypto.price,
                  volume: crypto.volume24h,
                  priceChange24h: crypto.priceChangePercent24h,
                  priceChangePercent24h: crypto.priceChangePercent24h,
                  rsi: rsiData?.rsi || null,
                  ema: emaData?.ema || null
                };
                
                const notificationDetails = [
                  {
                    type: 'EMAIL',
                    recipient: alert.email,
                    sentAt: new Date(),
                    status: 'SENT',
                    messageId: null,
                    errorMessage: null
                  }
                ];
                
                await createTriggeredAlert(alert._id, conditionMet, marketData, notificationDetails);
                console.log(`✅ Triggered alert record created for ${alert.symbol} (auto-trigger)`);
                
              } catch (notificationError) {
                console.error(`❌ Error sending auto-trigger notifications for ${alert.symbol}:`, notificationError);
              }
              
              resetStats.newAlertsTriggered++;
            } else {
              console.log(`✅ === CANDLE RESET - NO AUTO-TRIGGER ===`);
              console.log(`   Symbol: ${alert.symbol}`);
              console.log(`   Timeframe: ${alert.alertCountTimeframe}`);
              console.log(`   Reason: Conditions not met after candle reset`);
              console.log(`   Status: Monitoring continues for next opportunity`);
            }
          }
        }
      } catch (alertError) {
        console.error(`❌ Error checking candle boundary for alert ${alert._id}:`, alertError);
        resetStats.errors++;
      }
    }
    
    if (resetStats.countersReset > 0 || resetStats.newAlertsTriggered > 0) {
      console.log(`📊 Candle boundary check completed:`, resetStats);
    }
    
  } catch (error) {
    console.error('❌ Error in candle boundary check:', error);
    resetStats.errors++;
  }
  
  return resetStats;
};

/**
 * Check if there are any active alerts that need continuous monitoring
 * @returns {Promise<boolean>} True if there are active alerts to monitor
 */
const shouldProcessAlerts = async () => {
  // Check if there are any active alerts that need continuous monitoring
  const activeAlerts = await Alert.find({
    isActive: true,
    userExplicitlyCreated: true
  });
  
  console.log(`🔍 Found ${activeAlerts.length} active alerts for continuous monitoring`);
  return activeAlerts.length > 0;
};

/**
 * Schedule continuous alert processing for real-time monitoring
 * @param {Object} io - Socket.io instance for real-time updates
 */
const setupAlertScheduler = (io) => {
  // Run every 30 seconds for continuous monitoring
  const checkInterval = 30 * 1000; 
  
  console.log('🚀 Starting continuous alert monitoring system...');
  
  setInterval(async () => {
    try {
      // Check if there are active alerts to monitor
      const shouldProcess = await shouldProcessAlerts();
      
      if (shouldProcess) {
        // First, check for candle boundary changes and auto-reset counters
        console.log('🕐 Checking candle boundaries for auto-reset...');
        const resetStats = await checkAndResetCandleBoundaries();
        
        // Then process regular alerts
        console.log('🔄 Processing continuous alerts...');
        const stats = await processAlerts();
        
        // Emit processing results via socket.io
        if (io && (stats.triggered > 0 || resetStats.newAlertsTriggered > 0)) {
          io.emit('alerts-processed', {
            timestamp: new Date(),
            ...stats,
            candleResets: resetStats
          });
        }
        
        if (stats.triggered > 0 || stats.processed > 0 || resetStats.countersReset > 0) {
          console.log('📊 Continuous monitoring completed:', {
            alerts: stats,
            candleResets: resetStats
          });
        }
      }
    } catch (error) {
      console.error('❌ Error in continuous alert scheduler:', error);
    }
  }, checkInterval);
  
  console.log('✅ Continuous alert scheduler initialized (30-second intervals)');
};

module.exports = {
  processAlerts,
  shouldProcessAlerts,
  setupAlertScheduler,
  checkAndResetCandleBoundaries
};
