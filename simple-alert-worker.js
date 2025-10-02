/**
 * ⚡ SIMPLE ALERT WORKER
 *
 * Redis se prices check karta hai aur alerts trigger karta hai
 * No Binance API calls - everything from Redis
 */

const mongoose = require("mongoose");
const SimplePriceService = require("./simple-websocket-service");
const Alert = require("./server/models/alertModel");
const Crypto = require("./server/models/cryptoModel");
const { sendAlertEmail } = require("./server/utils/emailService");
const { sendAlertNotification } = require("./server/utils/telegramService");

class SimpleAlertWorker {
  constructor() {
    this.priceService = new SimplePriceService();
    this.isProcessing = false;
    this.stats = {
      processed: 0,
      triggered: 0,
      startTime: Date.now(),
    };

    this.initDatabase();
    this.startProcessing();
  }

  async initDatabase() {
    try {
      const mongoURI =
        process.env.MONGO_URI || "mongodb://127.0.0.1:27017/alerts";
      await mongoose.connect(mongoURI);
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);
    }
  }

  startProcessing() {
    // Check alerts every 5 seconds
    setInterval(() => {
      this.processAlerts();
    }, 5000);

    console.log("✅ Alert worker started (checking every 5 seconds)");
  }

  async processAlerts() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Get all active alerts
      const activeAlerts = await Alert.find({
        isActive: true,
        userExplicitlyCreated: true,
      }).lean();

      if (activeAlerts.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Get unique symbols
      const symbols = [...new Set(activeAlerts.map((a) => a.symbol))];

      // Get current prices from Redis (FAST - no API calls)
      const prices = await this.priceService.getPrices(symbols);

      // Check each alert
      for (const alert of activeAlerts) {
        const priceData = prices[alert.symbol];
        if (!priceData) continue;

        const shouldTrigger = this.checkAlert(alert, priceData);

        if (shouldTrigger) {
          await this.triggerAlert(alert, priceData);
          this.stats.triggered++;
        }

        this.stats.processed++;
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `⚡ Processed ${activeAlerts.length} alerts in ${processingTime}ms`
      );
    } catch (error) {
      console.error("❌ Error processing alerts:", error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  checkAlert(alert, priceData) {
    try {
      const currentPrice = priceData.price;
      const basePrice = alert.basePrice;

      // Price alert
      if (alert.targetType === "price") {
        if (alert.direction === ">" && currentPrice >= alert.targetValue) {
          return true;
        }
        if (alert.direction === "<" && currentPrice <= alert.targetValue) {
          return true;
        }
      }

      // Percentage alert
      if (alert.targetType === "percentage") {
        const change = ((currentPrice - basePrice) / basePrice) * 100;

        if (alert.direction === ">" && change >= alert.targetValue) {
          return true;
        }
        if (alert.direction === "<" && change <= -alert.targetValue) {
          return true;
        }
        if (alert.direction === "<>" && Math.abs(change) >= alert.targetValue) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async triggerAlert(alert, priceData) {
    try {
      console.log(`🚨 ALERT TRIGGERED: ${alert.symbol} @ ${priceData.price}`);

      // Send email
      if (alert.email) {
        try {
          await sendAlertEmail(alert.email, alert, priceData, {});
          console.log(`📧 Email sent to ${alert.email}`);
        } catch (error) {
          console.error("❌ Email failed:", error.message);
        }
      }

      // Send Telegram
      try {
        await sendAlertNotification(alert, { currentPrice: priceData.price });
        console.log(`📱 Telegram notification sent`);
      } catch (error) {
        console.error("❌ Telegram failed:", error.message);
      }

      // Update alert
      await Alert.findByIdAndUpdate(alert._id, {
        lastTriggered: new Date(),
      });
    } catch (error) {
      console.error("❌ Error triggering alert:", error.message);
    }
  }

  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      processed: this.stats.processed,
      triggered: this.stats.triggered,
      uptime: Math.floor(uptime / 1000) + "s",
      alertsPerSec: (this.stats.processed / (uptime / 1000)).toFixed(2),
    };
  }
}

// Start worker
if (require.main === module) {
  const worker = new SimpleAlertWorker();

  // Log stats every 30 seconds
  setInterval(() => {
    const stats = worker.getStats();
    console.log(
      `📊 Stats: ${stats.processed} processed | ${stats.triggered} triggered | ${stats.alertsPerSec} alerts/sec`
    );
  }, 30000);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down worker...");
    mongoose.disconnect();
    process.exit(0);
  });
}

module.exports = SimpleAlertWorker;
