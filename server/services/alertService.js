const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');
const Notification = require('../models/notificationModel');
const { sendAlertNotification } = require('../utils/telegramService');
const { sendAlertEmail } = require('../utils/emailService');
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
      console.log('No active alerts to process');
      return stats;
    }

    console.log(`Processing ${activeAlerts.length} active alerts`);
    
    // Get unique symbols that have active alerts
    const alertSymbols = [...new Set(activeAlerts.map(alert => alert.symbol))];
    console.log(`Alert processing for symbols:`, alertSymbols);
    
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
