/**
 * Real-time Alert Worker Service
 * 
 * This enhanced worker implements the complete real-time alert system:
 * 1. Subscribes to Binance WebSocket price updates
 * 2. Checks all three conditions simultaneously (Min Daily Candle, +Change%, Alert Count)
 * 3. Triggers alerts instantly when ALL conditions are met
 * 4. Publishes to frontend via WebSocket Gateway
 * 5. Stores triggered alerts in history
 * 
 * Key Features:
 * - Instant condition checking (1-2 seconds)
 * - All conditions must pass simultaneously
 * - Real-time WebSocket integration
 * - Comprehensive alert history
 */

const { redisSubscriber, priceOps, alertOps, conditionOps } = require('../config/redis');
const Alert = require('../models/alertModel');
const TriggeredAlert = require('../models/TriggeredAlert');
const alertConditionsService = require('./alertConditionsService');
const { sendTelegramNotification } = require('../utils/telegramService');

class RealtimeAlertWorker {
  constructor() {
    this.isRunning = false;
    this.stats = {
      priceUpdatesReceived: 0,
      conditionsChecked: 0,
      alertsTriggered: 0,
      errors: 0,
      startTime: Date.now(),
      lastUpdate: null,
      symbolsProcessed: new Set()
    };
    this.alertCache = new Map(); // Cache alerts by symbol
    this.processingQueue = [];
    this.isProcessing = false;
    this.conditionCache = new Map(); // Cache condition results
  }

  /**
   * Start the real-time alert worker
   */
  async start() {
    console.log('🚀 Starting Real-time Alert Worker...');
    
    try {
      // Load all active alerts into cache
      await this.loadAlertsIntoCache();
      
      // Subscribe to price updates from Binance WebSocket
      await this.subscribeToPriceUpdates();
      
      // Subscribe to alert updates (add/remove)
      await this.subscribeToAlertUpdates();
      
      // Subscribe to condition updates
      await this.subscribeToConditionUpdates();
      
      this.isRunning = true;
      
      // Start stats reporting every 60 seconds
      setInterval(() => {
        this.printStats();
      }, 60000);
      
      console.log('✅ Real-time Alert Worker started successfully');
    } catch (error) {
      console.error('❌ Failed to start Real-time Alert Worker:', error.message);
      throw error;
    }
  }

  /**
   * Load all active alerts into cache
   */
  async loadAlertsIntoCache() {
    try {
      console.log('📥 Loading alerts into cache...');
      
      const alerts = await Alert.find({ 
        isActive: true, 
        userExplicitlyCreated: true 
      });
      
      console.log(`Found ${alerts.length} active alerts`);
      
      // Group alerts by symbol for faster lookup
      for (const alert of alerts) {
        if (!this.alertCache.has(alert.symbol)) {
          this.alertCache.set(alert.symbol, []);
        }
        this.alertCache.get(alert.symbol).push(alert);
      }
      
      console.log(`✅ Loaded alerts for ${this.alertCache.size} symbols`);
      
      // Sync to Redis
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
        console.log(`✅ Subscribed to prices channel`);
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
   * Subscribe to alert updates (add/remove)
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
   * Subscribe to condition updates
   */
  async subscribeToConditionUpdates() {
    try {
      await redisSubscriber.subscribe('conditions:updates', (err, count) => {
        if (err) {
          console.error('❌ Error subscribing to conditions:updates:', err.message);
          return;
        }
        console.log(`✅ Subscribed to conditions:updates channel`);
      });

      redisSubscriber.on('message', async (channel, message) => {
        if (channel === 'conditions:updates') {
          await this.handleConditionUpdate(message);
        }
      });
      
    } catch (error) {
      console.error('❌ Error subscribing to condition updates:', error.message);
    }
  }

  /**
   * Handle price update from Binance WebSocket
   */
  async handlePriceUpdate(message) {
    try {
      this.stats.priceUpdatesReceived++;
      
      const priceData = JSON.parse(message);
      const { symbol } = priceData;
      
      // Check if we have alerts for this symbol
      const alerts = this.alertCache.get(symbol);
      
      if (!alerts || alerts.length === 0) {
        return; // No alerts for this symbol
      }
      
      console.log(`📊 Processing price update for ${symbol} with ${alerts.length} alerts`);
      
      // Add to processing queue for batch processing
      this.processingQueue.push({
        symbol,
        priceData,
        alerts
      });
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
      
      this.stats.symbolsProcessed.add(symbol);
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
      const batch = this.processingQueue.splice(0, 5); // Process 5 at a time for better performance
      
      await Promise.allSettled(
        batch.map(item => this.checkAlertsForSymbol(item.symbol, item.priceData, item.alerts))
      );
    }
    
    this.isProcessing = false;
  }

  /**
   * Check all alerts for a symbol with enhanced conditions
   */
  async checkAlertsForSymbol(symbol, priceData, alerts) {
    try {
      console.log(`🔍 Checking ${alerts.length} alerts for ${symbol}`);
      
      for (const alert of alerts) {
        this.stats.conditionsChecked++;
        
        // Refresh alert from DB to get latest state
        const freshAlert = await Alert.findById(alert._id);
        
        if (!freshAlert || !freshAlert.isActive) {
          // Alert was deleted or deactivated, remove from cache
          this.removeAlertFromCache(symbol, alert._id);
          continue;
        }
        
        // Check all three conditions simultaneously
        const conditionResults = await alertConditionsService.checkAllConditions(freshAlert, priceData);
        
        // Cache condition results
        await conditionOps.cacheConditionResult(symbol, conditionResults);
        
        // Publish condition update
        await conditionOps.publishConditionUpdate(symbol, conditionResults);
        
        // Only trigger if ALL conditions are met
        if (conditionResults.allConditionsMet) {
          await this.triggerAlert(freshAlert, priceData, conditionResults);
        } else {
          console.log(`⏳ Conditions not met for ${symbol} alert ${freshAlert._id}`);
        }
      }
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error checking alerts for ${symbol}:`, error.message);
    }
  }

  /**
   * Trigger an alert with enhanced data
   */
  async triggerAlert(alert, priceData, conditionResults) {
    try {
      console.log(`\n🚨 ===== ALERT TRIGGERED =====`);
      console.log(`Symbol: ${alert.symbol}`);
      console.log(`Current Price: ${priceData.price}`);
      console.log(`Target: ${alert.targetValue}`);
      console.log(`Direction: ${alert.direction}`);
      console.log(`Conditions Met:`, conditionResults.conditions);
      console.log(`==============================\n`);
      
      this.stats.alertsTriggered++;
      
      // Create comprehensive triggered alert record
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
        volume: priceData.volume || 0,
        high24h: priceData.high24h || priceData.price,
        low24h: priceData.low24h || priceData.price,
        open24h: priceData.open24h || priceData.price,
        comment: alert.comment || '',
        conditionResults: conditionResults.conditions,
        notificationSent: false
      });
      
      // Publish to Redis alerts channel for real-time frontend updates
      await alertOps.publishTriggeredAlert({
        alertId: alert._id.toString(),
        symbol: alert.symbol,
        price: priceData.price,
        targetValue: alert.targetValue,
        direction: alert.direction,
        triggeredAlert: triggeredAlert.toObject(),
        conditionResults: conditionResults.conditions,
        timestamp: Date.now()
      });
      
      // Update alert's lastTriggered timestamp
      alert.lastTriggered = new Date();
      
      // Increment alert count if enabled
      if (alert.alertCountEnabled) {
        await alertConditionsService.incrementAlertCount(alert.symbol, alert.alertCountTimeframe);
      }
      
      await alert.save();
      
      // Send notifications
      await this.sendNotifications(alert, triggeredAlert, priceData, conditionResults);
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Error triggering alert:', error.message);
    }
  }

  /**
   * Send comprehensive notifications
   */
  async sendNotifications(alert, triggeredAlert, priceData, conditionResults) {
    try {
      // Send Telegram notification
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const message = this.formatEnhancedTelegramMessage(alert, priceData, conditionResults);
        
        try {
          await sendTelegramNotification(message);
          alert.markNotificationSent('telegram');
          
          // Update triggered alert
          triggeredAlert.notificationSent = true;
          await triggeredAlert.save();
          
          console.log(`📱 Telegram notification sent for ${alert.symbol}`);
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
   * Format enhanced Telegram notification message
   */
  formatEnhancedTelegramMessage(alert, priceData, conditionResults) {
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
    
    // Add condition details
    message += `\n*Conditions Met:*\n`;
    if (conditionResults.conditions.minDailyCandle?.passed) {
      message += `✅ Min Daily Candle: ${conditionResults.conditions.minDailyCandle.details.candleSize.toFixed(2)}\n`;
    }
    if (conditionResults.conditions.changePercent?.passed) {
      message += `✅ Change %: ${conditionResults.conditions.changePercent.details.percentageChange.toFixed(2)}%\n`;
    }
    if (conditionResults.conditions.alertCount?.passed) {
      message += `✅ Alert Count: ${conditionResults.conditions.alertCount.details.currentCount}/${conditionResults.conditions.alertCount.details.maxAlerts}\n`;
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
   * Handle condition updates
   */
  async handleConditionUpdate(message) {
    try {
      const update = JSON.parse(message);
      const { symbol, result } = update;
      
      // Cache the condition result
      this.conditionCache.set(symbol, result);
      
      console.log(`📊 Condition update cached for ${symbol}`);
    } catch (error) {
      console.error('❌ Error handling condition update:', error.message);
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
   * Print comprehensive statistics
   */
  printStats() {
    const uptime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(2);
    const updatesPerMin = (this.stats.priceUpdatesReceived / (uptime || 1)).toFixed(2);
    
    console.log('\n📊 === Real-time Alert Worker Stats ===');
    console.log(`✅ Running: ${this.isRunning}`);
    console.log(`⏱️  Uptime: ${uptime} minutes`);
    console.log(`📨 Price updates: ${this.stats.priceUpdatesReceived}`);
    console.log(`🔍 Conditions checked: ${this.stats.conditionsChecked}`);
    console.log(`🚨 Alerts triggered: ${this.stats.alertsTriggered}`);
    console.log(`⚡ Updates/min: ${updatesPerMin}`);
    console.log(`💾 Cached symbols: ${this.alertCache.size}`);
    console.log(`📊 Symbols processed: ${this.stats.symbolsProcessed.size}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`🕐 Last update: ${this.stats.lastUpdate || 'N/A'}`);
    console.log('=====================================\n');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      cachedSymbols: Array.from(this.alertCache.keys()),
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    console.log('🛑 Shutting down Real-time Alert Worker...');
    this.isRunning = false;
    
    try {
      await redisSubscriber.unsubscribe();
      this.printStats();
      console.log('✅ Real-time Alert Worker stopped');
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }
}

// Create singleton instance
const realtimeAlertWorker = new RealtimeAlertWorker();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await realtimeAlertWorker.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await realtimeAlertWorker.shutdown();
  process.exit(0);
});

module.exports = realtimeAlertWorker;
