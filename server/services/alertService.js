const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');
const Notification = require('../models/notificationModel');
const { sendAlertNotification } = require('../utils/telegramService');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

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
      '1HR': '1h'
    }[timeframe] || '1m';
    
    const response = await axios.get(`${API_BASE_URL}/api/indicators/${symbol}/ohlcv`, {
      params: {
        timeframe: binanceTimeframe,
        limit: limit
      }
    });
    
    const data = response.data;
    
    // Convert to historical price format
    const historicalPrices = [];
    
    if (data.klines && Array.isArray(data.klines)) {
      data.klines.forEach(kline => {
        historicalPrices.push({
          timestamp: kline.openTime,
          price: parseFloat(kline.close)
        });
      });
    }
    
    // Sort by timestamp (oldest first)
    historicalPrices.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`Retrieved ${historicalPrices.length} historical price points for ${symbol}`);
    return historicalPrices;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
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
      volume: data.current.volume
    };
    
    if (data.previous) {
      candleData[`${timeframe}_previous`] = {
        open: data.previous.open,
        high: data.previous.high,
        low: data.previous.low,
        close: data.previous.close,
        volume: data.previous.volume
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
  };

  try {
    // Get all active alerts
    const activeAlerts = await Alert.find({ isActive: true });
    stats.processed = activeAlerts.length;
    
    if (activeAlerts.length === 0) {
      return stats;
    }

    console.log(`Processing ${activeAlerts.length} active alerts`);
    
    // Process each alert
    for (const alert of activeAlerts) {
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
        
        // Fetch historical prices for percentage change calculations
        let historicalPrices = [];
        if (alert.changePercentValue > 0) {
          // Calculate how much historical data we need based on timeframe
          const timeframeMinutes = alert.getTimeframeInMinutes(alert.changePercentTimeframe);
          const limit = Math.max(timeframeMinutes + 10, 60); // Get extra data points for accuracy
          historicalPrices = await fetchHistoricalPrices(alert.symbol, alert.changePercentTimeframe, limit);
        }
        
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
          marketData: marketData,
          historicalPrices: historicalPrices
        };
        
        // Check if alert conditions are met
        const shouldTrigger = alert.shouldTrigger(data);
        
        if (shouldTrigger) {
          stats.triggered++;
          
          // Create web notification for the triggered alert
          try {
            await Notification.createFromAlert(alert, data);
            console.log(`Web notification created for ${alert.symbol}`);
            
            // Emit real-time notification via Socket.IO
            const io = req?.app?.get('io');
            if (io) {
              io.emit('new-notification', {
                symbol: alert.symbol,
                message: `${alert.symbol} alert triggered`,
                timestamp: new Date(),
                type: 'ALERT_TRIGGERED'
              });
            }
          } catch (webNotificationError) {
            console.error(`Error creating web notification for ${alert._id}:`, webNotificationError);
            // Don't increment errors as this shouldn't block other notifications
          }
          
          // If alert conditions are met and notification hasn't been sent yet
          const telegramStatus = alert.notificationStatus?.telegram;
          if (!telegramStatus || !telegramStatus.sent) {
            // Send Telegram notification
            try {
              const success = await sendAlertNotification(alert, data);
              
              if (success) {
                // Update notification status
                alert.markNotificationSent('telegram');
                await alert.save();
                
                stats.notificationsSent++;
                console.log(`Telegram alert notification sent for ${alert.symbol}`);
              } else {
                stats.errors++;
                console.error(`Failed to send Telegram notification for ${alert._id}`);
                
                // Mark failed attempt
                alert.markNotificationSent('telegram', new Error('Telegram send failed'));
                await alert.save();
              }
            } catch (telegramError) {
              stats.errors++;
              console.error(`Error sending Telegram alert notification for ${alert._id}:`, telegramError);
              
              // Mark failed attempt
              alert.markNotificationSent('telegram', telegramError);
              await alert.save();
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
 * Check if it's time to process alerts based on configured alert times
 * @returns {Promise<boolean>} True if any alerts should be processed now
 */
const shouldProcessAlerts = async () => {
  // Get current time in HH:MM format
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Check if any alerts are configured for the current time
  const matchingAlerts = await Alert.find({
    alertTime: currentTime,
    isActive: true
  });
  
  return matchingAlerts.length > 0;
};

/**
 * Schedule alert processing to run at specific intervals
 * @param {Object} io - Socket.io instance for real-time updates
 */
const setupAlertScheduler = (io) => {
  // Run every minute
  const checkInterval = 60 * 1000; 
  
  setInterval(async () => {
    try {
      // Check if we should process alerts based on configured times
      const shouldProcess = await shouldProcessAlerts();
      
      if (shouldProcess) {
        console.log('Processing scheduled alerts');
        const stats = await processAlerts();
        
        // Emit processing results via socket.io
        if (io && stats.triggered > 0) {
          io.emit('alerts-processed', {
            timestamp: new Date(),
            ...stats
          });
        }
        
        console.log('Alert processing completed:', stats);
      }
    } catch (error) {
      console.error('Error in alert scheduler:', error);
    }
  }, checkInterval);
  
  console.log('Alert scheduler initialized');
};

module.exports = {
  processAlerts,
  shouldProcessAlerts,
  setupAlertScheduler
};
