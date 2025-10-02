/**
 * 🚀 SIMPLE OPTIMIZED STARTUP
 *
 * Start karo:
 * 1. WebSocket Service (Binance se live prices)
 * 2. Alert Worker (Redis se alerts check)
 * 3. Main Server (Express API)
 */

const { spawn } = require("child_process");

console.log("🚀 Starting Optimized Crypto Bot...\n");

let processes = [];

// Start WebSocket Service
console.log("📡 Starting WebSocket Service...");
const wsProcess = spawn("node", ["simple-websocket-service.js"], {
  stdio: "inherit",
});
processes.push(wsProcess);

// Wait 2 seconds
setTimeout(() => {
  console.log("⚡ Starting Alert Worker...");
  const workerProcess = spawn("node", ["simple-alert-worker.js"], {
    stdio: "inherit",
  });
  processes.push(workerProcess);
}, 2000);

// Wait 3 seconds
setTimeout(() => {
  console.log("🌐 Starting Main Server...");
  const serverProcess = spawn("node", ["index.js"], {
    stdio: "inherit",
  });
  processes.push(serverProcess);
}, 3000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down all services...");
  processes.forEach((p) => p.kill("SIGINT"));
  setTimeout(() => process.exit(0), 2000);
});

console.log("\n✅ All services starting...");
console.log("📊 WebSocket: Live prices from Binance");
console.log("⚡ Worker: Real-time alert processing");
console.log("🌐 Server: Express API");
console.log("\n🔗 Access: http://localhost:5000");
console.log("📱 Press Ctrl+C to stop\n");

