const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');
const { sendAlertEmail } = require('../utils/emailService');

/**
 * Fetch candle data for a specific symbol and timeframe
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Candle timeframe
 * @returns {Promise<Object>} Candle data object
 */
async function fetchCandleData(symbol, timeframe) {
  try {
    // In a real implementation, this would call Binance API
    // For now, return mock data
    const mockCandles = {
      '1HR': {
        open: 25000,
        high: 25500,
        low: 24800,
        close: 25200,
        volume: 1500
      },
      '4HR': {
        open: 24500,
        high: 25700,
        low: 24300,
        close: 25200,
        volume: 5500
      },
      'D': {
        open: 24000,
        high: 26000,
        low: 23800,
        close: 25200,
        volume: 12000
      }
    };
    
    // Add previous values
    mockCandles['1HR_previous'] = {
      open: 24800,
      high: 25200,
      low: 24600,
      close: 25000,
      volume: 1200
    };
    
    return mockCandles;
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
    // In a real implementation, this would call Binance API
    // For now, return mock data
    const mockRsiData = {
      '1HR': 65,
      '4HR': 58,
      'D': 52,
      '1HR_previous': 62,
      '4HR_previous': 55,
      'D_previous': 50
    };
    
    return mockRsiData;
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
    // In a real implementation, this would call Binance API
    // For now, return mock data
    const mockEmaData = {
      '1HR': {
        9: 24950,
        12: 24900,
        26: 24850,
        50: 24700,
        200: 24000
      },
      '4HR': {
        9: 24800,
        12: 24750,
        26: 24600,
        50: 24400,
        200: 23800
      },
      'D': {
        9: 24600,
        12: 24500,
        26: 24300,
        50: 23900,
        200: 22500
      },
      '1HR_previous': {
        9: 24930,
        12: 24880,
        26: 24830,
        50: 24680,
        200: 23980
      },
      '4HR_previous': {
        9: 24780,
        12: 24730,
        26: 24580,
        50: 24380,
        200: 23780
      },
      'D_previous': {
        9: 24580,
        12: 24480,
        26: 24280,
        50: 23880,
        200: 22480
      }
    };
    
    return mockEmaData;
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
    // In a real implementation, this would call Binance API
    // For now, return mock data - last 10 volume values
    return [1200, 1350, 1100, 980, 1420, 1580, 1250, 1300, 1150, 1400];
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
    // In a real implementation, this would call Binance API
    // For now, return mock data based on symbol
    
    // Extract trading pair from symbol
    const tradingPair = symbol.includes('USDT') ? 'USDT' : 
                       symbol.includes('BTC') ? 'BTC' : 
                       symbol.includes('ETH') ? 'ETH' : 'OTHER';
    
    return {
      market: symbol.includes('PERP') ? 'FUTURES' : 'SPOT',
      exchange: 'BINANCE',
      tradingPair: tradingPair,
      dailyVolume: Math.random() * 50000000 + 5000000, // Random between 5M and 55M
      priceChangePercent24h: (Math.random() * 10) - 5, // Random between -5% and +5%
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    return null;
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
        // Get candle data (in real implementation, fetch from Binance API)
        const candleData = await fetchCandleData(alert.symbol, alert.candleTimeframe);
        
        // Get RSI data (in real implementation, fetch from Binance API)
        const rsiData = await fetchRsiData(alert.symbol, alert.rsiTimeframe, alert.rsiPeriod);
        
        // Get EMA data (in real implementation, fetch from Binance API)
        const emaData = await fetchEmaData(alert.symbol, alert.emaTimeframe, [alert.emaFastPeriod, alert.emaSlowPeriod]);
        
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
          
          // If alert conditions are met and notification hasn't been sent yet
          const emailStatus = alert.notificationStatus?.email;
          if (!emailStatus || !emailStatus.sent) {
            // Send email notification
            try {
              await sendAlertEmail(alert.email, alert, crypto);
              
              // Update notification status
              alert.markNotificationSent('email');
              await alert.save();
              
              stats.notificationsSent++;
              console.log(`Alert notification sent for ${alert.symbol} to ${alert.email}`);
            } catch (emailError) {
              stats.errors++;
              console.error(`Error sending alert notification for ${alert._id}:`, emailError);
              
              // Mark failed attempt
              alert.markNotificationSent('email', emailError);
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
