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

// Middleware
app.use(express.json());
app.use(cors());

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

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

// Routes - with error handling for each route registration
const registerRoutes = () => {
  try {
    console.log('Registering routes...');
    
    // Register individual routes with error handling
    try {
      app.use('/api/crypto', require('./routes/cryptoRoutes'));
      console.log('✓ Crypto routes registered');
    } catch (error) {
      console.error('❌ Failed to register crypto routes:', error.message);
    }
    
    try {
      app.use('/api/alerts', require('./routes/alertRoutes'));
      console.log('✓ Alert routes registered');
    } catch (error) {
      console.error('❌ Failed to register alert routes:', error.message);
    }
    
    try {
      app.use('/api/indicators', require('./routes/indicatorRoutes'));
      console.log('✓ Indicator routes registered');
    } catch (error) {
      console.error('❌ Failed to register indicator routes:', error.message);
    }
    
    try {
      app.use('/api/telegram', require('./routes/telegramRoutes'));
      console.log('✓ Telegram routes registered');
    } catch (error) {
      console.error('❌ Failed to register telegram routes:', error.message);
    }
    
    try {
      app.use('/api/notifications', require('./routes/notificationRoutes'));
      console.log('✓ Notification routes registered');
    } catch (error) {
      console.error('❌ Failed to register notification routes:', error.message);
    }
    
    try {
      app.use('/api/triggered-alerts', require('./routes/triggeredAlerts'));
      console.log('✓ Triggered alerts routes registered');
    } catch (error) {
      console.error('❌ Failed to register triggered alerts routes:', error.message);
    }
    
    console.log('Route registration completed');
  } catch (error) {
    console.error('Error registering routes:', error);
    // Don't exit in production - continue with available routes
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Register routes
registerRoutes();

// Error handling middleware (must be after routes)
const { notFound, errorHandler } = require('./utils/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Add centralized API routes
app.use('/api', require('./routes/api'));

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
