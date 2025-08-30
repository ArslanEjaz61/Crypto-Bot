const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const { setupCronJobs } = require('./utils/cronJobs');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
connectDB();

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

// Routes
app.use('/api/crypto', require('./routes/cryptoRoutes'));
app.use('/api/indicators', require('./routes/indicatorRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/telegram', require('./routes/telegramRoutes'));

// Start cron jobs
setupCronJobs(io);

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
