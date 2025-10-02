# ⚡ Crypto Alert Bot

Real-time cryptocurrency price alerts with WebSocket optimization.

## 🚀 Quick Start

### **Step 1: Setup Database**
```bash
npm run populate
```

### **Step 2: Start Application**
```bash
npm start
```

### **Step 3: Open Browser**
```
http://localhost:5000
```

**Done!** 🎉

---

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Detailed quick start
- **[NO_REDIS_SETUP.md](NO_REDIS_SETUP.md)** - Setup without Redis

---

## ✨ Features

- ⚡ Real-time price alerts
- 📧 Email notifications
- 📱 Telegram integration
- 📊 TradingView charts
- 🎯 Advanced filters (RSI, EMA, Volume)
- 🚀 Fast market panel

---

## 🔧 Commands

```bash
# Setup (run once)
npm run populate          # Populate database with Binance pairs

# Start application
npm start                 # Regular mode
npm run dev              # Development mode

# Individual services (optional)
npm run websocket        # WebSocket service only
npm run worker           # Alert worker only
```

---

## ⚙️ Configuration

Create `.env` file:

```bash
# MongoDB (required)
MONGO_URI=mongodb://127.0.0.1:27017/alerts

# Email (required for alerts)
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
TELEGRAM_BOT_TOKEN=your_token
PORT=5000
```

---

## 🆘 Troubleshooting

### Market Panel Empty?
```bash
npm run populate
```

### Alerts Not Working?
Check `.env` file has email credentials.

### Server Won't Start?
Check MongoDB is running:
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

---

## 🎯 Tech Stack

- **Frontend:** React, Material-UI
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Real-time:** WebSocket, Socket.io
- **Cache:** Redis (optional)

---

## 📝 License

MIT

---

## 🎉 Success

Your crypto alert system is ready!

Features:
- ✅ Real-time alerts
- ✅ Email notifications  
- ✅ Fast market panel
- ✅ Professional UI

Enjoy! 🚀
