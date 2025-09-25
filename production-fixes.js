// Production fixes and monitoring script
const mongoose = require("mongoose");

/**
 * Production Environment Fixes
 * This script addresses common production issues
 */

// 1. Enhanced MongoDB Connection
const connectDBProduction = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ MongoDB connected with production settings");

    // Connection event handlers
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected - attempting reconnection");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // In production, don't exit - continue with fallback
    return false;
  }
};

// 2. Health Check Function
const healthCheck = async () => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: false,
      memory: false,
      uptime: process.uptime(),
    },
  };

  // Check MongoDB
  health.services.mongodb = mongoose.connection.readyState === 1;

  // Check Memory
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  health.services.memory = memUsageMB < 1024; // Less than 1GB
  health.services.memoryUsageMB = memUsageMB;

  // Overall status
  health.status =
    health.services.mongodb && health.services.memory ? "healthy" : "unhealthy";

  return health;
};

// 3. Memory Monitoring
const startMemoryMonitoring = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (memUsageMB > 800) {
      // Warning at 800MB
      console.warn(`⚠️ High memory usage: ${memUsageMB}MB`);

      // Force garbage collection if available
      if (global.gc) {
        console.log("🧹 Running garbage collection...");
        global.gc();
        const newMemUsage = Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        );
        console.log(`✅ Memory after GC: ${newMemUsage}MB`);
      }
    } else {
      console.log(`💾 Memory usage: ${memUsageMB}MB`);
    }
  }, 60000); // Check every minute
};

// 4. Error Recovery
const setupErrorRecovery = () => {
  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("💥 Uncaught Exception:", error);
    // Don't exit in production - log and continue
    console.log("🔄 Attempting to continue...");
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit in production - log and continue
    console.log("🔄 Attempting to continue...");
  });

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("🛑 SIGTERM received, shutting down gracefully");
    try {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  });

  process.on("SIGINT", async () => {
    console.log("🛑 SIGINT received, shutting down gracefully");
    try {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  });
};

// 5. Production Environment Setup
const setupProduction = async () => {
  console.log("🚀 Setting up production environment...");

  // Set production environment variables if not set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }

  if (!process.env.PORT) {
    process.env.PORT = 5000;
  }

  // Connect to MongoDB
  await connectDBProduction();

  // Setup error recovery
  setupErrorRecovery();

  // Start memory monitoring
  startMemoryMonitoring();

  console.log("✅ Production environment setup complete");

  return {
    healthCheck,
    isHealthy: () => mongoose.connection.readyState === 1,
  };
};

module.exports = {
  setupProduction,
  connectDBProduction,
  healthCheck,
  startMemoryMonitoring,
  setupErrorRecovery,
};
