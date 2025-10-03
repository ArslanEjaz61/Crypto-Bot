# ⚡ Crypto Alert Bot - Ultra-Fast Real-time Edition

**Lightning-fast cryptocurrency alerts with 1-2 second trigger speed!** ⚡

Same speed as TradingView, Binance Alerts Extension, and Coinglass!

## 🎯 Two Modes Available

### 🚀 **NEW: Real-time Mode (Recommended)**
- ✅ **1-2 second alert triggering** (same as TradingView!)
- ✅ Real-time price updates via Binance WebSocket
- ✅ Instant notifications to frontend (no refresh needed)
- ✅ Redis-powered in-memory caching
- ✅ Perfect for active traders

### 📊 **Classic Mode (Simpler Setup)**
- ✅ REST API-based alerts
- ✅ 5-10 second trigger speed
- ✅ No Redis required
- ✅ Good for casual monitoring

---

## 🚀 Quick Start - Real-time Mode (5 minutes)

### **Step 1: Install Redis**
```bash
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis && brew services start redis
# Linux: sudo apt-get install redis-server && sudo systemctl start redis

# Verify: redis-cli ping (should return PONG)
```

### **Step 2: Configure Environment**
```bash
cp .env.example .env
# Edit .env with your MongoDB and Redis settings
```

### **Step 3: Populate Database**
```bash
npm run populate
```

### **Step 4: Start Real-time System**
```bash
npm run realtime
```

### **Step 5: Open Browser**
```
http://localhost:5000
```

**That's it! Alerts now trigger in 1-2 seconds!** 🎉

---

## 📖 Documentation

### Real-time System (NEW)
- **[QUICKSTART_REALTIME.md](QUICKSTART_REALTIME.md)** - ⚡ 5-minute setup guide
- **[REALTIME_SYSTEM_GUIDE.md](REALTIME_SYSTEM_GUIDE.md)** - 📚 Complete documentation

### Classic System
- **[QUICKSTART.md](QUICKSTART.md)** - Classic mode setup
- **[NO_REDIS_SETUP.md](NO_REDIS_SETUP.md)** - Setup without Redis

---

## ✨ Features

### Real-time System (NEW)
- ⚡ **1-2 second alert triggering** (Binance WebSocket)
- 🚀 Live price updates (no polling, instant push)
- 📢 Real-time notifications to frontend (Socket.io)
- 💾 Redis in-memory caching (ultra-fast)
- 🔔 Browser notifications for triggered alerts
- 📊 Live connection status indicator

### Core Features
- 📧 Email notifications
- 📱 Telegram integration
- 📊 TradingView-style charts
- 🎯 Advanced filters (RSI, EMA, Candle patterns)
- 🔍 Multi-timeframe support
- 💼 200+ USDT trading pairs
- 🌐 Beautiful Material-UI dashboard

---

## 🔧 Commands

### Real-time System (Recommended)
```bash
# Setup (run once)
npm run populate                # Populate database with Binance pairs

# Start real-time system (all-in-one)
npm run realtime                # Complete real-time system

# Or start services individually (advanced)
npm run realtime:websocket      # Binance WebSocket (price streaming)
npm run realtime:worker         # Alert Worker (alert checking)
npm run server                  # API Server + Socket.io
npm run client                  # React Frontend

# Development mode (auto-reload)
npm run realtime:dev            # All services with nodemon
```

### Classic System
```bash
npm start                       # Regular REST API mode
npm run dev                     # Development mode
```

---

## ⚙️ Configuration

Create `.env` file:

```bash
# MongoDB (required)
MONGODB_URI=mongodb://localhost:27017/binance-alerts

# Redis (required for real-time mode)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                 # Leave empty for local Redis

# JWT (required)
JWT_SECRET=your-super-secret-key-change-this-in-production

# Server
PORT=5000
NODE_ENV=development

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Email (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend
REACT_APP_API_URL=http://localhost:5000
```

---

## 🆘 Troubleshooting

### Redis Connection Error?
```bash
# Make sure Redis is running
redis-cli ping              # Should return: PONG

# If not running:
redis-server                # Windows: run redis-server.exe
brew services start redis   # Mac
sudo systemctl start redis  # Linux
```

### Market Panel Empty?
```bash
npm run populate
```

### Alerts Not Triggering?
1. ✅ Check Redis is running: `redis-cli ping`
2. ✅ Verify services are running (check console logs)
3. ✅ Make sure alert is active in dashboard
4. ✅ Check alert conditions are correct

### Server Won't Start?
Check MongoDB is running:
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

### Frontend Not Receiving Alerts?
1. ✅ Check browser console for WebSocket connection
2. ✅ Look for: "Connected to real-time alert system"
3. ✅ Verify `REACT_APP_API_URL` in `.env`

---

## 🎯 Tech Stack

- **Frontend:** React 18, Material-UI, Socket.io Client
- **Backend:** Node.js, Express, Socket.io Server
- **Database:** MongoDB (alerts, users, history)
- **Cache:** Redis (real-time prices, pub/sub)
- **WebSocket:** ws (Binance connection), Socket.io (frontend connection)
- **Real-time:** Binance WebSocket API (miniTicker@arr)

---

## 📝 License

MIT

---

## 📊 Performance Comparison

| Feature | Classic Mode | Real-time Mode |
|---------|--------------|----------------|
| Alert Speed | 5-10 seconds | **1-2 seconds** ⚡ |
| Price Updates | Polling (every 5s) | WebSocket (real-time) |
| API Calls | High | Minimal |
| Resource Usage | Medium | Low |
| Scalability | Limited | Excellent |
| Redis Required | ❌ | ✅ |

---

## 🏗️ System Architecture (Real-time Mode)

```
┌─────────────────────────────────────────────────────────┐
│                   Real-time Alert Flow                  │
└─────────────────────────────────────────────────────────┘

Binance WebSocket
    ↓ (live prices)
Redis (in-memory DB)
    ├─ Store latest prices
    └─ Pub/Sub channels
         ↓
Alert Worker
    ├─ Subscribe to price updates
    ├─ Check alert conditions
    └─ Trigger alerts (<1 second!)
         ↓
Socket.io Server
    ↓ (broadcast)
React Frontend
    └─ Display alerts instantly (no refresh!)
```

---

## 🚀 Frontend Integration

```javascript
// Use the real-time alerts hook
import useRealtimeAlerts from './hooks/useRealtimeAlerts';

function MyComponent() {
  const { 
    triggeredAlerts,    // All triggered alerts
    latestAlert,        // Most recent alert
    isConnected,        // Connection status
  } = useRealtimeAlerts();

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
      
      {latestAlert && (
        <div>🚨 {latestAlert.symbol} reached ${latestAlert.price}!</div>
      )}
    </div>
  );
}
```

Or use the pre-built component:
```javascript
import RealtimeAlertsPanel from './components/RealtimeAlertsPanel';

function Dashboard() {
  return <RealtimeAlertsPanel />;
}
```

---

## 🎉 Success!

Your ultra-fast crypto alert system is ready!

### What You Get:
- ✅ **1-2 second** alert triggering (same as TradingView!)
- ✅ Real-time price streaming from Binance
- ✅ Instant notifications to frontend (no refresh)
- ✅ Browser notifications for alerts
- ✅ 200+ USDT trading pairs
- ✅ Advanced indicators (RSI, EMA, Candle patterns)
- ✅ Beautiful Material-UI dashboard
- ✅ Telegram & Email notifications
- ✅ Production-ready architecture

### Quick Links:
- 📖 [Complete Guide](REALTIME_SYSTEM_GUIDE.md)
- ⚡ [Quick Start](QUICKSTART_REALTIME.md)
- 💻 [Frontend Integration](client/src/components/RealtimeIntegrationExample.js)

**Happy Trading! 🚀**
