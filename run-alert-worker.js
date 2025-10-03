#!/usr/bin/env node

/**
 * Alert Worker Service Runner
 * 
 * This script runs the Alert Worker service that:
 * - Subscribes to Redis price updates
 * - Checks alerts when prices change
 * - Triggers alerts when conditions are met
 * - Sends notifications
 * 
 * Usage: node run-alert-worker.js
 */

require('dotenv').config();
const path = require('path');
const { connectDB } = require('./server/config/db');
const alertWorkerService = require('./server/services/alertWorkerService');
const { redisClient } = require('./server/config/redis');

console.log('🚀 Starting Alert Worker Service...\n');

// Connect to MongoDB first
connectDB()
  .then(() => {
    console.log('✅ MongoDB connected\n');
    
    // Wait for Redis to be ready
    redisClient.on('ready', async () => {
      console.log('✅ Redis connection ready\n');
      
      try {
        // Start the Alert Worker service
        await alertWorkerService.start();
        
        console.log('\n✅ Alert Worker Service is running');
        console.log('👀 Monitoring Redis for price updates');
        console.log('🔍 Checking alerts when prices change');
        console.log('🚨 Triggering alerts when conditions are met\n');
        console.log('Press Ctrl+C to stop\n');
      } catch (error) {
        console.error('❌ Failed to start Alert Worker:', error.message);
        process.exit(1);
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      console.error('❌ Make sure Redis is running on localhost:6379');
      console.error('   Or set REDIS_HOST and REDIS_PORT environment variables\n');
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  await alertWorkerService.shutdown();
  redisClient.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  await alertWorkerService.shutdown();
  redisClient.quit();
  process.exit(0);
});

