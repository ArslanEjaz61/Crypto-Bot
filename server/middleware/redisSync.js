/**
 * Redis Sync Middleware
 * 
 * Automatically syncs alerts to Redis when they're created, updated, or deleted
 * This ensures the real-time worker always has the latest alerts
 */

const { alertOps } = require('../config/redis');

/**
 * Sync alert to Redis after creation
 */
const syncAlertToRedis = async (req, res, next) => {
  // Store original json function
  const originalJson = res.json.bind(res);
  
  // Override json function
  res.json = async function(data) {
    try {
      // Check if this is a successful alert creation/update
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const alert = data.alert || data;
        
        if (alert && alert._id && alert.symbol) {
          console.log(`🔄 Syncing alert ${alert._id} to Redis...`);
          
          // Add to Redis
          await alertOps.addAlert(alert.symbol, {
            _id: alert._id,
            symbol: alert.symbol,
            direction: alert.direction,
            targetType: alert.targetType,
            targetValue: alert.targetValue,
            basePrice: alert.basePrice || alert.currentPrice,
            currentPrice: alert.currentPrice,
            isActive: alert.isActive,
            userExplicitlyCreated: alert.userExplicitlyCreated,
            candleCondition: alert.candleCondition,
            candleTimeframes: alert.candleTimeframes,
            rsiEnabled: alert.rsiEnabled,
            emaEnabled: alert.emaEnabled,
            alertCountEnabled: alert.alertCountEnabled,
            alertCountTimeframe: alert.alertCountTimeframe,
            maxAlertsPerTimeframe: alert.maxAlertsPerTimeframe,
          });
          
          console.log(`✅ Alert synced to Redis`);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing alert to Redis:', error.message);
      // Don't fail the request if Redis sync fails
    }
    
    // Call original json function
    return originalJson(data);
  };
  
  next();
};

/**
 * Remove alert from Redis after deletion
 */
const removeAlertFromRedis = async (req, res, next) => {
  // Store original json function
  const originalJson = res.json.bind(res);
  
  // Override json function
  res.json = async function(data) {
    try {
      // Check if this is a successful deletion
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const alertId = req.params.id;
        const alert = req.deletedAlert; // Should be set by controller
        
        if (alertId && alert && alert.symbol) {
          console.log(`🔄 Removing alert ${alertId} from Redis...`);
          
          // Remove from Redis
          await alertOps.removeAlert(alert.symbol, alertId);
          
          console.log(`✅ Alert removed from Redis`);
        }
      }
    } catch (error) {
      console.error('❌ Error removing alert from Redis:', error.message);
      // Don't fail the request if Redis sync fails
    }
    
    // Call original json function
    return originalJson(data);
  };
  
  next();
};

/**
 * Bulk sync all active alerts to Redis
 * Useful for initialization or after Redis restart
 */
const bulkSyncAlertsToRedis = async () => {
  try {
    console.log('🔄 Bulk syncing all active alerts to Redis...');
    
    const Alert = require('../models/alertModel');
    const alerts = await Alert.find({ 
      isActive: true, 
      userExplicitlyCreated: true 
    });
    
    let syncCount = 0;
    for (const alert of alerts) {
      try {
        await alertOps.addAlert(alert.symbol, {
          _id: alert._id,
          symbol: alert.symbol,
          direction: alert.direction,
          targetType: alert.targetType,
          targetValue: alert.targetValue,
          basePrice: alert.basePrice || alert.currentPrice,
          currentPrice: alert.currentPrice,
          isActive: alert.isActive,
          userExplicitlyCreated: alert.userExplicitlyCreated,
          candleCondition: alert.candleCondition,
          candleTimeframes: alert.candleTimeframes,
          rsiEnabled: alert.rsiEnabled,
          emaEnabled: alert.emaEnabled,
          alertCountEnabled: alert.alertCountEnabled,
          alertCountTimeframe: alert.alertCountTimeframe,
          maxAlertsPerTimeframe: alert.maxAlertsPerTimeframe,
        });
        syncCount++;
      } catch (error) {
        console.error(`❌ Error syncing alert ${alert._id}:`, error.message);
      }
    }
    
    console.log(`✅ Bulk synced ${syncCount}/${alerts.length} alerts to Redis`);
    return syncCount;
  } catch (error) {
    console.error('❌ Error in bulk sync:', error.message);
    return 0;
  }
};

module.exports = {
  syncAlertToRedis,
  removeAlertFromRedis,
  bulkSyncAlertsToRedis
};

