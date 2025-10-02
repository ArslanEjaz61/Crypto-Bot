# ⚡ QUICK START

## 🚀 **30-Second Setup**

### **1. Populate Database**
```bash
npm run populate
```

Wait ~30 seconds. You'll see:
```
✅ Database populated successfully!
📊 Total pairs: 523
```

### **2. Start Application**
```bash
npm start
```

You'll see:
```
🚀 Server running on port 5000
✅ MongoDB connected
```

### **3. Open Browser**
```
http://localhost:5000
```

Login with default credentials or register new account.

**Done!** 🎉

---

## 📋 **What Just Happened**

### **Database Populated:**
- 500+ USDT pairs from Binance
- Prices, volumes, market data
- Ready for alerts

### **Server Started:**
- Express API running
- MongoDB connected
- WebSocket optional (works without it)

### **Market Panel Ready:**
- All pairs visible
- Real-time updates
- Fast loading

---

## 🔧 **Configuration**

Create `.env` file:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/alerts
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

---

## 📖 **Commands**

```bash
# One-time setup
npm run populate              # Populate database

# Start application
npm start                     # Regular server
npm run dev                   # Development mode

# Optional services
npm run start:fast           # With WebSocket + Redis
npm run websocket            # WebSocket only
npm run worker               # Alert worker only
```

---

## ✅ **Verify**

After setup, check:

1. **Database has pairs:**
   - Open MongoDB compass
   - Database: `alerts`
   - Collection: `cryptos`
   - Should have 500+ documents

2. **Server running:**
   - Console shows: `Server running on port 5000`
   - No errors

3. **Market panel loads:**
   - Browser: `http://localhost:5000`
   - Shows list of crypto pairs
   - Prices visible

---

## 🆘 **Problems?**

### **"No pairs in market panel"**
```bash
npm run populate
```

### **"Cannot connect to database"**
Start MongoDB:
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

### **"Email alerts not working"**
Check `.env` has correct email credentials:
```bash
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

---

## 🎯 **Next Steps**

1. **Create Alert:**
   - Select a crypto pair
   - Set price/percentage target
   - Enter email for notifications

2. **Monitor:**
   - View triggered alerts
   - Check market panel
   - Track price changes

3. **Customize:**
   - Set RSI/EMA filters
   - Configure Telegram
   - Adjust preferences

---

## 💡 **Tips**

- **First Time:** Run `npm run populate` once
- **Regular Use:** Just `npm start`
- **Updates:** Prices auto-update from Binance
- **Redis Optional:** Works fine without it

---

## 🎉 **You're Ready!**

Your crypto alert system is:
- ✅ Fully configured
- ✅ Database populated
- ✅ Server running
- ✅ Ready for alerts

**Start creating alerts and enjoy!** 🚀
