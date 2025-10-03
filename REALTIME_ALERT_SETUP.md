# 🚀 Real-time Alert System Setup Guide

This guide will help you set up the complete real-time alert system with instant pair loading, real-time condition checking, and WebSocket integration.

## 📋 System Overview

The real-time alert system provides:

1. **Instant Pairs Loading** - All USDT pairs load instantly and stay visible (no disappearing after 15000ms)
2. **Real-time Volume Updates** - Live volume and price updates via WebSocket
3. **Advanced Alert Conditions** - Three simultaneous conditions that must all pass:
   - Min Daily Candle Condition (High-Low OR Volume)
   - +Change% Condition (Close-Open/Open * 100)
   - Alert Count Condition (Limit alerts per timeframe)
4. **Instant Alert Triggering** - Alerts fire within 1-2 seconds when conditions are met
5. **Comprehensive History** - Triggered alerts with condition details and charts

## 🛠️ Prerequisites

- Node.js 16+ 
- MongoDB
- Redis
- Binance API access

## 📦 Installation

### 1. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..
```

### 2. Environment Configuration

Create `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/trading-alerts

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Configuration
PORT=5000
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Binance WebSocket
BINANCE_WS_URL=wss://stream.binance.com:9443/ws/!miniTicker@arr
```

## 🚀 Quick Start

### 1. Start the Real-time Alert System

```bash
# Start the complete system
node run-realtime-alert-system.js
```

This will start:
- ✅ Binance WebSocket Service (price updates)
- ✅ Real-time Alert Worker (condition checking)
- ✅ Redis caching system
- ✅ Instant pairs service

### 2. Start the Backend Server

```bash
# In another terminal
npm start
```

### 3. Start the Frontend

```bash
# In another terminal
cd client
npm start
```

### 4. Test the System

```bash
# Run comprehensive tests
node test-realtime-system.js
```

## 📊 API Endpoints

### Instant Pairs
- `GET /api/pairs/instant` - Load all USDT pairs instantly
- `GET /api/pairs/instant/top` - Get top volume pairs
- `POST /api/pairs/instant/search` - Search pairs with criteria
- `POST /api/pairs/instant/by-symbols` - Get pairs by symbols

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

### Triggered Alerts
- `GET /api/triggered-alerts` - Get triggered alerts history
- `GET /api/triggered-alerts/:id` - Get specific triggered alert

## 🔌 WebSocket Events

### Client → Server
- `price-update` - Real-time price updates
- `alert-triggered` - Alert trigger notifications
- `pairs-update` - Pairs data updates
- `conditions-update` - Condition check results

## 🎯 Alert Conditions

### 1️⃣ Min Daily Candle Condition
- **Logic**: One daily candle = High – Low OR volume
- **Trigger**: If candle size (high – low) OR daily volume > user threshold
- **Example**: Min Daily Volume = 1M → only trigger when volume > 1,000,000

### 2️⃣ +Change% Condition
- **Formula**: `(Close - Open) / Open * 100`
- **Trigger**: If percentage change > user input threshold
- **Example**: +Change% set to 5% → alert triggers if daily move > 5%

### 3️⃣ Alert Count Condition
- **Logic**: If `alert_count < max_allowed_alerts` → ✅ pass
- **Trigger**: Limit how many times alerts fire for the same coin
- **Example**: Max alerts = 3, after 3 triggers, no more alerts

### ⚡ Final Trigger Rule
**All selected conditions must pass simultaneously** → Only then alert fires.

## 🖥️ Frontend Components

### InstantDashboard
- Real-time pairs loading
- Live volume updates
- No disappearing pairs
- Optimized performance

### TriggeredAlertsHistory
- Real-time alert notifications
- Condition details
- Chart integration
- Live updates

## 🔧 Configuration

### Redis Configuration
```javascript
// server/config/redis.js
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  // ... other options
});
```

### WebSocket Configuration
```javascript
// Real-time price updates
const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
```

## 📈 Performance Features

### Instant Loading
- Pairs load in < 50ms from Redis cache
- No API rate limiting issues
- Persistent visibility (no disappearing)

### Real-time Updates
- WebSocket price updates every second
- Live volume changes
- Instant condition checking

### Optimized Caching
- Redis-based caching system
- 5-minute cache TTL
- Automatic cache refresh

## 🧪 Testing

### Run System Tests
```bash
node test-realtime-system.js
```

### Manual Testing
1. Open frontend dashboard
2. Create an alert with conditions
3. Watch for real-time updates
4. Verify alert triggering

## 🐛 Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check Redis status
redis-cli ping

# Start Redis if not running
redis-server
```

#### 2. WebSocket Connection Failed
```bash
# Check if port 5000 is available
netstat -an | grep 5000

# Check firewall settings
```

#### 3. No Pairs Loading
```bash
# Check MongoDB connection
mongo mongodb://localhost:27017/trading-alerts

# Check if pairs exist
db.cryptos.find().count()
```

#### 4. Alerts Not Triggering
```bash
# Check alert worker logs
# Verify conditions are properly set
# Check Redis pub/sub channels
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* node run-realtime-alert-system.js
```

## 📊 Monitoring

### System Status
```bash
# Check system status
curl http://localhost:5000/api/health

# Check pairs cache status
curl http://localhost:5000/api/pairs/instant/status
```

### Redis Monitoring
```bash
# Check Redis keys
redis-cli keys "*"

# Monitor Redis commands
redis-cli monitor
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Set production environment
export NODE_ENV=production
export MONGODB_URI=mongodb://your-mongo-host:27017/trading-alerts
export REDIS_HOST=your-redis-host
```

### 2. Process Management
```bash
# Use PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start run-realtime-alert-system.js --name "realtime-alerts"
pm2 start server/index.js --name "api-server"
```

### 3. Load Balancing
```bash
# Use nginx for load balancing
# Configure WebSocket proxy
# Set up SSL certificates
```

## 📝 API Documentation

### Create Alert
```javascript
POST /api/alerts
{
  "symbol": "BTCUSDT",
  "direction": ">",
  "targetType": "percentage",
  "targetValue": 1,
  "changePercentValue": 5,
  "minDailyVolume": 1000000,
  "alertCountEnabled": true,
  "alertCountTimeframe": "5MIN",
  "maxAlertsPerTimeframe": 3,
  "comment": "Test alert",
  "email": "user@example.com"
}
```

### Get Instant Pairs
```javascript
GET /api/pairs/instant
Response: {
  "success": true,
  "pairs": [...],
  "totalCount": 1500,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "dataSource": "redis_cache",
  "responseTime": "< 50ms"
}
```

## 🎉 Success!

Your real-time alert system is now running! 

- ✅ Instant pairs loading
- ✅ Real-time volume updates  
- ✅ Advanced alert conditions
- ✅ Instant alert triggering
- ✅ Comprehensive history

The system will now monitor all USDT pairs in real-time and trigger alerts when all conditions are met simultaneously.
