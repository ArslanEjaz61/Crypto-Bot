#!/usr/bin/env node

/**
 * Enable Continuous Monitoring for Existing Alerts
 * 
 * This script automatically enables continuous monitoring for all existing alerts
 * by setting up the alert count system with appropriate timeframes.
 * 
 * Usage: node enable-continuous-monitoring.js
 */

const mongoose = require('mongoose');
const Alert = require('./server/models/alertModel');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-alerts';

async function enableContinuousMonitoring() {
  try {
    console.log('🚀 Starting continuous monitoring enablement...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all active alerts that don't have continuous monitoring enabled
    const alerts = await Alert.find({
      isActive: true,
      userExplicitlyCreated: true,
      $or: [
        { alertCountEnabled: { $ne: true } },
        { alertCountTimeframe: { $exists: false } },
        { maxAlertsPerTimeframe: { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${alerts.length} alerts that need continuous monitoring setup`);
    
    if (alerts.length === 0) {
      console.log('✅ All alerts already have continuous monitoring enabled');
      return;
    }
    
    // Process each alert
    let updatedCount = 0;
    for (const alert of alerts) {
      try {
        console.log(`\n🔄 Processing alert: ${alert.symbol} (ID: ${alert._id})`);
        console.log(`   Current settings:`);
        console.log(`   - Alert count enabled: ${alert.alertCountEnabled}`);
        console.log(`   - Alert count timeframe: ${alert.alertCountTimeframe}`);
        console.log(`   - Max alerts per timeframe: ${alert.maxAlertsPerTimeframe}`);
        
        // Determine the best timeframe based on the alert's candle timeframes
        let recommendedTimeframe = '5MIN'; // Default
        
        if (alert.candleTimeframes && alert.candleTimeframes.length > 0) {
          // Use the shortest timeframe for more responsive monitoring
          const timeframeOrder = ['5MIN', '15MIN', '1HR', '4HR', '12HR', 'D', 'W'];
          const alertTimeframes = alert.candleTimeframes.sort((a, b) => {
            return timeframeOrder.indexOf(a) - timeframeOrder.indexOf(b);
          });
          recommendedTimeframe = alertTimeframes[0];
        }
        
        // Enable continuous monitoring
        alert.enableContinuousMonitoring(recommendedTimeframe, 1);
        
        // Save the alert
        await alert.save();
        
        console.log(`   ✅ Enabled continuous monitoring:`);
        console.log(`   - Timeframe: ${recommendedTimeframe}`);
        console.log(`   - Max alerts per candle: 1`);
        console.log(`   - Alert count enabled: ${alert.alertCountEnabled}`);
        
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing alert ${alert._id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Continuous monitoring setup completed!`);
    console.log(`📊 Updated ${updatedCount} out of ${alerts.length} alerts`);
    
    // Show summary of all alerts
    console.log(`\n📋 SUMMARY OF ALL ALERTS:`);
    const allAlerts = await Alert.find({ isActive: true, userExplicitlyCreated: true });
    
    for (const alert of allAlerts) {
      const status = alert.isContinuousMonitoringEnabled() ? '✅ ENABLED' : '❌ DISABLED';
      console.log(`   ${alert.symbol}: ${status} (${alert.alertCountTimeframe || 'N/A'})`);
    }
    
  } catch (error) {
    console.error('❌ Error enabling continuous monitoring:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  enableContinuousMonitoring()
    .then(() => {
      console.log('🏁 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { enableContinuousMonitoring };
