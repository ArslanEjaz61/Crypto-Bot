#!/bin/bash

echo "🔧 Fixing production deployment..."

# Set production environment
export NODE_ENV=production

echo "📦 Building React frontend..."
cd client

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing client dependencies..."
    npm install
fi

# Build the React app
echo "Building React app..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ React build failed!"
    exit 1
fi

echo "✅ React app built successfully"

# Go back to root
cd ..

echo "🚀 Starting server with production settings..."

# Set environment variables
export NODE_ENV=production
export PORT=5000

echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Start the server
node server/index.js
