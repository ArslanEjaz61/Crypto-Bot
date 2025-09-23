/**
 * Enhanced startup script with auto-sync service
 * This script starts your server with automatic Binance pair synchronization
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { setupCronJobs } = require('./server/utils/cronJobs');
require('dotenv').config();

// Import routes
const cryptoRoutes = require('./server/routes/cryptoRoutes');
const alertRoutes = require('./server/routes/alertRoutes');
const userRoutes = require('./server/routes/userRoutes');
const notificationRoutes = require('./server/routes/notificationRoutes');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/crypto', cryptoRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      autosync: 'running'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';

async function startServer() {
  try {
    console.log('🚀 Starting Trading Pairs Alert System with Auto-Sync...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
    
    // Setup Socket.IO for real-time updates
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
      
      // Send welcome message
      socket.emit('connection-status', { 
        connected: true, 
        message: 'Auto-sync service is running',
        timestamp: new Date().toISOString()
      });
    });
    
    // Setup cron jobs (includes auto-sync every 5 minutes)
    console.log('⏰ Setting up cron jobs with auto-sync...');
    setupCronJobs(io);
    console.log('✅ Cron jobs configured successfully');
    console.log('   - Crypto data update: every 1 minute');
    console.log('   - Alert checking: every 1 minute');
    console.log('   - 🆕 AUTO-SYNC: every 5 minutes');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`\n🌟 === SERVER STARTED SUCCESSFULLY ===`);
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🌐 API available at: http://localhost:${PORT}`);
      console.log(`🔄 Auto-sync service: ACTIVE`);
      console.log(`💾 Database: ${MONGODB_URI}`);
      console.log(`⚡ Real-time updates: ENABLED`);
      
      console.log(`\n🎯 FEATURES ENABLED:`);
      console.log(`   ✅ Trading pairs auto-sync with Binance`);
      console.log(`   ✅ New pairs automatically added`);
      console.log(`   ✅ Delisted pairs automatically removed`);
      console.log(`   ✅ Real-time price updates`);
      console.log(`   ✅ Alert monitoring system`);
      console.log(`   ✅ WebSocket notifications`);
      
      console.log(`\n💡 Your trading pairs will stay in perfect sync with Binance!`);
      console.log(`🔍 Monitor logs to see auto-sync activity every 5 minutes.\n`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      
      server.close(() => {
        console.log('✅ Server closed');
      });
      
      await mongoose.disconnect();
      console.log('✅ Database disconnected');
      
      console.log('👋 Auto-sync service stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };
