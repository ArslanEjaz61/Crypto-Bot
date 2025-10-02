# 📁 Project Structure - Clean & Simple

## 🎯 Essential Files Only

### **Root Directory**
```
Crypto-Bot/
├── index.js                      # Main server entry
├── populate-database.js          # Database setup (run once)
├── package.json                  # Dependencies
├── .env                          # Configuration
│
├── README.md                     # Main documentation
├── QUICKSTART.md                 # Quick start guide
├── NO_REDIS_SETUP.md            # Simple setup guide
│
├── simple-websocket-service.js   # Optional: WebSocket service
├── simple-alert-worker.js        # Optional: Alert worker
├── start-simple.js              # Optional: Redis mode startup
│
├── auto_sync_pairs.js           # Utility: Auto-sync Binance pairs
├── monitor_autosync.js          # Utility: Monitor sync
│
├── server/                      # Backend code
└── client/                      # Frontend React app
```

---

## 📂 Server Structure

```
server/
├── config/
│   └── db.js                    # MongoDB connection
│
├── models/
│   ├── userModel.js            # User schema
│   ├── alertModel.js           # Alert schema
│   ├── cryptoModel.js          # Crypto pairs schema
│   ├── notificationModel.js    # Notification schema
│   └── TriggeredAlert.js       # Triggered alerts schema
│
├── controllers/
│   ├── authController.js       # Authentication
│   ├── alertController.js      # Alert management
│   ├── cryptoController.js     # Crypto data (regular)
│   ├── fastCryptoController.js # Crypto data (fast/Redis)
│   ├── notificationController.js
│   └── triggeredAlertController.js
│
├── routes/
│   ├── api.js                  # Main router
│   ├── authRoutes.js
│   ├── alertRoutes.js
│   ├── cryptoRoutes.js
│   ├── indicatorRoutes.js
│   ├── notificationRoutes.js
│   ├── telegramRoutes.js
│   └── triggeredAlerts.js
│
├── services/
│   ├── alertService.js         # Alert processing
│   └── alertServiceComprehensive.js
│
├── utils/
│   ├── cronJobs.js             # Regular cron jobs
│   ├── cronJobsOptimized.js    # Optimized cron (Redis)
│   ├── emailService.js         # Email notifications
│   ├── telegramService.js      # Telegram notifications
│   └── errorHandler.js         # Error handling
│
├── middleware/
│   └── authMiddleware.js       # JWT authentication
│
└── index.js                    # Server entry point
```

---

## 📂 Client Structure

```
client/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── index.js                # React entry
│   ├── App.js                  # Main app component
│   │
│   ├── components/
│   │   ├── Dashboard.js        # Main dashboard
│   │   ├── Login.js            # Login page
│   │   ├── MarketPanel.js      # Market pairs list
│   │   ├── LineChart.js        # TradingView charts
│   │   ├── Header.js           # Top navigation
│   │   ├── FilterSidebar.js    # Alert filters
│   │   ├── Notification.js     # Notifications
│   │   └── TriggeredAlertsPanel.js
│   │
│   ├── context/
│   │   ├── AuthContext.js      # Authentication state
│   │   ├── AlertContext.js     # Alert management
│   │   ├── CryptoContext.js    # Crypto data
│   │   ├── SocketContext.js    # WebSocket connection
│   │   └── SelectedPairContext.js
│   │
│   ├── services/
│   │   ├── BinanceWebSocketService.js
│   │   └── NotificationService.js
│   │
│   └── utils/
│       └── apiCache.js         # Client-side caching
│
└── package.json
```

---

## 🚀 How To Use

### **Simple Mode (No Redis):**
```bash
npm run populate    # Once - setup database
npm start           # Start server
```

### **Advanced Mode (With Redis):**
```bash
npm run populate       # Once - setup database
npm run start:fast     # Start with WebSocket + Redis
```

---

## 📝 Key Files

### **Main Entry Points:**
- `index.js` - Express server
- `client/src/index.js` - React app
- `populate-database.js` - Database setup

### **Optional Services:**
- `simple-websocket-service.js` - WebSocket for Redis
- `simple-alert-worker.js` - Alert worker for Redis
- `start-simple.js` - Startup with all services

### **Documentation:**
- `README.md` - Main guide
- `QUICKSTART.md` - Quick start
- `NO_REDIS_SETUP.md` - Simple setup
- `PROJECT_STRUCTURE.md` - This file

---

## ✅ Clean & Organized

All unnecessary files removed:
- ❌ Old documentation
- ❌ Unused scripts
- ❌ Duplicate files
- ❌ Test files

Only essential code remains! 🎉

