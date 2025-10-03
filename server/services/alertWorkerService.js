const { redisSubscriber, alertOps, priceOps } = require('../config/redis');
const Alert = require('../models/alertModel');
const TriggeredAlert = require('../models/TriggeredAlert');
const { sendTelegramNotification } = require('../utils/telegramService');

/**
 * Alert Worker Service
 * 
 * This service:
 * 1. Subscribes to Redis "prices" channel
 * 2. On each price update, checks all alerts for that symbol
 * 3. If alert conditions are met, triggers the alert
 * 4. Publishes triggered alerts to Redis "alerts" channel
 * 5. Saves triggered alerts to MongoDB
 * 6. Sends notifications (Telegram, Email, etc.)
 */

class AlertWorkerService {
  constructor() {
    this.isRunning = false;
    this.stats = {
      priceUpdatesReceived: 0,
      alertsChecked: 0,
      alertsTriggered: 0,
      errors: 0,
      startTime: Date.now(),
      lastUpdate: null
    };
    this.alertCache = new Map(); // Cache of alerts by symbol
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Start the worker service
   */
  async start() {
    console.log('🚀 Starting Alert Worker Service...');
    
    try {
      // Load alerts into cache
      await this.loadAlertsIntoCache();
      
      // Subscribe to price updates
      await this.subscribeToPriceUpdates();
      
      // Subscribe to alert updates (add/remove)
      await this.subscribeToAlertUpdates();
      
      this.isRunning = true;
      
      // Start stats reporting every 60 seconds
      setInterval(() => {
        this.printStats();
      }, 60000);
      
      console.log('✅ Alert Worker Service started successfully');
    } catch (error) {
      console.error('❌ Failed to start Alert Worker Service:', error.message);
      throw error;
    }
  }

  /**
   * Load all active alerts from MongoDB into cache
   */
  async loadAlertsIntoCache() {
    try {
      console.log('📥 Loading alerts into cache...');
      
      const alerts = await Alert.find({ 
        isActive: true, 
        userExplicitlyCreated: true 
      });
      
      console.log(`Found ${alerts.length} active alerts`);
      
      for (const alert of alerts) {
        if (!this.alertCache.has(alert.symbol)) {
          this.alertCache.set(alert.symbol, []);
        }
        this.alertCache.get(alert.symbol).push(alert);
      }
      
      console.log(`✅ Loaded alerts for ${this.alertCache.size} symbols`);
      
      // Also sync to Redis
      const { syncAlertsFromDB } = require('../config/redis');
      await syncAlertsFromDB();
      
    } catch (error) {
      console.error('❌ Error loading alerts into cache:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to Redis price updates channel
   */
  async subscribeToPriceUpdates() {
    try {
      await redisSubscriber.subscribe('prices', (err, count) => {
        if (err) {
          console.error('❌ Error subscribing to prices channel:', err.message);
          return;
        }
        console.log(`✅ Subscribed to ${count} channel(s): prices`);
      });

      redisSubscriber.on('message', async (channel, message) => {
        if (channel === 'prices') {
          await this.handlePriceUpdate(message);
        }
      });
      
    } catch (error) {
      console.error('❌ Error subscribing to price updates:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to alert updates (add/remove alerts)
   */
  async subscribeToAlertUpdates() {
    try {
      await redisSubscriber.subscribe('alert-updates', (err, count) => {
        if (err) {
          console.error('❌ Error subscribing to alert-updates:', err.message);
          return;
        }
        console.log(`✅ Subscribed to alert-updates channel`);
      });

      redisSubscriber.on('message', async (channel, message) => {
        if (channel === 'alert-updates') {
          await this.handleAlertUpdate(message);
        }
      });
      
    } catch (error) {
      console.error('❌ Error subscribing to alert updates:', error.message);
    }
  }

  /**
   * Handle price update from Redis
   */
  async handlePriceUpdate(message) {
    try {
      this.stats.priceUpdatesReceived++;
      
      const priceData = JSON.parse(message);
      const { symbol, price } = priceData;
      
      // Check if we have alerts for this symbol
      const alerts = this.alertCache.get(symbol);
      
      if (!alerts || alerts.length === 0) {
        return; // No alerts for this symbol
      }
      
      // Add to processing queue
      this.processingQueue.push({
        symbol,
        priceData,
        alerts
      });
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
      
      this.stats.lastUpdate = new Date().toISOString();
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Error handling price update:', error.message);
    }
  }

  /**
   * Process the alert checking queue
   */
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const batch = this.processingQueue.splice(0, 10); // Process 10 at a time
      
      await Promise.allSettled(
        batch.map(item => this.checkAlertsForSymbol(item.symbol, item.priceData, item.alerts))
      );
    }
    
    this.isProcessing = false;
  }

  /**
   * Check all alerts for a symbol
   */
  async checkAlertsForSymbol(symbol, priceData, alerts) {
    try {
      for (const alert of alerts) {
        this.stats.alertsChecked++;
        
        // Refresh alert from DB to get latest state
        const freshAlert = await Alert.findById(alert._id);
        
        if (!freshAlert || !freshAlert.isActive) {
          // Alert was deleted or deactivated, remove from cache
          this.removeAlertFromCache(symbol, alert._id);
          continue;
        }
        
        // Check if alert conditions are met
        const shouldTrigger = await this.checkAlertConditions(freshAlert, priceData);
        
        if (shouldTrigger) {
          await this.triggerAlert(freshAlert, priceData);
        }
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error checking alerts for ${symbol}:`, error.message);
    }
  }

  /**
   * Check if alert conditions are met
   */
  async checkAlertConditions(alert, priceData) {
    try {
      const { price, priceChange, priceChangePercent } = priceData;
      
      // Use the alert model's checkConditions method
      const conditionsMet = alert.checkConditions({
        currentPrice: price,
        previousPrice: price - (priceChange || 0),
        marketData: {
          priceChangePercent: priceChangePercent || 0
        }
      });
      
      return conditionsMet;
    } catch (error) {
      console.error(`❌ Error checking conditions for alert ${alert._id}:`, error.message);
      return false;
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(alert, priceData) {
    try {
      console.log(`\n🚨 ===== ALERT TRIGGERED =====`);
      console.log(`Symbol: ${alert.symbol}`);
      console.log(`Current Price: ${priceData.price}`);
      console.log(`Target: ${alert.targetValue}`);
      console.log(`Direction: ${alert.direction}`);
      console.log(`==============================\n`);
      
      this.stats.alertsTriggered++;
      
      // Create triggered alert record
      const triggeredAlert = await TriggeredAlert.create({
        alertId: alert._id,
        symbol: alert.symbol,
        triggeredPrice: priceData.price,
        targetPrice: alert.targetValue,
        direction: alert.direction,
        targetType: alert.targetType,
        basePrice: alert.basePrice,
        priceChange: priceData.priceChange || 0,
        priceChangePercent: priceData.priceChangePercent || 0,
        comment: alert.comment || '',
        notificationSent: false
      });
      
      // Publish to Redis alerts channel
      await alertOps.publishTriggeredAlert({
        alertId: alert._id.toString(),
        symbol: alert.symbol,
        price: priceData.price,
        targetValue: alert.targetValue,
        direction: alert.direction,
        triggeredAlert: triggeredAlert.toObject()
      });
      
      // Update alert's lastTriggered timestamp
      alert.lastTriggered = new Date();
      
      // Increment alert count if enabled
      if (alert.alertCountEnabled) {
        alert.incrementAlertCount(alert.alertCountTimeframe, Date.now());
      }
      
      await alert.save();
      
      // Send notifications
      await this.sendNotifications(alert, triggeredAlert, priceData);
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Error triggering alert:', error.message);
    }
  }

  /**
   * Send notifications for triggered alert
   */
  async sendNotifications(alert, triggeredAlert, priceData) {
    try {
      // Send Telegram notification
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const message = this.formatTelegramMessage(alert, priceData);
        
        try {
          await sendTelegramNotification(message);
          alert.markNotificationSent('telegram');
          
          // Update triggered alert
          triggeredAlert.notificationSent = true;
          await triggeredAlert.save();
        } catch (error) {
          console.error('❌ Telegram notification failed:', error.message);
          alert.markNotificationSent('telegram', error);
        }
        
        await alert.save();
      }
      
      // TODO: Add email notification support
      // TODO: Add webhook notification support
      
    } catch (error) {
      console.error('❌ Error sending notifications:', error.message);
    }
  }

  /**
   * Format Telegram notification message
   */
  formatTelegramMessage(alert, priceData) {
    const emoji = alert.direction === '>' ? '📈' : '📉';
    const priceChangeEmoji = priceData.priceChange > 0 ? '🟢' : '🔴';
    
    let message = `${emoji} *ALERT TRIGGERED* ${emoji}\n\n`;
    message += `*Symbol:* ${alert.symbol}\n`;
    message += `*Current Price:* $${priceData.price.toFixed(8)}\n`;
    message += `*Target Price:* $${alert.targetValue}\n`;
    message += `*Direction:* ${alert.direction === '>' ? 'Above' : 'Below'}\n`;
    
    if (priceData.priceChangePercent) {
      message += `${priceChangeEmoji} *24h Change:* ${priceData.priceChangePercent.toFixed(2)}%\n`;
    }
    
    if (alert.comment) {
      message += `\n*Note:* ${alert.comment}\n`;
    }
    
    message += `\n⏰ ${new Date().toLocaleString()}`;
    
    return message;
  }

  /**
   * Handle alert updates (add/remove)
   */
  async handleAlertUpdate(message) {
    try {
      const update = JSON.parse(message);
      const { action, symbol, alertId } = update;
      
      if (action === 'add') {
        // Reload this specific alert
        const alert = await Alert.findById(alertId);
        if (alert && alert.isActive) {
          if (!this.alertCache.has(symbol)) {
            this.alertCache.set(symbol, []);
          }
          
          // Remove old version if exists
          this.removeAlertFromCache(symbol, alertId);
          
          // Add new version
          this.alertCache.get(symbol).push(alert);
          console.log(`➕ Alert ${alertId} added to cache for ${symbol}`);
        }
      } else if (action === 'remove') {
        this.removeAlertFromCache(symbol, alertId);
        console.log(`➖ Alert ${alertId} removed from cache for ${symbol}`);
      }
    } catch (error) {
      console.error('❌ Error handling alert update:', error.message);
    }
  }

  /**
   * Remove alert from cache
   */
  removeAlertFromCache(symbol, alertId) {
    if (!this.alertCache.has(symbol)) return;
    
    const alerts = this.alertCache.get(symbol);
    const filtered = alerts.filter(a => a._id.toString() !== alertId.toString());
    
    if (filtered.length === 0) {
      this.alertCache.delete(symbol);
    } else {
      this.alertCache.set(symbol, filtered);
    }
  }

  /**
   * Print service statistics
   */
  printStats() {
    const uptime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(2);
    const updatesPerMin = (this.stats.priceUpdatesReceived / (uptime || 1)).toFixed(2);
    
    console.log('\n📊 === Alert Worker Stats ===');
    console.log(`✅ Running: ${this.isRunning}`);
    console.log(`⏱️  Uptime: ${uptime} minutes`);
    console.log(`📨 Price updates: ${this.stats.priceUpdatesReceived}`);
    console.log(`🔍 Alerts checked: ${this.stats.alertsChecked}`);
    console.log(`🚨 Alerts triggered: ${this.stats.alertsTriggered}`);
    console.log(`⚡ Updates/min: ${updatesPerMin}`);
    console.log(`💾 Cached symbols: ${this.alertCache.size}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`🕐 Last update: ${this.stats.lastUpdate || 'N/A'}`);
    console.log('==============================\n');
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    console.log('🛑 Shutting down Alert Worker Service...');
    this.isRunning = false;
    
    try {
      await redisSubscriber.unsubscribe();
      this.printStats();
      console.log('✅ Alert Worker Service stopped');
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }
}

// Create singleton instance
const alertWorkerService = new AlertWorkerService();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await alertWorkerService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await alertWorkerService.shutdown();
  process.exit(0);
});

module.exports = alertWorkerService;

