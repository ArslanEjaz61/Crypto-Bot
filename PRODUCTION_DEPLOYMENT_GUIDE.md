# Production Deployment Guide

## Fixed Issues

### 1. ✅ Import Error Fixed
**Problem**: `TypeError: connectDB is not a function`
**Solution**: Updated import statement in `server/index.js`
```javascript
// Before (causing error):
const connectDB = require('./config/db');

// After (fixed):
const { connectDB } = require('./config/db');
```

### 2. ✅ Enhanced Error Handling
- Added proper async/await for database connection
- Added individual error handling for each route registration
- Added graceful degradation for production environment
- Added error handling for cron jobs

### 3. ✅ Production-Ready Features
- Server continues running even if some components fail
- Better error logging and debugging
- Graceful handling of missing dependencies

## Deployment Steps

### 1. Update Your Code
```bash
# Pull the latest changes
git pull origin main

# Or if you're updating manually, make sure these files are updated:
# - server/index.js (fixed imports and error handling)
# - server/controllers/cryptoController.js (MongoDB connection fixes)
# - server/config/db.js (enhanced connection handling)
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Frontend (if not already built)
```bash
cd client
npm install
npm run build
cd ..
```

### 4. Set Environment Variables
Create a `.env` file in the root directory:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/binance-alerts
# Add other environment variables as needed
```

### 5. Restart PM2
```bash
# Stop the current process
pm2 stop crypto-bot

# Delete the old process
pm2 delete crypto-bot

# Start the updated process
pm2 start server/index.js --name crypto-bot

# Or if you have an ecosystem file:
pm2 start ecosystem.config.js
```

### 6. Monitor the Deployment
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs crypto-bot

# View error logs specifically
pm2 logs crypto-bot --err
```

## Expected Output

After deployment, you should see logs like:
```
✅ Database connection established
✓ Crypto routes registered
✓ Alert routes registered
✓ Indicator routes registered
✓ Telegram routes registered
✓ Notification routes registered
✓ Triggered alerts routes registered
✓ Cron jobs started
Server running on port 5000
```

## Troubleshooting

### If you still get import errors:
1. Check that all files are properly updated
2. Restart PM2 completely: `pm2 kill && pm2 start server/index.js --name crypto-bot`
3. Check file permissions: `chmod +x server/index.js`

### If MongoDB connection fails:
1. Ensure MongoDB is running: `sudo systemctl status mongod`
2. Check MongoDB connection string in `.env`
3. Check firewall settings for port 27017

### If routes fail to register:
- The server will continue running with available routes
- Check individual route files for syntax errors
- Check PM2 logs for specific error messages

## Production Environment Variables

Make sure these are set in your production environment:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/binance-alerts
JWT_SECRET=your-secret-key
# Add other required environment variables
```

## Health Check

After deployment, test these endpoints:
- `GET /api/crypto` - Should return crypto data
- `GET /api/health` - Should return server status
- `GET /` - Should serve the React app (if built)

The server is now production-ready with proper error handling and graceful degradation! 🚀
