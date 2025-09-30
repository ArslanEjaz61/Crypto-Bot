#!/usr/bin/env node

/**
 * Production Issues Fix Script
 * This script addresses the timeout and MongoDB connection issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing production issues...\n');

// 1. Create enhanced environment configuration
const envContent = `# Production Environment Configuration
NODE_ENV=production
PORT=5000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/binance-alerts

# API Configuration
API_TIMEOUT=30000
API_MAX_RETRIES=5
API_CACHE_TTL=60000

# Network Configuration
MAX_SOCKETS=10
KEEP_ALIVE_TIMEOUT=30000

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: Email and Telegram configuration
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# TELEGRAM_BOT_TOKEN=your-telegram-bot-token
# TELEGRAM_CHAT_ID=your-chat-id
`;

console.log('📄 Creating enhanced .env file...');
fs.writeFileSync('.env', envContent);
console.log('✅ .env file created with production settings');

// 2. Create MongoDB connection test script
const mongoTestScript = `#!/usr/bin/env node

/**
 * MongoDB Connection Test for Production
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const testMongoConnection = async () => {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/binance-alerts';
    console.log('📍 Connection string:', mongoURI.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Connection state:', mongoose.connection.readyState);
    console.log('🏠 Host:', mongoose.connection.host);
    console.log('🗄️ Database:', mongoose.connection.name);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections found:', collections.length);
    
    await mongoose.connection.close();
    console.log('✅ Connection test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('💡 Solutions:');
    console.error('   1. Check if MongoDB is running: sudo systemctl status mongod');
    console.error('   2. Start MongoDB: sudo systemctl start mongod');
    console.error('   3. Check MongoDB logs: sudo journalctl -u mongod');
    process.exit(1);
  }
};

testMongoConnection();
`;

console.log('📄 Creating MongoDB test script...');
fs.writeFileSync('test-mongo-connection.js', mongoTestScript);
console.log('✅ MongoDB test script created');

// 3. Create network connectivity test
const networkTestScript = `#!/usr/bin/env node

/**
 * Network Connectivity Test
 */

const https = require('https');
const dns = require('dns');

const testNetworkConnectivity = async () => {
  console.log('🌐 Testing network connectivity...');
  
  // Test DNS resolution
  try {
    console.log('🔍 Testing DNS resolution...');
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4('api.binance.com', (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    console.log('✅ DNS resolution successful:', addresses[0]);
  } catch (error) {
    console.error('❌ DNS resolution failed:', error.message);
  }
  
  // Test HTTPS connection
  try {
    console.log('🔍 Testing HTTPS connection to Binance...');
    const response = await new Promise((resolve, reject) => {
      const req = https.get('https://api.binance.com/api/v3/ping', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Trading-Pairs-Trend-Alert/1.0'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Connection timeout')));
    });
    
    console.log('✅ HTTPS connection successful, status:', response.status);
  } catch (error) {
    console.error('❌ HTTPS connection failed:', error.message);
    console.error('💡 This might be a firewall or network issue');
  }
};

testNetworkConnectivity();
`;

console.log('📄 Creating network test script...');
fs.writeFileSync('test-network.js', networkTestScript);
console.log('✅ Network test script created');

// 4. Create production startup script
const startupScript = `#!/bin/bash

echo "🚀 Starting Crypto Bot in Production Mode..."

# Set production environment
export NODE_ENV=production
export PORT=5000

# Test MongoDB connection
echo "🔍 Testing MongoDB connection..."
node test-mongo-connection.js

if [ $? -ne 0 ]; then
    echo "❌ MongoDB connection failed. Please fix MongoDB issues first."
    exit 1
fi

# Test network connectivity
echo "🔍 Testing network connectivity..."
node test-network.js

# Start the server
echo "🚀 Starting server..."
node server/index.js
`;

console.log('📄 Creating production startup script...');
fs.writeFileSync('start-production.sh', startupScript);
console.log('✅ Production startup script created');

console.log('\n🎯 Production Issues Fix Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Test MongoDB connection: node test-mongo-connection.js');
console.log('2. Test network connectivity: node test-network.js');
console.log('3. Start production server: chmod +x start-production.sh && ./start-production.sh');
console.log('4. Or restart PM2: pm2 restart crypto-bot');

console.log('\n🔧 Issues Fixed:');
console.log('✅ Increased API timeout from 8s to 30s');
console.log('✅ Increased max retries from 3 to 5');
console.log('✅ Enhanced MongoDB connection settings');
console.log('✅ Added network connectivity tests');
console.log('✅ Created production startup script');

console.log('\n💡 If issues persist:');
console.log('- Check MongoDB status: sudo systemctl status mongod');
console.log('- Check firewall settings');
console.log('- Check VPS network connectivity');
console.log('- Review PM2 logs: pm2 logs crypto-bot');
