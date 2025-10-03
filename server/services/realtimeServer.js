const { Server } = require('socket.io');
const { redisSubscriber, priceOps } = require('../config/redis');
const jwt = require('jsonwebtoken');

/**
 * Real-time Server for Frontend WebSocket Connections
 * 
 * This service:
 * 1. Creates a Socket.io server for frontend connections
 * 2. Subscribes to Redis "alerts" channel
 * 3. Forwards triggered alerts to connected frontend clients
 * 4. Streams live price updates to frontend
 * 5. Handles authentication for WebSocket connections
 */

class RealtimeServer {
  constructor(httpServer) {
    this.io = null;
    this.httpServer = httpServer;
    this.connectedClients = new Map();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      alertsSent: 0,
      priceUpdatesSent: 0,
      startTime: Date.now()
    };
  }

  /**
   * Initialize the Socket.io server
   */
  initialize() {
    console.log('🚀 Initializing Real-time Server...');
    
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    // Authentication middleware (optional)
    this.io.use((socket, next) => {
      this.authenticateSocket(socket, next);
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Subscribe to Redis triggered alerts
    this.subscribeToTriggeredAlerts();

    // Start stats reporting
    setInterval(() => {
      this.printStats();
    }, 60000);

    console.log('✅ Real-time Server initialized');
  }

  /**
   * Authenticate WebSocket connection (optional)
   */
  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      // If no token provided, allow connection (for now)
      // You can enforce authentication by returning error here
      if (!token) {
        socket.userId = 'anonymous';
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      
      next();
    } catch (error) {
      // For now, allow connection even if token is invalid
      // You can enforce strict authentication by uncommenting next line
      // return next(new Error('Authentication failed'));
      socket.userId = 'anonymous';
      next();
    }
  }

  /**
   * Handle new client connection
   */
  handleConnection(socket) {
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    
    const clientId = socket.id;
    const userId = socket.userId || 'anonymous';
    
    console.log(`✅ Client connected: ${clientId} (User: ${userId})`);
    
    // Store client info
    this.connectedClients.set(clientId, {
      socket,
      userId,
      connectedAt: new Date(),
      subscribedSymbols: new Set()
    });

    // Send connection confirmation
    socket.emit('connection-success', {
      message: 'Connected to real-time alert system',
      clientId: clientId,
      timestamp: Date.now()
    });

    // Handle subscription to specific symbols
    socket.on('subscribe-symbol', (symbol) => {
      this.handleSymbolSubscription(socket, symbol);
    });

    // Handle unsubscription from symbols
    socket.on('unsubscribe-symbol', (symbol) => {
      this.handleSymbolUnsubscription(socket, symbol);
    });

    // Handle request for latest prices
    socket.on('request-prices', async (symbols) => {
      await this.sendLatestPrices(socket, symbols);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${clientId}:`, error.message);
    });
  }

  /**
   * Handle symbol subscription
   */
  handleSymbolSubscription(socket, symbol) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscribedSymbols.add(symbol);
      console.log(`📡 Client ${socket.id} subscribed to ${symbol}`);
      
      // Send latest price for subscribed symbol
      this.sendLatestPrices(socket, [symbol]);
    }
  }

  /**
   * Handle symbol unsubscription
   */
  handleSymbolUnsubscription(socket, symbol) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscribedSymbols.delete(symbol);
      console.log(`📡 Client ${socket.id} unsubscribed from ${symbol}`);
    }
  }

  /**
   * Send latest prices to client
   */
  async sendLatestPrices(socket, symbols = []) {
    try {
      if (symbols.length === 0) {
        // Send all prices
        const allPrices = await priceOps.getAllPrices();
        socket.emit('price-update', allPrices);
      } else {
        // Send specific symbols
        const prices = {};
        for (const symbol of symbols) {
          const price = await priceOps.getPrice(symbol);
          if (price !== null) {
            prices[symbol] = price;
          }
        }
        socket.emit('price-update', prices);
      }
    } catch (error) {
      console.error('❌ Error sending latest prices:', error.message);
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(socket) {
    this.stats.activeConnections--;
    
    const clientId = socket.id;
    this.connectedClients.delete(clientId);
    
    console.log(`⚠️ Client disconnected: ${clientId}`);
    console.log(`📊 Active connections: ${this.stats.activeConnections}`);
  }

  /**
   * Subscribe to Redis triggered alerts channel
   */
  async subscribeToTriggeredAlerts() {
    try {
      // Create a separate subscriber for alerts
      const Redis = require('ioredis');
      const alertSubscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      });

      await alertSubscriber.subscribe('alerts', (err, count) => {
        if (err) {
          console.error('❌ Error subscribing to alerts channel:', err.message);
          return;
        }
        console.log(`✅ Subscribed to alerts channel`);
      });

      alertSubscriber.on('message', (channel, message) => {
        if (channel === 'alerts') {
          this.broadcastTriggeredAlert(message);
        }
      });

      console.log('✅ Listening for triggered alerts from Redis');
    } catch (error) {
      console.error('❌ Error subscribing to triggered alerts:', error.message);
    }
  }

  /**
   * Broadcast triggered alert to all connected clients
   */
  broadcastTriggeredAlert(message) {
    try {
      const alertData = JSON.parse(message);
      this.stats.alertsSent++;
      
      console.log(`📢 Broadcasting alert for ${alertData.symbol} to ${this.stats.activeConnections} clients`);
      
      // Broadcast to all connected clients
      this.io.emit('triggered-alert', {
        ...alertData,
        timestamp: Date.now()
      });

      // Also emit with the old event name for backward compatibility
      this.io.emit('triggered-alert-created', {
        triggeredAlert: alertData.triggeredAlert || alertData,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error broadcasting alert:', error.message);
    }
  }

  /**
   * Broadcast price update to subscribed clients
   */
  broadcastPriceUpdate(symbol, priceData) {
    try {
      this.stats.priceUpdatesSent++;
      
      // Send to all clients subscribed to this symbol
      this.connectedClients.forEach((client) => {
        if (client.subscribedSymbols.has(symbol) || client.subscribedSymbols.has('*')) {
          client.socket.emit('price-update', {
            symbol,
            ...priceData,
            timestamp: Date.now()
          });
        }
      });
    } catch (error) {
      console.error('❌ Error broadcasting price update:', error.message);
    }
  }

  /**
   * Get Socket.io instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Print service statistics
   */
  printStats() {
    const uptime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n📊 === Real-time Server Stats ===');
    console.log(`⏱️  Uptime: ${uptime} minutes`);
    console.log(`👥 Total connections: ${this.stats.totalConnections}`);
    console.log(`✅ Active connections: ${this.stats.activeConnections}`);
    console.log(`🚨 Alerts sent: ${this.stats.alertsSent}`);
    console.log(`📊 Price updates sent: ${this.stats.priceUpdatesSent}`);
    console.log('==================================\n');
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown() {
    console.log('🛑 Shutting down Real-time Server...');
    
    // Notify all clients
    this.io.emit('server-shutdown', {
      message: 'Server is shutting down',
      timestamp: Date.now()
    });

    // Close all connections
    this.io.close();
    
    this.printStats();
    console.log('✅ Real-time Server stopped');
  }
}

module.exports = RealtimeServer;

