const mongoose = require('mongoose');

const alertSchema = mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['>', '<', '<>'], // Up, Down, Either way
      required: true,
    },
    targetType: {
      type: String,
      enum: ['price', 'percentage'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    trackingMode: {
      type: String,
      enum: ['current', 'interval'],
      default: 'current',
    },
    intervalMinutes: {
      type: Number,
      default: 0,
    },
    volumeChangeRequired: {
      type: Number,
      default: 0, // 0 means no volume change tracking
    },
    alertTime: {
      type: String, // Store as HH:MM format
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    comment: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add a method to check if the alert should be triggered
alertSchema.methods.shouldTrigger = function(currentPrice, currentVolume, previousPrice, previousVolume) {
  // If already triggered and has not been at least 6 hours, don't trigger again
  // This prevents multiple triggers for the same price movement
  if (this.lastTriggered) {
    const now = new Date();
    const lastTriggered = new Date(this.lastTriggered);
    const hoursSinceLastTrigger = (now - lastTriggered) / (1000 * 60 * 60);
    
    if (hoursSinceLastTrigger < 6) {
      return false;
    }
  }
  
  // Price condition check
  let priceConditionMet = false;
  
  if (this.targetType === 'price') {
    // Direct price comparison
    if (this.direction === '>' && currentPrice >= this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<' && currentPrice <= this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<>' && (currentPrice >= this.targetValue || currentPrice <= this.targetValue)) {
      priceConditionMet = true;
    }
  } else if (this.targetType === 'percentage') {
    // Percentage change calculation
    let basePrice = this.trackingMode === 'current' ? this.currentPrice : previousPrice;
    const percentageChange = ((currentPrice - basePrice) / basePrice) * 100;
    
    if (this.direction === '>' && percentageChange >= this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<' && percentageChange <= -this.targetValue) {
      priceConditionMet = true;
    } else if (this.direction === '<>' && (percentageChange >= this.targetValue || percentageChange <= -this.targetValue)) {
      priceConditionMet = true;
    }
  }
  
  // Volume condition check (if required)
  if (this.volumeChangeRequired > 0 && previousVolume) {
    const volumeChangePercent = ((currentVolume - previousVolume) / previousVolume) * 100;
    return priceConditionMet && volumeChangePercent >= this.volumeChangeRequired;
  }
  
  return priceConditionMet;
};

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
