/**
 * 🚀 SIMPLE BINANCE WEBSOCKET SERVICE
 *
 * Binance se live prices receive karta hai aur Redis me store karta hai
 * No REST API calls - Direct WebSocket stream
 */

const WebSocket = require("ws");
const redis = require("redis");

class SimplePriceService {
  constructor() {
    this.ws = null;
    this.redis = null;
    this.priceCache = new Map(); // Fallback if Redis fails
    this.isConnected = false;

    this.initRedis();
    this.connectWebSocket();
  }

  async initRedis() {
    try {
      this.redis = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || 6379,
        },
      });

      this.redis.on("error", (err) => {
        console.log("⚠️ Redis not available, using memory cache");
      });

      await this.redis.connect();
      console.log("✅ Redis connected");
    } catch (error) {
      console.log("⚠️ Redis failed, using in-memory cache");
      this.redis = null;
    }
  }

  connectWebSocket() {
    console.log("🔗 Connecting to Binance WebSocket...");

    // Binance miniTicker stream - sabhi USDT pairs ki live prices
    this.ws = new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");

    this.ws.on("open", () => {
      console.log("✅ Connected to Binance live stream");
      this.isConnected = true;
    });

    this.ws.on("message", (data) => {
      this.handlePriceUpdate(data);
    });

    this.ws.on("close", () => {
      console.log("⚠️ Connection closed, reconnecting in 5 sec...");
      this.isConnected = false;
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error.message);
    });
  }

  async handlePriceUpdate(data) {
    try {
      const tickers = JSON.parse(data);

      for (const ticker of tickers) {
        const symbol = ticker.s; // BTCUSDT, ETHUSDT etc

        // Only process USDT pairs
        if (!symbol.endsWith("USDT")) continue;

        const priceData = {
          symbol: symbol,
          price: parseFloat(ticker.c), // Current close price
          open: parseFloat(ticker.o), // Open price
          high: parseFloat(ticker.h), // High price
          low: parseFloat(ticker.l), // Low price
          volume: parseFloat(ticker.q), // Volume in USDT
          timestamp: Date.now(),
        };

        // Store in Redis (primary)
        if (this.redis) {
          await this.redis.setEx(
            `price:${symbol}`,
            60, // 60 second expiry
            JSON.stringify(priceData)
          );
        }

        // Store in memory (fallback)
        this.priceCache.set(symbol, priceData);
      }
    } catch (error) {
      console.error("❌ Error processing update:", error.message);
    }
  }

  // Get current price for any symbol
  async getPrice(symbol) {
    try {
      // Try Redis first
      if (this.redis) {
        const data = await this.redis.get(`price:${symbol}`);
        if (data) return JSON.parse(data);
      }

      // Fallback to memory
      return this.priceCache.get(symbol) || null;
    } catch (error) {
      return this.priceCache.get(symbol) || null;
    }
  }

  // Get multiple prices at once
  async getPrices(symbols) {
    const prices = {};
    for (const symbol of symbols) {
      const price = await this.getPrice(symbol);
      if (price) prices[symbol] = price;
    }
    return prices;
  }

  // Store alert in Redis
  async storeAlert(symbol, alert) {
    try {
      if (this.redis) {
        await this.redis.sAdd(`alerts:${symbol}`, JSON.stringify(alert));
      }
    } catch (error) {
      console.error("❌ Failed to store alert:", error.message);
    }
  }

  // Get all alerts for a symbol
  async getAlerts(symbol) {
    try {
      if (this.redis) {
        const alerts = await this.redis.sMembers(`alerts:${symbol}`);
        return alerts.map((a) => JSON.parse(a));
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}

// Start service
if (require.main === module) {
  const service = new SimplePriceService();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    if (service.ws) service.ws.close();
    if (service.redis) service.redis.quit();
    process.exit(0);
  });

  // Log status every 30 seconds
  setInterval(() => {
    console.log(
      `📊 Status: ${
        service.isConnected ? "Connected" : "Disconnected"
      } | Cache size: ${service.priceCache.size}`
    );
  }, 30000);
}

module.exports = SimplePriceService;

