/**
 * Auto-Sync Configuration
 * Configure how your project syncs with Binance trading pairs
 */

module.exports = {
  // Enable/disable auto-sync service
  enabled: true,
  
  // Sync interval in minutes (how often to check for new/delisted pairs)
  syncIntervalMinutes: 5,
  
  // Auto-sync settings
  settings: {
    // Automatically add new USDT pairs when listed on Binance
    autoAddNewPairs: true,
    
    // Automatically remove delisted pairs from database
    autoRemoveDelistedPairs: true,
    
    // Update existing pairs with latest market data
    autoUpdateExistingPairs: true,
    
    // Minimum price threshold for new pairs (avoid test/invalid pairs)
    minPriceThreshold: 0.00000001,
    
    // Maximum pairs to process in one batch (performance control)
    maxBatchSize: 100,
    
    // Log detailed sync information
    verboseLogging: true
  },
  
  // Filters for which pairs to include
  filters: {
    // Only include USDT pairs
    usdtOnly: true,
    
    // Only include spot trading pairs
    spotTradingOnly: true,
    
    // Exclude leveraged tokens (UP/DOWN, BULL/BEAR)
    excludeLeveragedTokens: true,
    
    // Minimum 24h volume threshold (0 = no limit)
    minVolume24h: 0,
    
    // Custom symbol exclusions (pairs to never add)
    excludedSymbols: [
      // Add any specific pairs you want to exclude
      // Example: 'TESTUSDT', 'DEBUGUSDT'
    ]
  },
  
  // Notification settings
  notifications: {
    // Notify when new pairs are added
    notifyOnNewPairs: true,
    
    // Notify when pairs are delisted
    notifyOnDelistedPairs: true,
    
    // Send notifications via WebSocket to connected clients
    webSocketNotifications: true,
    
    // Log notifications to console
    consoleNotifications: true
  },
  
  // Error handling
  errorHandling: {
    // Retry failed operations
    retryFailedOperations: true,
    
    // Maximum retries for failed operations
    maxRetries: 3,
    
    // Delay between retries (seconds)
    retryDelaySeconds: 5,
    
    // Continue on errors (don't stop sync service)
    continueOnError: true
  },
  
  // Performance settings
  performance: {
    // Timeout for Binance API requests (milliseconds)
    apiTimeout: 30000,
    
    // Maximum concurrent database operations
    maxConcurrentOps: 10,
    
    // Enable caching for API responses
    enableCaching: true,
    
    // Cache duration (minutes)
    cacheDurationMinutes: 2
  },
  
  // Development/debugging
  development: {
    // Dry run mode (don't actually modify database)
    dryRun: false,
    
    // Test mode (use smaller dataset)
    testMode: false,
    
    // Force sync even if no changes detected
    forceSyncOnStart: false,
    
    // Mock Binance API responses (for testing)
    mockApiResponses: false
  }
};
