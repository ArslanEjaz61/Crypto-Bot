#!/usr/bin/env node

/**
 * Complete Real-time Alert System Runner
 * 
 * This script runs ALL components of the real-time alert system:
 * 1. Express API Server with Socket.io
 * 2. Binance WebSocket Service (price streaming)
 * 3. Alert Worker Service (alert checking)
 * 
 * This is the recommended way to run the complete system.
 * 
 * Usage: node run-realtime-system.js
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./server/config/db');
const { redisClient } = require('./server/config/redis');
const binanceWebSocketService = require('./server/services/binanceWebSocketService');
const alertWorkerService = require('./server/services/alertWorkerService');
const RealtimeServer = require('./server/services/realtimeServer');
const { scheduleAutomaticCleanup } = require('./server/utils/alertCleanup');

console.log('🚀 Starting Complete Real-time Alert System...\n');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Real-time Server (Socket.io)
const realtimeServer = new RealtimeServer(server);
realtimeServer.initialize();

// Make io accessible to routes
app.set('io', realtimeServer.getIO());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      express: true,
      socketio: true,
      redis: redisClient.status === 'ready',
      websocket: binanceWebSocketService.isConnected,
      worker: alertWorkerService.isRunning
    }
  });
});

// Register routes
try {
  app.use('/api/auth', require('./server/routes/authRoutes'));
  app.use('/api/crypto', require('./server/routes/cryptoRoutes'));
  app.use('/api/alerts', require('./server/routes/alertRoutes'));
  app.use('/api/indicators', require('./server/routes/indicatorRoutes'));
  app.use('/api/telegram', require('./server/routes/telegramRoutes'));
  app.use('/api/notifications', require('./server/routes/notificationRoutes'));
  app.use('/api/triggered-alerts', require('./server/routes/triggeredAlerts'));
  app.use('/api/cleanup', require('./server/routes/cleanupRoutes'));
  console.log('✅ API routes registered');
} catch (error) {
  console.error('❌ Error registering routes:', error.message);
}

// Serve static files from React build
const buildPath = path.join(__dirname, 'client/build');
const fs = require('fs');

if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  
  console.log('✅ Serving React build');
}

// Error handling
const { notFound, errorHandler } = require('./server/utils/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;

async function startSystem() {
  try {
    // 1. Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected\n');

    // 2. Check Redis connection (already connected by this point)
    console.log('📦 Verifying Redis connection...');
    if (redisClient.status === 'ready') {
      console.log('✅ Redis already connected\n');
    } else {
      console.log('⏳ Waiting for Redis...');
      await new Promise((resolve, reject) => {
        if (redisClient.status === 'ready') {
          resolve();
        } else {
          redisClient.on('ready', resolve);
          redisClient.on('error', reject);
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
        }
      });
      console.log('✅ Redis connected\n');
    }

    // 3. Start Express server with Socket.io
    console.log('📦 Starting Express server...');
    await new Promise((resolve) => {
      server.listen(PORT, () => {
        console.log(`✅ Express server running on port ${PORT}\n`);
        resolve();
      });
    });

    // 4. Start Binance WebSocket Service
    console.log('📦 Starting Binance WebSocket Service...');
    binanceWebSocketService.start();
    console.log('✅ Binance WebSocket Service started\n');

    // 5. Start Alert Worker Service
    console.log('📦 Starting Alert Worker Service...');
    await alertWorkerService.start();
    console.log('✅ Alert Worker Service started\n');

    // 6. Schedule Automatic Cleanup
    console.log('📦 Starting Automatic Cleanup Service...');
    scheduleAutomaticCleanup();
    console.log('✅ Automatic Cleanup Service started\n');

    // All services started successfully
    console.log('\n' + '='.repeat(60));
    console.log('🎉 REAL-TIME ALERT SYSTEM RUNNING SUCCESSFULLY! 🎉');
    console.log('='.repeat(60));
    console.log('\n📊 System Status:');
    console.log(`   ✅ Express API:        http://localhost:${PORT}`);
    console.log(`   ✅ Socket.io Server:   ws://localhost:${PORT}`);
    console.log(`   ✅ Binance WebSocket:  Streaming live prices`);
    console.log(`   ✅ Alert Worker:       Monitoring alerts`);
    console.log(`   ✅ MongoDB:            Connected`);
    console.log(`   ✅ Redis:              Connected`);
    console.log('\n📡 Real-time Features:');
    console.log('   🚀 Live price updates (1-2 second latency)');
    console.log('   ⚡ Instant alert triggers');
    console.log('   📢 Real-time notifications to frontend');
    console.log('\n' + '='.repeat(60));
    console.log('\nPress Ctrl+C to stop all services\n');

  } catch (error) {
    console.error('\n❌ Failed to start system:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure MongoDB is running');
    console.error('   2. Make sure Redis is running (redis-server)');
    console.error('   3. Check your .env file configuration');
    process.exit(1);
  }
}

// Start the complete system
startSystem();

// Handle graceful shutdown
async function shutdown() {
  console.log('\n\n🛑 Shutting down Real-time Alert System...');
  
  try {
    // Stop services in reverse order
    console.log('⏹️  Stopping Alert Worker...');
    await alertWorkerService.shutdown();
    
    console.log('⏹️  Stopping Binance WebSocket...');
    binanceWebSocketService.shutdown();
    
    console.log('⏹️  Stopping Real-time Server...');
    await realtimeServer.shutdown();
    
    console.log('⏹️  Closing Redis connection...');
    redisClient.quit();
    
    console.log('⏹️  Closing Express server...');
    server.close();
    
    console.log('✅ All services stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

