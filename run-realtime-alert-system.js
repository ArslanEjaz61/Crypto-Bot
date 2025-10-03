#!/usr/bin/env node

/**
 * Real-time Alert System Runner
 * 
 * This script starts the complete real-time alert system:
 * 1. Binance WebSocket Service (price updates)
 * 2. Real-time Alert Worker (condition checking)
 * 3. Redis caching system
 * 4. Instant pairs service
 * 
 * Usage: node run-realtime-alert-system.js
 */

const path = require('path');
require('dotenv').config();

// Import services
const binanceWebSocketService = require('./server/services/binanceWebSocketService');
const realtimeAlertWorker = require('./server/services/realtimeAlertWorker');
const instantPairsService = require('./server/services/instantPairsService');
const { redisClient, syncAlertsFromDB } = require('./server/config/redis');

class RealtimeAlertSystem {
  constructor() {
    this.services = [];
    this.isRunning = false;
    this.startTime = Date.now();
  }

  /**
   * Start all services
   */
  async start() {
    console.log('🚀 Starting Real-time Alert System...');
    console.log('=====================================');
    
    try {
      // 1. Initialize Redis connection
      console.log('📡 Initializing Redis connection...');
      await this.initializeRedis();
      
      // 2. Start Binance WebSocket Service
      console.log('📡 Starting Binance WebSocket Service...');
      binanceWebSocketService.start();
      this.services.push({ name: 'Binance WebSocket', service: binanceWebSocketService });
      
      // 3. Initialize Instant Pairs Service
      console.log('⚡ Initializing Instant Pairs Service...');
      await instantPairsService.initialize();
      this.services.push({ name: 'Instant Pairs', service: instantPairsService });
      
      // 4. Sync alerts from database to Redis
      console.log('🔄 Syncing alerts from database to Redis...');
      const syncedCount = await syncAlertsFromDB();
      console.log(`✅ Synced ${syncedCount} alerts to Redis`);
      
      // 5. Start Real-time Alert Worker
      console.log('🔍 Starting Real-time Alert Worker...');
      await realtimeAlertWorker.start();
      this.services.push({ name: 'Real-time Alert Worker', service: realtimeAlertWorker });
      
      this.isRunning = true;
      
      console.log('=====================================');
      console.log('✅ Real-time Alert System started successfully!');
      console.log('=====================================');
      console.log('📊 Services running:');
      this.services.forEach(({ name }) => {
        console.log(`  ✅ ${name}`);
      });
      console.log('=====================================');
      console.log('🔗 API Endpoints:');
      console.log('  • GET  /api/pairs/instant - Instant pairs loading');
      console.log('  • GET  /api/pairs/instant/top - Top volume pairs');
      console.log('  • POST /api/pairs/instant/search - Search pairs');
      console.log('  • GET  /api/triggered-alerts - Triggered alerts history');
      console.log('  • GET  /api/alerts - Create/manage alerts');
      console.log('=====================================');
      console.log('🌐 WebSocket Events:');
      console.log('  • price-update - Real-time price updates');
      console.log('  • alert-triggered - Alert trigger notifications');
      console.log('  • pairs-update - Pairs data updates');
      console.log('  • conditions-update - Condition check results');
      console.log('=====================================');
      
      // Start status reporting
      this.startStatusReporting();
      
    } catch (error) {
      console.error('❌ Failed to start Real-time Alert System:', error.message);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      await redisClient.ping();
      console.log('✅ Redis connection established');
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Start status reporting
   */
  startStatusReporting() {
    setInterval(() => {
      this.printSystemStatus();
    }, 60000); // Every minute
  }

  /**
   * Print system status
   */
  printSystemStatus() {
    const uptime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n📊 === Real-time Alert System Status ===');
    console.log(`⏱️  System Uptime: ${uptime} minutes`);
    console.log(`🔄 Services Running: ${this.services.length}`);
    console.log(`📡 Redis Connected: ${redisClient.isReady}`);
    console.log(`🕐 Current Time: ${new Date().toLocaleString()}`);
    console.log('=====================================\n');
  }

  /**
   * Gracefully shutdown all services
   */
  async shutdown() {
    console.log('\n🛑 Shutting down Real-time Alert System...');
    
    try {
      // Shutdown services in reverse order
      for (let i = this.services.length - 1; i >= 0; i--) {
        const { name, service } = this.services[i];
        console.log(`🛑 Shutting down ${name}...`);
        
        if (service.shutdown) {
          await service.shutdown();
        } else if (service.stop) {
          await service.stop();
        }
        
        console.log(`✅ ${name} stopped`);
      }
      
      // Close Redis connection
      if (redisClient.isReady) {
        await redisClient.quit();
        console.log('✅ Redis connection closed');
      }
      
      this.isRunning = false;
      console.log('✅ Real-time Alert System stopped');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: Date.now() - this.startTime,
      services: this.services.map(({ name, service }) => ({
        name,
        status: service.isRunning !== undefined ? service.isRunning : 'unknown'
      })),
      redis: {
        connected: redisClient.isReady,
        status: redisClient.status
      }
    };
  }
}

// Create and start the system
const system = new RealtimeAlertSystem();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await system.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await system.shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await system.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await system.shutdown();
  process.exit(1);
});

// Start the system
system.start().catch(async (error) => {
  console.error('❌ Failed to start system:', error);
  await system.shutdown();
  process.exit(1);
});

module.exports = system;
