const cron = require('node-cron');
const axios = require('axios');
const Crypto = require('../models/cryptoModel');
const Alert = require('../models/alertModel');
const { sendAlertEmail } = require('./emailService');

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
        // Get current crypto data
        const crypto = await Crypto.findOne({ symbol: alert.symbol });
        
        if (!crypto) {
          console.warn(`Crypto ${alert.symbol} not found for alert ${alert._id}`);
          continue;
        }
        
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
        
        // Check if alert should be triggered
        if (alert.shouldTrigger(crypto.price, crypto.volume24h, previousPrice, previousVolume)) {
          // Send email notification
          await sendAlertEmail(alert.email, alert, crypto);
          
          // Update alert last triggered time
          alert.lastTriggered = new Date();
          await alert.save();
          
          // Emit socket event
          if (io) {
            io.emit('alert-triggered', {
              alertId: alert._id,
              symbol: alert.symbol,
              price: crypto.price,
              triggeredAt: new Date()
            });
          }
          
          console.log(`Alert triggered for ${alert.symbol}`);
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
