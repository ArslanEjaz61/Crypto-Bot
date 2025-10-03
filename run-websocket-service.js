#!/usr/bin/env node

/**
 * Binance WebSocket Service Runner
 * 
 * This script runs the Binance WebSocket service that:
 * - Connects to Binance WebSocket API
 * - Streams real-time price data
 * - Saves prices to Redis
 * - Publishes updates for the worker
 * 
 * Usage: node run-websocket-service.js
 */

require('dotenv').config();
const binanceWebSocketService = require('./server/services/binanceWebSocketService');
const { redisClient } = require('./server/config/redis');

console.log('🚀 Starting Binance WebSocket Service...\n');

// Wait for Redis to be ready
redisClient.on('ready', () => {
  console.log('✅ Redis connection ready\n');
  
  // Start the Binance WebSocket service
  binanceWebSocketService.start();
  
  console.log('\n✅ Binance WebSocket Service is running');
  console.log('📡 Streaming real-time prices from Binance');
  console.log('💾 Saving prices to Redis');
  console.log('📢 Publishing updates to workers\n');
  console.log('Press Ctrl+C to stop\n');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  console.error('❌ Make sure Redis is running on localhost:6379');
  console.error('   Or set REDIS_HOST and REDIS_PORT environment variables\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  binanceWebSocketService.shutdown();
  redisClient.quit();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  binanceWebSocketService.shutdown();
  redisClient.quit();
  process.exit(0);
});

