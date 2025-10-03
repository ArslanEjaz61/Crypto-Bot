# 🪟 Windows Setup Guide - Real-time Alert System

## Problem Aapko Face Horahi Thi

```
❌ MongoDB connection failed: option keepalive is not supported
❌ Redis Client error: connect ECONNREFUSED 127.0.0.1:4834
```

## Solution (Step by Step)

### Step 1: .env File Banayein

Root directory mein `.env` file banayein with this content:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://kainatkhan68299:kainat123@cluster0.e9lk1.mongodb.net/binance

# Redis Configuration (Required for Real-time System)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345

# Server Configuration
PORT=5000
NODE_ENV=development

# Telegram Notifications (Optional - leave empty if not using)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Email Notifications (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=
EMAIL_PASSWORD=

# Frontend URL
REACT_APP_API_URL=http://localhost:5000
```

**Important:** Redis port **6379** hona chahiye, **4834 nahi**!

### Step 2: Redis Install Karein (Windows)

#### Option A: Redis for Windows (Official Port)

1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Download `Redis-x64-3.0.504.zip` (latest version)
3. Extract zip file to `C:\Redis`
4. Open folder and double-click `redis-server.exe`
5. Window khuli rahegi - isse band mat karein!

#### Option B: Memurai (Recommended for Windows)

1. Download from: https://www.memurai.com/get-memurai
2. Install karo (simple installer hai)
3. Automatically service ke taur pe run hoga

#### Verify Redis is Running

```bash
# Open PowerShell
redis-cli ping

# Should return: PONG
```

Agar error aaye:
```bash
# Navigate to Redis folder
cd C:\Redis
.\redis-cli.exe ping
```

### Step 3: MongoDB Atlas Already Working Hai

Aapka MongoDB Atlas already connected hai (dekha terminal output mein), so MongoDB setup done hai! ✅

### Step 4: System Start Karein

```bash
npm run realtime
```

### Expected Output (Successful)

```
🚀 Starting Complete Real-time Alert System...

✅ Real-time Server initialized
✅ API routes registered
✅ Serving React build
📦 Connecting to MongoDB...
✅ MongoDB Connected: cluster0.e9lk1.mongodb.net  ← Should see this!

📦 Connecting to Redis...
✅ Redis Client connected                         ← Should see this!
✅ Redis Publisher connected
✅ Redis Subscriber connected

📦 Starting Express server...
✅ Express server running on port 5000

📦 Starting Binance WebSocket Service...
✅ Binance WebSocket Service started

📦 Starting Alert Worker Service...
✅ Alert Worker Service started

🎉 REAL-TIME ALERT SYSTEM RUNNING SUCCESSFULLY! 🎉
```

---

## Common Issues & Solutions

### Issue 1: Redis Connection Refused

**Problem:**
```
❌ Redis Client error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Make sure Redis is running
# Open new PowerShell terminal:
cd C:\Redis
.\redis-server.exe

# Keep this window open!
```

### Issue 2: Redis Port Wrong (4834)

**Problem:**
```
❌ Redis Client error: connect ECONNREFUSED 127.0.0.1:4834
```

**Solution:**
Check `.env` file mein `REDIS_PORT=6379` ho (4834 nahi!)

### Issue 3: MongoDB keepalive Error

**Problem:**
```
❌ MongoDB connection failed: option keepalive is not supported
```

**Solution:**
✅ Already fixed! Maine `server/config/db.js` update kar diya hai.
Just restart karein: `npm run realtime`

### Issue 4: Can't Find .env File

**Solution:**
`.env` file root directory mein honi chahiye, exactly yahan:
```
Trading-Pairs-Trend-Alert/
├── .env                    ← Yahan
├── package.json
├── server/
└── client/
```

---

## Quick Checklist ✅

Before running `npm run realtime`:

- [ ] `.env` file created hai
- [ ] `.env` mein `REDIS_PORT=6379` hai (not 4834)
- [ ] Redis running hai (`redis-server.exe` window khuli hai)
- [ ] MongoDB Atlas URL correct hai `.env` mein
- [ ] Saved all files

---

## Testing Redis Connection

```bash
# Test 1: Ping Redis
redis-cli ping
# Expected: PONG

# Test 2: Set a test value
redis-cli
> SET test "Hello"
> GET test
# Expected: "Hello"
> EXIT

# Test 3: Check Redis is listening on port 6379
netstat -an | findstr 6379
# Should show: TCP  127.0.0.1:6379  LISTENING
```

---

## Alternative: Redis via Docker (If above doesn't work)

Agar Redis install nahi ho raha, Docker use kar sakte hain:

```bash
# Install Docker Desktop for Windows
# Then run:
docker run -d -p 6379:6379 --name redis redis:alpine

# Verify:
docker ps
# Should show redis container running
```

---

## Final Command

```bash
# Make sure:
# 1. .env file hai (with correct REDIS_PORT=6379)
# 2. Redis running hai
# 3. MongoDB Atlas connected hai

npm run realtime
```

Browser mein jao: **http://localhost:5000**

---

## Need Help?

Agar abhi bhi issue aaye:

1. Check Redis is running: `redis-cli ping`
2. Check .env file exists: `dir .env`
3. Check .env has REDIS_PORT=6379
4. Restart everything:
   - Close redis-server.exe
   - Start redis-server.exe again
   - Run `npm run realtime` again

---

**Good luck! 🚀**

