const WebSocket = require('ws');
const { priceOps } = require('../config/redis');

/**
 * Binance WebSocket Service
 * 
 * Connects to Binance WebSocket API and streams real-time price data
 * Uses miniTicker@arr stream for all trading pairs (most efficient)
 * 
 * This service:
 * 1. Connects to Binance WebSocket (wss://stream.binance.com:9443/ws/!miniTicker@arr)
 * 2. Receives price updates for ALL symbols
 * 3. Saves latest prices to Redis
 * 4. Publishes updates to Redis pub/sub for worker processing
 */

class BinanceWebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.pingInterval = null;
    this.isConnected = false;
    this.messageCount = 0;
    this.startTime = Date.now();
    this.stats = {
      messagesReceived: 0,
      pricesSaved: 0,
      errors: 0,
      lastUpdate: null
    };
  }

  /**
   * Start the WebSocket connection
   */
  start() {
    console.log('🚀 Starting Binance WebSocket Service...');
    this.connect();
    
    // Start stats reporting every 60 seconds
    setInterval(() => {
      this.printStats();
    }, 60000);
  }

  /**
   * Connect to Binance WebSocket
   */
  connect() {
    try {
      const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
      
      console.log(`📡 Connecting to Binance WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.onOpen();
      });

      this.ws.on('message', (data) => {
        this.onMessage(data);
      });

      this.ws.on('error', (error) => {
        this.onError(error);
      });

      this.ws.on('close', () => {
        this.onClose();
      });

      this.ws.on('ping', () => {
        this.ws.pong();
      });

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  onOpen() {
    console.log('✅ Binance WebSocket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Start keepalive ping
    this.startPingInterval();
  }

  /**
   * Handle incoming WebSocket messages
   */
  async onMessage(data) {
    try {
      this.stats.messagesReceived++;
      
      const tickers = JSON.parse(data);
      
      // Binance sends array of all tickers
      if (Array.isArray(tickers)) {
        // Process in batches for better performance
        const batchSize = 50;
        for (let i = 0; i < tickers.length; i += batchSize) {
          const batch = tickers.slice(i, i + batchSize);
          await this.processBatch(batch);
        }
      }
      
      this.stats.lastUpdate = new Date().toISOString();
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Error processing WebSocket message:', error.message);
    }
  }

  /**
   * Process batch of ticker updates
   */
  async processBatch(tickers) {
    const promises = tickers.map(ticker => this.processTicker(ticker));
    await Promise.allSettled(promises);
  }

  /**
   * Process individual ticker update
   */
  async processTicker(ticker) {
    try {
      const {
        s: symbol,           // Symbol (e.g., BTCUSDT)
        c: closePrice,       // Close price
        o: openPrice,        // Open price
        h: highPrice,        // High price
        l: lowPrice,         // Low price
        v: volume,           // Volume
        q: quoteVolume,      // Quote volume
      } = ticker;

      // Only process USDT pairs (can be configured)
      if (!symbol.endsWith('USDT')) {
        return;
      }

      const price = parseFloat(closePrice);
      const open = parseFloat(openPrice);
      
      // Calculate price change
      const priceChange = price - open;
      const priceChangePercent = open !== 0 ? (priceChange / open) * 100 : 0;

      // Save to Redis
      const success = await priceOps.savePrice(symbol, price);
      
      if (success) {
        this.stats.pricesSaved++;
        
        // Publish price update to Redis pub/sub
        await priceOps.publishPriceUpdate(symbol, {
          price,
          open: parseFloat(openPrice),
          high: parseFloat(highPrice),
          low: parseFloat(lowPrice),
          volume: parseFloat(volume),
          quoteVolume: parseFloat(quoteVolume),
          priceChange,
          priceChangePercent,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Silent error - too many tickers to log every error
      this.stats.errors++;
    }
  }

  /**
   * Handle WebSocket error
   */
  onError(error) {
    console.error('❌ Binance WebSocket error:', error.message);
    this.stats.errors++;
  }

  /**
   * Handle WebSocket close event
   */
  onClose() {
    console.log('⚠️ Binance WebSocket disconnected');
    this.isConnected = false;
    this.stopPingInterval();
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Please restart the service.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`⏳ Reconnecting in ${delay / 1000} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start keepalive ping interval
   */
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop keepalive ping interval
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Print service statistics
   */
  printStats() {
    const uptime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
    const messagesPerMin = (this.stats.messagesReceived / (uptime || 1)).toFixed(2);
    
    console.log('\n📊 === Binance WebSocket Stats ===');
    console.log(`✅ Connected: ${this.isConnected}`);
    console.log(`⏱️  Uptime: ${uptime} minutes`);
    console.log(`📨 Messages received: ${this.stats.messagesReceived}`);
    console.log(`💾 Prices saved: ${this.stats.pricesSaved}`);
    console.log(`⚡ Messages/min: ${messagesPerMin}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`🕐 Last update: ${this.stats.lastUpdate || 'N/A'}`);
    console.log('===================================\n');
  }

  /**
   * Gracefully shutdown the service
   */
  shutdown() {
    console.log('🛑 Shutting down Binance WebSocket Service...');
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.printStats();
    console.log('✅ Binance WebSocket Service stopped');
  }
}

// Create singleton instance
const binanceWebSocketService = new BinanceWebSocketService();

// Handle graceful shutdown
process.on('SIGINT', () => {
  binanceWebSocketService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  binanceWebSocketService.shutdown();
  process.exit(0);
});

module.exports = binanceWebSocketService;

