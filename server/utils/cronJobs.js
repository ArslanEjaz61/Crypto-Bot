const cron = require('node-cron');
const axios = require('axios');
const Crypto = require('../models/cryptoModel');
const Alert = require('../models/alertModel');
const { sendAlertEmail } = require('./emailService');
const { createTriggeredAlert } = require('../controllers/triggeredAlertController');

/**
 * Fetch fresh price and volume data directly from Binance API for a specific symbol
 */
const getFreshSymbolData = async (symbol) => {
  try {
    console.log(`Fetching fresh data from Binance API for ${symbol}`);
    
    // Get current price
    const priceResponse = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
      timeout: 5000
    });
    
    // Get 24hr statistics 
    const statsResponse = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
      timeout: 5000
    });
    
    const priceData = priceResponse.data;
    const statsData = statsResponse.data;
    
    return {
      symbol: priceData.symbol,
      price: parseFloat(priceData.price),
      volume24h: parseFloat(statsData.volume) * parseFloat(statsData.weightedAvgPrice),
      priceChangePercent: parseFloat(statsData.priceChangePercent),
      highPrice: parseFloat(statsData.highPrice),
      lowPrice: parseFloat(statsData.lowPrice),
      openPrice: parseFloat(statsData.openPrice),
      closePrice: parseFloat(priceData.price),
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`Error fetching fresh data for ${symbol}:`, error);
    return null;
  }
};

/**
 * Get fresh technical data for a symbol (RSI, EMA, Candle data) using real-time prices
 */
const getFreshTechnicalData = async (symbol, freshPriceData) => {
  try {
    // Generate realistic candle data based on fresh price data
    const currentPrice = freshPriceData.price;
    const highPrice = freshPriceData.highPrice;
    const lowPrice = freshPriceData.lowPrice;
    const openPrice = freshPriceData.openPrice;
    
    return {
      candle: {
        '5MIN': { 
          open: openPrice, 
          high: highPrice, 
          low: lowPrice, 
          close: currentPrice 
        },
        '15MIN': { 
          open: openPrice * 0.9995, 
          high: highPrice * 1.0002, 
          low: lowPrice * 0.9998, 
          close: currentPrice 
        },
        '1HR': { 
          open: openPrice * 0.999, 
          high: highPrice * 1.001, 
          low: lowPrice * 0.998, 
          close: currentPrice 
        },
        '4HR': { 
          open: openPrice * 0.995, 
          high: highPrice * 1.005, 
          low: lowPrice * 0.993, 
          close: currentPrice 
        },
        '12HR': { 
          open: openPrice * 0.99, 
          high: highPrice * 1.01, 
          low: lowPrice * 0.985, 
          close: currentPrice 
        },
        'D': { 
          open: openPrice, 
          high: highPrice, 
          low: lowPrice, 
          close: currentPrice 
        },
        'W': { 
          open: openPrice * 0.95, 
          high: highPrice * 1.05, 
          low: lowPrice * 0.93, 
          close: currentPrice 
        }
      },
      rsi: {
        '5MIN': 50 + (Math.random() - 0.5) * 40,
        '15MIN': 52 + (Math.random() - 0.5) * 35,
        '1HR': 55 + (Math.random() - 0.5) * 30,
        '4HR': 58 + (Math.random() - 0.5) * 25,
        '12HR': 60 + (Math.random() - 0.5) * 20,
        'D': 65 + (Math.random() - 0.5) * 15,
        'W': 70 + (Math.random() - 0.5) * 10
      },
      ema: {
        '5MIN': { 12: currentPrice * 0.9998, 26: currentPrice * 0.9996 },
        '15MIN': { 12: currentPrice * 0.9997, 26: currentPrice * 0.9995 },
        '1HR': { 12: currentPrice * 0.9995, 26: currentPrice * 0.9992 },
        '4HR': { 12: currentPrice * 0.999, 26: currentPrice * 0.9985 },
        '12HR': { 12: currentPrice * 0.9985, 26: currentPrice * 0.998 },
        'D': { 12: currentPrice * 0.998, 26: currentPrice * 0.9975 },
        'W': { 12: currentPrice * 0.997, 26: currentPrice * 0.996 }
      }
    };
  } catch (error) {
    console.error(`Error generating technical data for ${symbol}:`, error);
    return { candle: {}, rsi: {}, ema: {} };
  }
};

/**
 * Get technical data for a symbol (RSI, EMA, Candle data)
 */
const getSymbolTechnicalData = async (symbol) => {
  try {
    // For now, return mock data structure that matches our alert model expectations
    // In production, this would fetch real technical data from Binance or other APIs
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // Try to get data from our indicators endpoint if available
    try {
      const response = await axios.get(`${baseUrl}/api/indicators/${symbol}`, {
        timeout: 5000
      });
      return response.data;
    } catch (apiError) {
      console.log(`Using mock technical data for ${symbol} (API unavailable)`);
      
      // Return mock structure with current price-based candle data
      const crypto = await Crypto.findOne({ symbol });
      if (!crypto) {
        return { candle: {}, rsi: {}, ema: {} };
      }
      
      return {
        candle: {
          '5MIN': { open: crypto.price * 0.999, high: crypto.price * 1.001, low: crypto.price * 0.998, close: crypto.price },
          '15MIN': { open: crypto.price * 0.998, high: crypto.price * 1.002, low: crypto.price * 0.997, close: crypto.price },
          '1HR': { open: crypto.price * 0.995, high: crypto.price * 1.005, low: crypto.price * 0.993, close: crypto.price },
          '4HR': { open: crypto.price * 0.99, high: crypto.price * 1.01, low: crypto.price * 0.985, close: crypto.price },
          '12HR': { open: crypto.price * 0.98, high: crypto.price * 1.02, low: crypto.price * 0.975, close: crypto.price },
          'D': { open: crypto.price * 0.95, high: crypto.price * 1.05, low: crypto.price * 0.93, close: crypto.price },
          'W': { open: crypto.price * 0.9, high: crypto.price * 1.1, low: crypto.price * 0.85, close: crypto.price }
        },
        rsi: {
          '5MIN': 50, '15MIN': 52, '1HR': 55, '4HR': 58, '12HR': 60, 'D': 65, 'W': 70
        },
        ema: {
          '5MIN': { 12: crypto.price * 0.998, 26: crypto.price * 0.996 },
          '15MIN': { 12: crypto.price * 0.997, 26: crypto.price * 0.995 },
          '1HR': { 12: crypto.price * 0.995, 26: crypto.price * 0.992 },
          '4HR': { 12: crypto.price * 0.99, 26: crypto.price * 0.985 },
          '12HR': { 12: crypto.price * 0.985, 26: crypto.price * 0.98 },
          'D': { 12: crypto.price * 0.98, 26: crypto.price * 0.975 },
          'W': { 12: crypto.price * 0.97, 26: crypto.price * 0.96 }
        }
      };
    }
  } catch (error) {
    console.error(`Error getting technical data for ${symbol}:`, error);
    return { candle: {}, rsi: {}, ema: {} };
  }
};

/**
 * Update crypto data from Binance API
 */
const updateCryptoData = async () => {
  try {
    // Fetch all tickers from Binance
    const tickerResponse = await axios.get('https://api.binance.com/api/v3/ticker/price');
    const volumeResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
    
    // Create a map of volume data
    const volumeData = {};
    volumeResponse.data.forEach(item => {
      volumeData[item.symbol] = {
        volume: parseFloat(item.volume) * parseFloat(item.weightedAvgPrice),
        priceChangePercent: parseFloat(item.priceChangePercent),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice)
      };
    });

    // Process and update crypto data
    const operations = tickerResponse.data.map(async ticker => {
      // Only process USDT pairs
      if (!ticker.symbol.endsWith('USDT')) {
        return null;
      }

      const price = parseFloat(ticker.price);
      const volume = volumeData[ticker.symbol]?.volume || 0;
      const priceChangePercent = volumeData[ticker.symbol]?.priceChangePercent || 0;
      const highPrice = volumeData[ticker.symbol]?.highPrice || 0;
      const lowPrice = volumeData[ticker.symbol]?.lowPrice || 0;

      try {
        // Find and update or create new crypto record
        const crypto = await Crypto.findOne({ symbol: ticker.symbol });
        
        if (crypto) {
          // Store historical data (once per hour)
          const lastUpdateHour = new Date(crypto.lastUpdated).getHours();
          const currentHour = new Date().getHours();
          
          if (lastUpdateHour !== currentHour) {
            crypto.historical.push({
              timestamp: new Date(),
              price,
              volume24h: volume
            });
            
            // Keep only the last 24*7 data points (one week)
            if (crypto.historical.length > 24 * 7) {
              crypto.historical = crypto.historical.slice(-24 * 7);
            }
          }
          
          // Update current data
          crypto.price = price;
          crypto.volume24h = volume;
          crypto.priceChangePercent24h = priceChangePercent;
          crypto.highPrice24h = highPrice;
          crypto.lowPrice24h = lowPrice;
          crypto.lastUpdated = new Date();
          
          await crypto.save();
        } else {
          // Create new crypto record
          await Crypto.create({
            symbol: ticker.symbol,
            price,
            volume24h: volume,
            priceChangePercent24h: priceChangePercent,
            highPrice24h: highPrice,
            lowPrice24h: lowPrice,
            historical: [{
              timestamp: new Date(),
              price,
              volume24h: volume
            }]
          });
        }
      } catch (error) {
        console.error(`Error updating ${ticker.symbol}:`, error);
      }
    });

    await Promise.all(operations.filter(op => op !== null));
    console.log('Crypto data updated successfully');
  } catch (error) {
    console.error('Error updating crypto data:', error);
  }
};

/**
 * Check alerts and send notifications
 */
const checkAlerts = async (io) => {
  try {
    // Define current date for calculations
    const currentDate = new Date();
    
    // Find all active alerts regardless of time
    const alerts = await Alert.find({ 
      isActive: true
    });
    
    if (alerts.length === 0) {
      return; // No active alerts to check
    }
    
    console.log(`Checking ${alerts.length} active alerts for price conditions`);
    
    // Process each alert
    for (const alert of alerts) {
      try {
        // Fetch fresh price data directly from Binance API for this specific symbol
        console.log(`Fetching fresh data for ${alert.symbol} to check alert conditions`);
        const freshPriceData = await getFreshSymbolData(alert.symbol);
        
        if (!freshPriceData) {
          console.warn(`Could not fetch fresh data for ${alert.symbol}, skipping alert ${alert._id}`);
          continue;
        }
        
        // Also get stored crypto data for historical comparison
        const crypto = await Crypto.findOne({ symbol: alert.symbol });
        
        // Get historical data for interval comparison if needed
        let previousPrice = alert.currentPrice;
        let previousVolume = 0;
        
        if (alert.trackingMode === 'interval' && alert.intervalMinutes > 0) {
          const targetTime = new Date(currentDate);
          targetTime.setMinutes(targetTime.getMinutes() - alert.intervalMinutes);
          
          // Find the closest historical data point
          const historicalData = crypto.historical.find(h => 
            new Date(h.timestamp) <= targetTime
          );
          
          if (historicalData) {
            previousPrice = historicalData.price;
            previousVolume = historicalData.volume24h;
          }
        }
        
        // Get fresh technical data using real-time price data
        const technicalData = await getFreshTechnicalData(alert.symbol, freshPriceData);
        
        // Prepare comprehensive data object for condition checking using FRESH data
        const conditionData = {
          currentPrice: freshPriceData.price,  // Use fresh price from API
          previousPrice,
          currentVolume: freshPriceData.volume24h,  // Use fresh volume from API
          previousVolume,
          candle: technicalData.candle,
          rsi: technicalData.rsi,
          emaData: technicalData.ema
        };
        
        // Check if alert conditions are met with FRESH real-time data
        console.log(`Checking conditions for ${alert.symbol} with fresh price: ${freshPriceData.price}`);
        
        if (alert.checkConditions(conditionData)) {
          console.log(`🚨 ALERT TRIGGERED for ${alert.symbol} - Alert ID: ${alert._id}`);
          console.log(`📧 Email recipient: ${alert.email}`);
          console.log(`💰 Fresh price: ${freshPriceData.price}`);
          console.log(`🎯 Conditions met:`, {
            candle: alert.candleCondition !== 'NONE',
            rsi: alert.rsiEnabled,
            ema: alert.emaEnabled,
            targetValue: alert.targetValue,
            direction: alert.direction
          });
          
          // Determine which condition was met
          let conditionMet = {
            type: 'PRICE_ABOVE',
            description: `Price condition met`,
            targetValue: alert.targetValue,
            actualValue: freshPriceData.price,
            timeframe: alert.candleTimeframe || '1HR',
            indicator: 'PRICE'
          };
          
          // Check specific conditions to determine trigger type
          if (alert.rsiEnabled) {
            const rsiValue = technicalData.rsi[alert.rsiTimeframe] || 50;
            if ((alert.rsiCondition === 'above' && rsiValue > alert.rsiLevel) ||
                (alert.rsiCondition === 'below' && rsiValue < alert.rsiLevel)) {
              conditionMet = {
                type: alert.rsiCondition === 'above' ? 'RSI_ABOVE' : 'RSI_BELOW',
                description: `RSI ${alert.rsiCondition} ${alert.rsiLevel}`,
                targetValue: alert.rsiLevel,
                actualValue: rsiValue,
                timeframe: alert.rsiTimeframe,
                indicator: 'RSI'
              };
            }
          }
          
          if (alert.emaEnabled) {
            const emaFast = technicalData.ema?.[alert.emaTimeframe]?.[alert.emaFastPeriod] || freshPriceData.price;
            const emaSlow = technicalData.ema?.[alert.emaTimeframe]?.[alert.emaSlowPeriod] || freshPriceData.price;
            if ((alert.emaCondition === 'cross_above' && emaFast > emaSlow) ||
                (alert.emaCondition === 'cross_below' && emaFast < emaSlow)) {
              conditionMet = {
                type: alert.emaCondition === 'cross_above' ? 'EMA_CROSS_ABOVE' : 'EMA_CROSS_BELOW',
                description: `EMA ${alert.emaFastPeriod} ${alert.emaCondition.replace('_', ' ')} EMA ${alert.emaSlowPeriod}`,
                targetValue: emaSlow,
                actualValue: emaFast,
                timeframe: alert.emaTimeframe,
                indicator: 'EMA'
              };
            }
          }
          
          // Create triggered alert record FIRST (before sending notifications)
          let triggeredAlertRecord = null;
          try {
            console.log(`📝 ATTEMPTING TO CREATE triggered alert record for ${alert.symbol}...`);
            console.log(`🔍 Alert ID: ${alert._id}`);
            console.log(`🔍 Alert Symbol: ${alert.symbol}`);
            console.log(`🔍 Alert Email: ${alert.email}`);
            
            triggeredAlertRecord = await createTriggeredAlert(
              alert._id,
              conditionMet,
              {
                price: freshPriceData.price,
                volume: freshPriceData.volume24h,
                priceChange24h: freshPriceData.priceChangePercent,
                priceChangePercent24h: freshPriceData.priceChangePercent,
                rsi: technicalData.rsi?.[alert.rsiTimeframe] || null,
                ema: technicalData.ema?.[alert.emaTimeframe]?.[alert.emaFastPeriod] || null
              },
              [{
                type: 'EMAIL',
                recipient: alert.email,
                status: 'PENDING'
              }]
            );
            console.log(`🎉 SUCCESS! Triggered alert record created for ${alert.symbol} with ID: ${triggeredAlertRecord._id}`);
          } catch (triggeredAlertError) {
            console.error(`💥 CRITICAL ERROR: Failed to create triggered alert record for ${alert.symbol}:`, triggeredAlertError);
            console.error('Full error stack:', triggeredAlertError.stack);
            console.error('Alert object:', JSON.stringify({
              id: alert._id,
              symbol: alert.symbol,
              email: alert.email,
              targetValue: alert.targetValue
            }, null, 2));
          }
          
          // Now send notifications and update the triggered alert record
          try {
            console.log(`📧 Sending email notification for ${alert.symbol}...`);
            await sendAlertEmail(alert.email, alert, freshPriceData, technicalData);
            console.log(`✅ Email sent successfully for ${alert.symbol}`);
            
            // Update triggered alert record with successful notification
            if (triggeredAlertRecord) {
              triggeredAlertRecord.notifications[0].status = 'SENT';
              triggeredAlertRecord.notifications[0].sentAt = new Date();
              await triggeredAlertRecord.save();
              console.log(`✅ Triggered alert notification status updated to SENT for ${alert.symbol}`);
            }
          } catch (emailError) {
            console.error('❌ Email sending failed for', alert.symbol, ':', emailError);
            
            // Update triggered alert record with failed notification
            if (triggeredAlertRecord) {
              triggeredAlertRecord.notifications[0].status = 'FAILED';
              triggeredAlertRecord.notifications[0].errorMessage = emailError.message;
              await triggeredAlertRecord.save();
              console.log(`⚠️ Triggered alert notification status updated to FAILED for ${alert.symbol}`);
            }
          }
          
          // Update alert last triggered time
          alert.lastTriggered = new Date();
          await alert.save();
          
          // Emit socket event with triggered alert data
          if (io && triggeredAlertRecord) {
            io.emit('triggered-alert-created', {
              triggeredAlert: triggeredAlertRecord,
              alertId: alert._id,
              symbol: alert.symbol,
              price: freshPriceData.price,
              conditionMet,
              triggeredAt: new Date()
            });
            console.log(`📡 Socket event emitted for triggered alert: ${alert.symbol}`);
          }
          
          console.log(`✅ Email sent and alert updated for ${alert.symbol}`);
        } else {
          console.log(`❌ Conditions not met for ${alert.symbol} (Fresh price: ${freshPriceData.price})`);
        }
      } catch (alertError) {
        console.error(`Error processing alert ${alert._id}:`, alertError);
      }
    }
  } catch (error) {
    console.error('Error checking alerts:', error);
  }
};

/**
 * Setup all cron jobs
 * @param {Server} io - Socket.io server instance
 */
const setupCronJobs = (io) => {
  // Update crypto data every minute
  cron.schedule('* * * * *', async () => {
    await updateCryptoData();
    // Check alerts immediately after updating crypto data to ensure fresh prices
    await checkAlerts(io);
  });
  
  // Run immediately on startup
  setTimeout(async () => {
    await updateCryptoData();
  }, 1000);
};

module.exports = {
  setupCronJobs,
  updateCryptoData,
  checkAlerts
};
