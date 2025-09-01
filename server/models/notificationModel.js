const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Core notification data
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Notification status
  type: {
    type: String,
    enum: ['PRICE_ALERT', 'PERCENTAGE_CHANGE', 'RSI_ALERT', 'EMA_ALERT', 'CANDLE_ALERT', 'VOLUME_ALERT'],
    default: 'PRICE_ALERT'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Alert trigger data
  triggerData: {
    currentPrice: Number,
    targetPrice: Number,
    priceChange: Number,
    priceChangePercent: Number,
    rsi: Number,
    ema: {
      fast: Number,
      slow: Number
    },
    volume: Number,
    timestamp: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  }
});

// Index for efficient querying
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ symbol: 1, createdAt: -1 });

// Mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create notification from alert trigger
notificationSchema.statics.createFromAlert = function(alert, triggerData) {
  const notification = new this({
    alertId: alert._id,
    symbol: alert.symbol,
    title: `${alert.symbol} Alert Triggered`,
    message: this.generateMessage(alert, triggerData),
    type: this.determineType(alert),
    priority: this.determinePriority(alert, triggerData),
    triggerData: {
      currentPrice: triggerData.currentPrice,
      targetPrice: alert.targetValue,
      priceChange: triggerData.priceChange || 0,
      priceChangePercent: triggerData.priceChangePercent || 0,
      rsi: triggerData.rsi?.current || 0,
      ema: {
        fast: triggerData.emaData?.fast || 0,
        slow: triggerData.emaData?.slow || 0
      },
      volume: triggerData.currentVolume || 0,
      timestamp: new Date()
    }
  });
  
  return notification.save();
};

// Generate notification message
notificationSchema.statics.generateMessage = function(alert, triggerData) {
  const currentPrice = triggerData.currentPrice?.toFixed(4) || 'N/A';
  const targetPrice = alert.targetValue?.toFixed(4) || 'N/A';
  
  let message = `${alert.symbol} reached ${currentPrice}`;
  
  if (alert.targetType === 'price') {
    message += ` (target: ${targetPrice})`;
  } else if (alert.targetType === 'percentage' && alert.changePercentValue) {
    const changePercent = triggerData.priceChangePercent?.toFixed(2) || '0';
    message += ` with ${changePercent}% change in ${alert.changePercentTimeframe}`;
  }
  
  // Add RSI info if enabled
  if (alert.rsiEnabled && triggerData.rsi?.current) {
    message += ` | RSI: ${triggerData.rsi.current.toFixed(1)}`;
  }
  
  // Add EMA info if enabled
  if (alert.emaEnabled && triggerData.emaData) {
    message += ` | EMA: ${triggerData.emaData.fast?.toFixed(4)} / ${triggerData.emaData.slow?.toFixed(4)}`;
  }
  
  return message;
};

// Determine notification type
notificationSchema.statics.determineType = function(alert) {
  if (alert.changePercentValue > 0) return 'PERCENTAGE_CHANGE';
  if (alert.rsiEnabled) return 'RSI_ALERT';
  if (alert.emaEnabled) return 'EMA_ALERT';
  if (alert.candleCondition !== 'NONE') return 'CANDLE_ALERT';
  return 'PRICE_ALERT';
};

// Determine priority based on alert conditions
notificationSchema.statics.determinePriority = function(alert, triggerData) {
  // High priority for large price changes
  if (triggerData.priceChangePercent && Math.abs(triggerData.priceChangePercent) > 10) {
    return 'HIGH';
  }
  
  // Medium priority for RSI extremes
  if (triggerData.rsi?.current) {
    if (triggerData.rsi.current >= 80 || triggerData.rsi.current <= 20) {
      return 'HIGH';
    }
    if (triggerData.rsi.current >= 70 || triggerData.rsi.current <= 30) {
      return 'MEDIUM';
    }
  }
  
  // Default medium priority
  return 'MEDIUM';
};

module.exports = mongoose.model('Notification', notificationSchema);
