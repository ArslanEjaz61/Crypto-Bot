const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const path = require('path');
const { setupCronJobs } = require('./utils/cronJobs');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Don't exit in production - let the app continue with limited functionality
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Initialize database connection
initializeDatabase();

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware - JSON parsing (must be before routes)
app.use(express.json({ 
  limit: '10mb'
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Request logging middleware (only for auth routes)
app.use('/api/auth', (req, res, next) => {
  console.log(`🔐 Auth request: ${req.method} ${req.url}`);
  console.log('📦 Request body:', req.body);
  next();
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// WebSocket job progress broadcasting is now handled in initializeRealtimeSystem()

// Make io accessible to our routes
app.set('io', io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Test endpoint for debugging request body issues
app.post('/api/test-body', (req, res) => {
  console.log('Test endpoint called');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));
  
  res.json({
    message: 'Test endpoint working',
    body: req.body,
    headers: req.headers,
    contentType: req.get('Content-Type')
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const buildPath = path.join(__dirname, '../client/build');
  const indexPath = path.join(buildPath, 'index.html');
  const fs = require('fs');
  
  // Check if React build exists (works for both dev and production)
  if (fs.existsSync(indexPath)) {
    console.log('✓ Serving React app from build directory');
    res.sendFile(indexPath);
  } else {
    // Fallback for when React app is not built
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Crypto Bot Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .status { color: #666; margin: 10px 0; }
          .success { color: #28a745; }
          .warning { color: #ffc107; }
          .error { color: #dc3545; }
          pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Crypto Bot Dashboard</h1>
          <div class="status success">✅ Server is running successfully</div>
          <div class="status warning">⚠️ React frontend is not built</div>
          <p>To build the frontend, run these commands:</p>
          <pre>cd client
npm install
npm run build</pre>
          <p>Then restart the server.</p>
          <div class="status">Environment: ${process.env.NODE_ENV || 'development'}</div>
          <div class="status">API Health: <a href="/api/health">/api/health</a></div>
        </div>
      </body>
      </html>
    `);
  }
});

// Routes are now handled by centralized api.js file
console.log('✓ Routes will be registered via centralized api.js');

// Add centralized API routes (moved before error handling)
app.use('/api', require('./routes/api'));

// Initialize pairs service
const pairsService = require('./services/pairsService');
pairsService.initialize().catch(error => {
  console.error('❌ Failed to initialize pairs service:', error.message);
  // Don't exit in production - continue without pairs service
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Initialize complete real-time alert system
const initializeRealtimeSystem = async () => {
  try {
    console.log('🚀 Starting Complete Real-time Alert System...');
    console.log('==============================================');
    
    // Import all real-time services
    const binanceWebSocketService = require('./services/binanceWebSocketService');
    const realtimeAlertWorker = require('./services/realtimeAlertWorker');
    const instantPairsService = require('./services/instantPairsService');
    const alertJobProcessor = require('./services/alertJobProcessor');
    const { syncAlertsFromDB } = require('./config/redis');
    
    // Step 1: Start Binance WebSocket Service
    console.log('📡 Step 1: Starting Binance WebSocket Service...');
    binanceWebSocketService.start();
    console.log('✅ Binance WebSocket Service started');
    
    // Step 2: Initialize Instant Pairs Service
    console.log('⚡ Step 2: Initializing Instant Pairs Service...');
    await instantPairsService.initialize();
    console.log('✅ Instant Pairs Service initialized');
    
    // Step 3: Sync alerts from database to Redis
    console.log('🔄 Step 3: Syncing alerts from database to Redis...');
    const syncedCount = await syncAlertsFromDB();
    console.log(`✅ Synced ${syncedCount} alerts to Redis`);
    
    // Step 4: Start Real-time Alert Worker
    console.log('🔍 Step 4: Starting Real-time Alert Worker...');
    await realtimeAlertWorker.start();
    console.log('✅ Real-time Alert Worker started');
    
    // Step 5: Start Alert Job Processor
    console.log('⚡ Step 5: Starting Alert Job Processor...');
    await alertJobProcessor.start();
    console.log('✅ Alert Job Processor started');
    
    // Step 6: Set up WebSocket job progress broadcasting
    console.log('📡 Step 6: Setting up WebSocket job progress broadcasting...');
    const { redisSubscriber } = require('./config/redis');
    
    redisSubscriber.subscribe('alert-job-updates', (err, count) => {
      if (err) {
        console.error('❌ Error subscribing to alert-job-updates:', err.message);
        return;
      }
      console.log('✅ Subscribed to alert-job-updates channel');
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'alert-job-updates') {
        try {
          const data = JSON.parse(message);
          io.emit('alert-job-progress', data);
          console.log(`📊 Broadcasting job progress: ${data.jobId} - ${data.progress}%`);
        } catch (error) {
          console.error('❌ Error parsing job update message:', error.message);
        }
      }
    });
    console.log('✅ WebSocket job progress broadcasting configured');
    
    console.log('==============================================');
    console.log('🎉 Complete Real-time Alert System started successfully!');
    console.log('==============================================');
    console.log('📊 System Features:');
    console.log('  ✅ Instant pairs loading');
    console.log('  ✅ Real-time price updates');
    console.log('  ✅ Instant alert creation');
    console.log('  ✅ Background job processing');
    console.log('  ✅ WebSocket progress updates');
    console.log('  ✅ Real-time alert triggering');
    console.log('==============================================');
    
  } catch (error) {
    console.error('❌ Failed to start Real-time Alert System:', error.message);
    // Don't exit in production - continue without real-time system
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Continuing without real-time system...');
    }
  }
};

// Start real-time system after server is ready
server.on('listening', () => {
  console.log('🚀 Server is ready, starting real-time alert system...');
  initializeRealtimeSystem();
});

// Error handling middleware (must be after routes)
const { notFound, errorHandler } = require('./utils/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Start cron jobs with error handling
try {
  setupCronJobs(io);
  console.log('✓ Cron jobs started');
} catch (error) {
  console.error('❌ Failed to start cron jobs:', error.message);
  // Don't exit in production - continue without cron jobs
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

// Serve static assets (works for both dev and production)
const buildPath = path.join(__dirname, '../client/build');
const fs = require('fs');

if (fs.existsSync(buildPath)) {
  console.log('✓ React build directory found, serving static files');
  
  // Serve static files from React build
  app.use(express.static(buildPath));
  
  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // For all other routes, serve the React app
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('React app not found. Please build the frontend first.');
    }
  });
} else {
  console.log('⚠️ React build directory not found');
  
  // Fallback for when React app is not built
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.status(404).send(`
      <h1>Frontend Not Built</h1>
      <p>Please build the React frontend first:</p>
      <pre>cd client && npm install && npm run build</pre>
      <p>Then restart the server.</p>
    `);
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
