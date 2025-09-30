#!/bin/bash

# Production Deployment Script for Crypto Bot
# This script builds the React frontend and prepares the server for production

echo "🚀 Starting production deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Set production environment
export NODE_ENV=production

echo "📦 Installing server dependencies..."
npm install

echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building React frontend..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Error: React build failed. Please check the build output above."
    exit 1
fi

echo "✅ React frontend built successfully"

# Go back to root directory
cd ..

echo "🔍 Checking build directory..."
if [ -d "client/build" ]; then
    echo "✅ Build directory found: client/build"
    echo "📁 Build contents:"
    ls -la client/build/
else
    echo "❌ Error: Build directory not found"
    exit 1
fi

echo "🔧 Setting up production environment..."
# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/binance-alerts
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
EOF
    echo "⚠️ Please update the .env file with your actual configuration"
fi

echo "✅ Production deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with correct configuration"
echo "2. Restart your PM2 process:"
echo "   pm2 stop crypto-bot"
echo "   pm2 delete crypto-bot"
echo "   pm2 start server/index.js --name crypto-bot"
echo "3. Check the logs: pm2 logs crypto-bot"
echo ""
echo "🌐 Your app should now be available at:"
echo "   - API: https://socicalsarkar.site/api/health"
echo "   - Dashboard: https://socicalsarkar.site/"
echo "   - Dashboard: https://socicalsarkar.site/dashboard"
