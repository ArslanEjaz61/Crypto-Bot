const mongoose = require('mongoose');

const triggeredAlertSchema = new mongoose.Schema({
  // Original alert reference
  originalAlertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true
  },
  
  // Symbol information
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  
  // Trigger details
  triggeredAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Condition that was met
  conditionMet: {
    type: String,
    required: true,
    enum: [
      'PRICE_ABOVE',
      'PRICE_BELOW', 
      'PERCENTAGE_CHANGE',
      'RSI_ABOVE',
      'RSI_BELOW',
      'EMA_CROSS_ABOVE',
      'EMA_CROSS_BELOW',
      'VOLUME_SPIKE',
      'CANDLE_PATTERN',
      'COMBINED_CONDITIONS'
    ]
  },
  
  // Condition details
  conditionDetails: {
    targetValue: Number,
    actualValue: Number,
    timeframe: String,
    indicator: String,
    description: String
  },
  
  // Market data at trigger time
  marketData: {
    price: Number,
    volume: Number,
    priceChange24h: Number,
    priceChangePercent24h: Number,
    rsi: Number,
    ema: Number
  },
  
  // Notification details
  notifications: [{
    type: {
      type: String,
      required: true,
      enum: ['EMAIL', 'TELEGRAM', 'SMS', 'WEBHOOK']
    },
    recipient: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['SENT', 'FAILED', 'PENDING'],
      default: 'PENDING'
    },
    messageId: String,
    errorMessage: String
  }],
  
  // Alert configuration at trigger time
  alertConfig: {
    direction: String,
    targetType: String,
    targetValue: Number,
    trackingMode: String,
    intervalMinutes: Number,
    comment: String
  },
  
  // User information
  userEmail: String,
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'ACKNOWLEDGED', 'ARCHIVED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true,
  collection: 'triggeredalerts'
});

// Indexes for efficient querying
triggeredAlertSchema.index({ symbol: 1, triggeredAt: -1 });
triggeredAlertSchema.index({ userEmail: 1, triggeredAt: -1 });
triggeredAlertSchema.index({ originalAlertId: 1 });
triggeredAlertSchema.index({ status: 1, triggeredAt: -1 });

// Virtual for formatted trigger time
triggeredAlertSchema.virtual('formattedTriggerTime').get(function() {
  return this.triggeredAt.toLocaleString();
});

// Method to get notification summary
triggeredAlertSchema.methods.getNotificationSummary = function() {
  const summary = {
    total: this.notifications.length,
    sent: this.notifications.filter(n => n.status === 'SENT').length,
    failed: this.notifications.filter(n => n.status === 'FAILED').length,
    pending: this.notifications.filter(n => n.status === 'PENDING').length,
    types: [...new Set(this.notifications.map(n => n.type))]
  };
  return summary;
};

// Static method to get triggers by symbol
triggeredAlertSchema.statics.getBySymbol = function(symbol, limit = 10) {
  return this.find({ symbol: symbol.toUpperCase() })
    .sort({ triggeredAt: -1 })
    .limit(limit)
    .populate('originalAlertId');
};

// Static method to get recent triggers
triggeredAlertSchema.statics.getRecent = function(userEmail, limit = 50) {
  const query = userEmail ? { userEmail } : {};
  return this.find(query)
    .sort({ triggeredAt: -1 })
    .limit(limit)
    .populate('originalAlertId');
};

// Static method to get triggers by date range
triggeredAlertSchema.statics.getByDateRange = function(startDate, endDate, userEmail) {
  const query = {
    triggeredAt: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (userEmail) {
    query.userEmail = userEmail;
  }
  
  return this.find(query)
    .sort({ triggeredAt: -1 })
    .populate('originalAlertId');
};

module.exports = mongoose.model('TriggeredAlert', triggeredAlertSchema);
