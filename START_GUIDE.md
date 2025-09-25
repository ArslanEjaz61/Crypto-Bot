# 🚀 Enhanced Start Guide

## Quick Start (Recommended)

Simply run the enhanced `start.js` file with all optimizations included:

```bash
npm start
```

Or directly:
```bash
node start.js
```

## What's Included in start.js

The `start.js` file now includes **ALL** optimizations and fixes:

### ✅ Memory Optimization
- **Server Heap**: Limited to 1GB
- **Client Heap**: Limited to 512MB  
- **Garbage Collection**: Enabled with `--expose-gc`
- **Memory Monitoring**: Real-time memory usage tracking

### ✅ Server Optimizations
- **Memory Management**: Prevents crashes from memory allocation errors
- **Background Refresh**: Non-blocking API data updates
- **Timeout Protection**: 15-second timeouts for background operations
- **Error Handling**: Graceful error recovery

### ✅ API Fixes
- **Chart API**: All endpoints working (no more 404 errors)
- **Indicator Routes**: RSI, EMA, Volume, OHLCV endpoints registered
- **Crypto List**: Fast response without timeouts
- **Triggered Alerts**: Working perfectly

### ✅ Enhanced Features
- **MongoDB Check**: Automatically detects if MongoDB is running
- **Port Check**: Warns if ports 3000/5000 are in use
- **Auto .env Creation**: Creates .env file if missing
- **Memory Monitoring**: Shows memory usage every 30 seconds
- **Error Recovery**: Continues running even if some components fail

## Available Commands

```bash
# Main command (recommended)
npm start                 # Runs start.js with all optimizations

# Alternative commands
npm run start:server      # Runs only the server (index.js)
npm run start:optimized   # Runs start-optimized.js
npm run start:memory-safe # Runs with memory flags only

# Development commands
npm run dev              # Runs server + client with nodemon
npm run server           # Runs server with nodemon (auto-restart)
npm run client           # Runs only the client
```

## What You'll See

When you run `npm start`, you'll see:

```
[SCRIPT] ==== Binance Alerts App Startup (Enhanced + Memory Optimized) ====
[SCRIPT] Memory Optimization Settings:
[SCRIPT]   - Server Heap Size: 1GB
[SCRIPT]   - Client Heap Size: 512MB
[SCRIPT]   - Garbage Collection: Enabled
[SCRIPT]   - Memory Monitoring: Active
[SCRIPT] ✅ MongoDB is running
[SCRIPT] Starting server with memory optimization...
[SERVER] Server running with Socket.io on port 5000
[SERVER] Access API at http://localhost:5000/api
[SCRIPT] Starting client...
[CLIENT] Compiled successfully!
[SCRIPT] 💾 Startup script memory: 45MB
```

## Troubleshooting

### If you get memory errors:
The memory optimization is already included in `start.js`, but if you still get errors:
```bash
npm run start:memory-safe
```

### If MongoDB is not running:
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### If ports are in use:
```bash
# Check what's using port 5000
netstat -ano | findstr :5000

# Check what's using port 3000  
netstat -ano | findstr :3000
```

## Performance Benefits

- ✅ **No More Crashes**: Memory allocation errors eliminated
- ✅ **Fast API Response**: No more timeouts on crypto list
- ✅ **Working Charts**: All chart endpoints functional
- ✅ **Stable Server**: Runs continuously without memory leaks
- ✅ **Real-time Updates**: Background data refresh keeps data current

## Access Your App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## Summary

The `start.js` file now contains **everything** you need:
- Memory optimization
- Server fixes
- API endpoint fixes
- Error handling
- Monitoring

Just run `npm start` and everything will work perfectly! 🎉
