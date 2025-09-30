// Root index.js file to start the server
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const {
  connectDB,
  isConnected,
  waitForConnection,
} = require("./server/config/db");
const http = require("http");
const { Server } = require("socket.io");
// Removed morgan dependency as it might not be installed
const { setupCronJobs } = require("./server/utils/cronJobs");
const { setupProduction } = require("./production-fixes");

// Load environment variables
dotenv.config();

// Setup production environment (includes database connection)
const initializeServer = async () => {
  try {
    // Setup production environment
    await setupProduction();

    // Connect to database with enhanced settings
    const dbConnected = await connectDB();
    
    if (dbConnected) {
      console.log("✅ Database connection successful");
    } else {
      console.log("⚠️ Database connection failed - continuing with limited functionality");
    }

    console.log("✅ Server initialization complete");
  } catch (error) {
    console.error("❌ Server initialization failed:", error);
    // Continue anyway in production
    if (process.env.NODE_ENV === "production") {
      console.log(
        "⚠️ Continuing in production mode despite initialization errors"
      );
    } else {
      console.log("⚠️ Continuing in development mode despite initialization errors");
    }
  }
};

// Initialize Express with HTTP server and Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});
app.use('/api', require('./routes/api'));
// Enhanced middleware for request logging and proper JSON handling
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Add a simple health check endpoint
app.get("/api/health", (req, res) => {
  console.log("Health check endpoint accessed");
  res.status(200).json({ status: "Server is running" });
});

// Debug endpoint to verify server is responding
app.get("/debug", (req, res) => {
  console.log("Debug endpoint accessed");
  res.status(200).json({ message: "Server is working" });
});

// Make io accessible to our routes
app.set("io", io);

// Import error handlers
const { notFound, errorHandler } = require("./server/utils/errorHandler");

// API routes - centralized routing
app.use('/api', require('./server/routes/api'));

// Start cron jobs
setupCronJobs(io);

// Error handler middleware
app.use(notFound);
app.use(errorHandler);

// Serve React build
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Define port
const PORT = process.env.PORT || 5000;

// Handle errors on server start
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please use a different port.`
    );
    process.exit(1);
  } else {
    console.error("Server error:", error);
    process.exit(1);
  }
});

// Start server with socket.io support
const startServer = async () => {
  try {
    // Initialize server first
    await initializeServer();

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running with Socket.io on port ${PORT}`);
      console.log(`Access API at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle process termination gracefully
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
