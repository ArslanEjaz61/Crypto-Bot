/**
 * Alert Cleanup Utilities
 * 
 * Automatically cleans up old triggered alerts and manages alert lifecycle
 */

const TriggeredAlert = require('../models/TriggeredAlert');
const Alert = require('../models/alertModel');
const { alertOps } = require('../config/redis');

/**
 * Clean up triggered alerts older than 24 hours
 */
const cleanupOldTriggeredAlerts = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log('🧹 Starting automatic cleanup of old triggered alerts...');
    console.log(`🕐 Removing alerts older than: ${twentyFourHoursAgo.toISOString()}`);
    
    // Delete from MongoDB
    const result = await TriggeredAlert.deleteMany({
      createdAt: { $lt: twentyFourHoursAgo }
    });
    
    console.log(`✅ Cleaned up ${result.deletedCount} old triggered alerts from database`);
    
    // Emit cleanup event to frontend (if Socket.io is available)
    try {
      const io = global.io || require('../services/realtimeServer').getIO?.();
      if (io) {
        io.emit('triggered-alerts-cleanup', {
          deletedCount: result.deletedCount,
          cleanupTime: new Date().toISOString(),
          message: 'Old alerts automatically cleaned up'
        });
        console.log('📡 Notified frontend clients about cleanup');
      }
    } catch (error) {
      // Silent fail - cleanup still works without frontend notification
    }
    
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up old triggered alerts:', error.message);
    return 0;
  }
};

/**
 * Disable all existing alerts (makes them inactive)
 * Called when user creates new alert to ensure clean slate
 */
const disableAllExistingAlerts = async (userId = null) => {
  try {
    console.log('🔄 Disabling all existing alerts for clean slate...');
    
    // Build query - if userId provided, only disable that user's alerts
    const query = { isActive: true };
    if (userId) {
      query.userId = userId;
    }
    
    // Update all active alerts to inactive
    const result = await Alert.updateMany(
      query,
      { 
        $set: { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'Auto-disabled for clean slate'
        } 
      }
    );
    
    console.log(`✅ Disabled ${result.modifiedCount} existing alerts`);
    
    // Clear from Redis cache
    try {
      const symbols = await alertOps.getAllAlertSymbols();
      for (const symbol of symbols) {
        const alerts = await alertOps.getAlertsForSymbol(symbol);
        for (const alert of alerts) {
          await alertOps.removeAlert(symbol, alert._id || alert.id);
        }
      }
      console.log('✅ Cleared disabled alerts from Redis cache');
    } catch (redisError) {
      console.error('⚠️ Error clearing Redis cache:', redisError.message);
      // Continue - Redis clear failure shouldn't stop the process
    }
    
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error disabling existing alerts:', error.message);
    return 0;
  }
};

/**
 * Clean up all triggered alerts immediately (manual cleanup)
 */
const cleanupAllTriggeredAlerts = async () => {
  try {
    console.log('🧹 Manual cleanup: Removing ALL triggered alerts...');
    
    const result = await TriggeredAlert.deleteMany({});
    
    console.log(`✅ Manually cleaned up ${result.deletedCount} triggered alerts`);
    
    // Notify frontend
    try {
      const io = global.io || require('../services/realtimeServer').getIO?.();
      if (io) {
        io.emit('triggered-alerts-cleanup', {
          deletedCount: result.deletedCount,
          cleanupTime: new Date().toISOString(),
          message: 'All triggered alerts manually cleared',
          isManual: true
        });
      }
    } catch (error) {
      // Silent fail
    }
    
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error in manual cleanup:', error.message);
    return 0;
  }
};

/**
 * Get cleanup statistics
 */
const getCleanupStats = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const [totalTriggered, oldTriggered, totalAlerts, activeAlerts] = await Promise.all([
      TriggeredAlert.countDocuments(),
      TriggeredAlert.countDocuments({ createdAt: { $lt: twentyFourHoursAgo } }),
      Alert.countDocuments(),
      Alert.countDocuments({ isActive: true })
    ]);
    
    return {
      triggeredAlerts: {
        total: totalTriggered,
        old: oldTriggered,
        recent: totalTriggered - oldTriggered
      },
      alerts: {
        total: totalAlerts,
        active: activeAlerts,
        inactive: totalAlerts - activeAlerts
      },
      lastCleanup: now.toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting cleanup stats:', error.message);
    return null;
  }
};

/**
 * Schedule automatic cleanup (runs every hour)
 */
const scheduleAutomaticCleanup = () => {
  console.log('⏰ Scheduling automatic cleanup every hour...');
  
  // Run cleanup immediately on startup
  setTimeout(cleanupOldTriggeredAlerts, 5000); // Wait 5 seconds after startup
  
  // Then run every hour
  setInterval(async () => {
    console.log('\n⏰ === AUTOMATIC CLEANUP STARTED ===');
    const cleaned = await cleanupOldTriggeredAlerts();
    console.log(`⏰ === CLEANUP COMPLETED: ${cleaned} alerts removed ===\n`);
  }, 60 * 60 * 1000); // Every hour
  
  console.log('✅ Automatic cleanup scheduled');
};

module.exports = {
  cleanupOldTriggeredAlerts,
  disableAllExistingAlerts,
  cleanupAllTriggeredAlerts,
  getCleanupStats,
  scheduleAutomaticCleanup
};
