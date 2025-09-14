// Root index.js file to start the server
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./server/config/db');
const http = require('http');
const { Server } = require('socket.io');
// Removed morgan dependency as it might not be installed
const { setupCronJobs } = require('./server/utils/cronJobs');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Express with HTTP server and Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

// Enhanced middleware for request logging and proper JSON handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint accessed');
  res.status(200).json({ status: 'Server is running' });
});

// Debug endpoint to verify server is responding
app.get('/debug', (req, res) => {
  console.log('Debug endpoint accessed');
  res.status(200).json({ message: 'Server is working' });
});


// Make io accessible to our routes
app.set('io', io);

// Import routes
const alertRoutes = require('./server/routes/alertRoutes');
const cryptoRoutes = require('./server/routes/cryptoRoutes');
const authRoutes = require('./server/routes/authRoutes');
const triggeredAlertsRoutes = require('./server/routes/triggeredAlerts');
const { notFound, errorHandler } = require('./server/utils/errorHandler');

// Use routes
app.use('/api/alerts', alertRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/triggered-alerts', triggeredAlertsRoutes);

// Start cron jobs
setupCronJobs(io);

// Error handler middleware
app.use(notFound);
app.use(errorHandler);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Define port
const PORT = process.env.PORT || 5000;

// Handle errors on server start
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Start server with socket.io support
server.listen(PORT, () => {
  console.log(`Server running with Socket.io on port ${PORT}`);
  console.log(`Access API at http://localhost:${PORT}/api`);
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

