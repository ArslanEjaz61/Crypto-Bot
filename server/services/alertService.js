const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');
const { sendAlertEmail } = require('../utils/emailService');

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

        // Check if alert conditions are met
        const shouldTrigger = alert.shouldTrigger(crypto, previousData);
        
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
