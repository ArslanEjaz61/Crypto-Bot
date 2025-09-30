#!/bin/bash

echo "🔄 Restarting Crypto Bot in Production Mode..."

# Stop PM2 process
echo "⏹️ Stopping current process..."
pm2 stop crypto-bot

# Wait a moment
sleep 2

# Delete the process
echo "🗑️ Deleting old process..."
pm2 delete crypto-bot

# Set production environment variables
export NODE_ENV=production
export PORT=5000
export API_TIMEOUT=30000
export API_MAX_RETRIES=5

# Start the server with production settings
echo "🚀 Starting server with production configuration..."
pm2 start server/index.js --name crypto-bot --env production

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "📋 Recent logs:"
pm2 logs crypto-bot --lines 20

echo "✅ Restart complete!"
echo "💡 Monitor logs with: pm2 logs crypto-bot"
echo "💡 Check status with: pm2 status"
