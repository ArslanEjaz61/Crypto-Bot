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

// Start cron jobs
setupCronJobs(io);
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

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
