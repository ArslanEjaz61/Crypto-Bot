// Root index.js file to start the server
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./server/config/db');
const http = require('http');
const { Server } = require('socket.io');
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
    methods: ['GET', 'POST']
  }
});
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

// Import routes
const alertRoutes = require('./server/routes/alertRoutes');
const cryptoRoutes = require('./server/routes/cryptoRoutes');

// Use routes
app.use('/api/alerts', alertRoutes);
app.use('/api/crypto', cryptoRoutes);

// Start cron jobs
setupCronJobs(io);

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

// Start server with socket.io support
server.listen(PORT, () => {
  console.log(`Server running with Socket.io on port ${PORT}`);
});
