/**
 * Ultra-Fast Real-Time Notification Service
 * Provides instant browser notifications, sound alerts, and visual indicators
 */

class NotificationService {
  constructor() {
    // Notification configuration
    this.isEnabled = false;
    this.hasPermission = false;
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    
    // Audio configuration
    this.audioContext = null;
    this.audioBuffers = new Map();
    this.soundFiles = {
      alert: '/sounds/alert.mp3',
      success: '/sounds/success.mp3',
      warning: '/sounds/warning.mp3',
      error: '/sounds/error.mp3'
    };
    
    // Visual notification queue
    this.notificationQueue = [];
    this.maxQueueSize = 50;
    this.displayDuration = 5000; // 5 seconds
    
    // Performance metrics
    this.metrics = {
      notificationsSent: 0,
      notificationsClicked: 0,
      soundsPlayed: 0,
      averageDeliveryTime: 0,
      totalDeliveryTime: 0
    };
    
    // Notification channels
    this.channels = new Map();
    this.subscribers = new Map();
    
    // Rate limiting
    this.rateLimits = new Map(); // type -> last sent timestamp
    this.rateLimitDelay = 1000; // 1 second minimum between same type
    
    this.initialize();
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    console.log('🚀 NotificationService initializing...');
    
    try {
      // Request notification permission
      await this.requestPermission();
      
      // Initialize audio context
      await this.initializeAudio();
      
      // Setup service worker for background notifications
      await this.setupServiceWorker();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      console.log('✅ NotificationService initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      this.isEnabled = true;
      return true;
    }
    
    if (Notification.permission === 'denied') {
      console.warn('⚠️ Notification permission denied');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      this.isEnabled = this.hasPermission;
      
      if (this.hasPermission) {
        console.log('✅ Notification permission granted');
      } else {
        console.warn('⚠️ Notification permission not granted');
      }
      
      return this.hasPermission;
      
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Initialize Web Audio API for ultra-fast sound playback
   */
  async initializeAudio() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Load sound files
      await this.loadSoundFiles();
      
      console.log('✅ Audio system initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      this.audioContext = null;
    }
  }

  /**
   * Load and decode sound files
   */
  async loadSoundFiles() {
    const loadPromises = Object.entries(this.soundFiles).map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        this.audioBuffers.set(name, audioBuffer);
        console.log(`✅ Loaded sound: ${name}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to load sound ${name}:`, error);
        
        // Create fallback beep sound
        this.audioBuffers.set(name, this.createBeepSound());
      }
    });
    
    await Promise.allSettled(loadPromises);
  }

  /**
   * Create synthetic beep sound as fallback
   */
  createBeepSound() {
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-3 * t);
    }
    
    return buffer;
  }

  /**
   * Setup service worker for background notifications
   */
  async setupServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/notification-worker.js');
      console.log('✅ Notification service worker registered');
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to register notification service worker:', error);
    }
  }

  /**
   * Send ultra-fast notification
   */
  async sendNotification(options) {
    const startTime = performance.now();
    
    try {
      // Validate options
      if (!options.title) {
        throw new Error('Notification title is required');
      }
      
      // Apply rate limiting
      if (this.isRateLimited(options.type)) {
        console.log(`🚫 Rate limited: ${options.type}`);
        return null;
      }
      
      // Create notification data
      const notificationData = {
        id: this.generateNotificationId(),
        title: options.title,
        body: options.body || '',
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        tag: options.tag || options.type,
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: Date.now(),
        type: options.type || 'info'
      };
      
      // Send browser notification
      let browserNotification = null;
      if (this.hasPermission && !options.silent) {
        browserNotification = await this.sendBrowserNotification(notificationData);
      }
      
      // Play sound
      if (this.soundEnabled && !options.silent) {
        this.playSound(options.sound || options.type || 'alert');
      }
      
      // Trigger vibration
      if (this.vibrationEnabled && navigator.vibrate) {
        const pattern = options.vibration || [200, 100, 200];
        navigator.vibrate(pattern);
      }
      
      // Add to visual queue
      this.addToVisualQueue(notificationData);
      
      // Notify subscribers
      this.notifySubscribers(notificationData);
      
      // Update metrics
      const deliveryTime = performance.now() - startTime;
      this.updateMetrics(deliveryTime);
      
      // Update rate limiting
      this.updateRateLimit(options.type);
      
      console.log(`🚨 Notification sent in ${deliveryTime.toFixed(2)}ms:`, options.title);
      
      return {
        id: notificationData.id,
        browserNotification,
        deliveryTime
      };
      
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send browser notification
   */
  async sendBrowserNotification(data) {
    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        requireInteraction: data.requireInteraction,
        silent: data.silent
      });
      
      // Setup event handlers
      notification.onclick = () => {
        this.handleNotificationClick(data);
        notification.close();
      };
      
      notification.onclose = () => {
        this.handleNotificationClose(data);
      };
      
      notification.onerror = (error) => {
        console.error('❌ Notification error:', error);
      };
      
      // Auto-close after duration
      setTimeout(() => {
        notification.close();
      }, this.displayDuration);
      
      this.metrics.notificationsSent++;
      return notification;
      
    } catch (error) {
      console.error('❌ Failed to create browser notification:', error);
      return null;
    }
  }

  /**
   * Play sound with ultra-low latency
   */
  playSound(soundName) {
    if (!this.audioContext || !this.soundEnabled) return;
    
    try {
      const audioBuffer = this.audioBuffers.get(soundName) || this.audioBuffers.get('alert');
      if (!audioBuffer) return;
      
      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Connect to destination
      source.connect(this.audioContext.destination);
      
      // Play immediately
      source.start(0);
      
      this.metrics.soundsPlayed++;
      
    } catch (error) {
      console.error('❌ Failed to play sound:', error);
    }
  }

  /**
   * Add notification to visual queue
   */
  addToVisualQueue(notification) {
    // Add to queue
    this.notificationQueue.unshift(notification);
    
    // Limit queue size
    if (this.notificationQueue.length > this.maxQueueSize) {
      this.notificationQueue = this.notificationQueue.slice(0, this.maxQueueSize);
    }
    
    // Notify visual components
    this.notifyChannel('visual', notification);
  }

  /**
   * Subscribe to notification events
   */
  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel).add(callback);
    
    console.log(`📡 Subscribed to notifications: ${channel}`);
    
    // Return unsubscribe function
    return () => this.unsubscribe(channel, callback);
  }

  /**
   * Unsubscribe from notification events
   */
  unsubscribe(channel, callback) {
    const channelSubscribers = this.subscribers.get(channel);
    if (channelSubscribers) {
      channelSubscribers.delete(callback);
      
      if (channelSubscribers.size === 0) {
        this.subscribers.delete(channel);
      }
    }
  }

  /**
   * Notify channel subscribers
   */
  notifyChannel(channel, data) {
    const subscribers = this.subscribers.get(channel);
    if (!subscribers) return;
    
    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error in notification subscriber for ${channel}:`, error);
      }
    });
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(notification) {
    // Notify all channels
    this.subscribers.forEach((subscribers, channel) => {
      this.notifyChannel(channel, notification);
    });
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notification) {
    console.log('👆 Notification clicked:', notification.title);
    
    this.metrics.notificationsClicked++;
    
    // Focus window if minimized
    if (window.focus) {
      window.focus();
    }
    
    // Notify click subscribers
    this.notifyChannel('click', notification);
    
    // Handle specific actions based on notification type
    if (notification.data.action) {
      this.handleNotificationAction(notification.data.action, notification);
    }
  }

  /**
   * Handle notification close
   */
  handleNotificationClose(notification) {
    console.log('❌ Notification closed:', notification.title);
    this.notifyChannel('close', notification);
  }

  /**
   * Handle notification action
   */
  handleNotificationAction(action, notification) {
    switch (action) {
      case 'view_alert':
        // Navigate to alert details
        this.notifyChannel('navigate', { path: `/alerts/${notification.data.alertId}` });
        break;
        
      case 'view_chart':
        // Navigate to chart
        this.notifyChannel('navigate', { path: `/chart/${notification.data.symbol}` });
        break;
        
      case 'dismiss_all':
        // Clear all notifications
        this.clearAll();
        break;
        
      default:
        console.log('Unknown notification action:', action);
    }
  }

  /**
   * Handle service worker messages
   */
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'NOTIFICATION_CLICK':
        this.handleNotificationClick(data.notification);
        break;
        
      case 'NOTIFICATION_CLOSE':
        this.handleNotificationClose(data.notification);
        break;
        
      default:
        console.log('Unknown service worker message:', data);
    }
  }

  /**
   * Check if notification type is rate limited
   */
  isRateLimited(type) {
    if (!type) return false;
    
    const lastSent = this.rateLimits.get(type);
    if (!lastSent) return false;
    
    return Date.now() - lastSent < this.rateLimitDelay;
  }

  /**
   * Update rate limiting
   */
  updateRateLimit(type) {
    if (type) {
      this.rateLimits.set(type, Date.now());
    }
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update performance metrics
   */
  updateMetrics(deliveryTime) {
    this.metrics.totalDeliveryTime += deliveryTime;
    this.metrics.averageDeliveryTime = 
      this.metrics.totalDeliveryTime / (this.metrics.notificationsSent || 1);
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const metrics = this.getMetrics();
      
      console.log('📊 Notification Performance:', {
        notificationsSent: metrics.notificationsSent,
        clickRate: `${metrics.clickRate.toFixed(1)}%`,
        averageDeliveryTime: `${metrics.averageDeliveryTime.toFixed(2)}ms`,
        soundsPlayed: metrics.soundsPlayed,
        queueSize: this.notificationQueue.length
      });
      
      // Reset counters for next interval
      this.metrics.notificationsSent = 0;
      this.metrics.notificationsClicked = 0;
      this.metrics.soundsPlayed = 0;
      this.metrics.totalDeliveryTime = 0;
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      clickRate: this.metrics.notificationsSent > 0 
        ? (this.metrics.notificationsClicked / this.metrics.notificationsSent) * 100 
        : 0,
      queueSize: this.notificationQueue.length,
      hasPermission: this.hasPermission,
      isEnabled: this.isEnabled,
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled
    };
  }

  /**
   * Get notification queue
   */
  getQueue() {
    return [...this.notificationQueue];
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notificationQueue = [];
    console.log('🧹 All notifications cleared');
  }

  /**
   * Enable/disable sounds
   */
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    console.log(`🔊 Sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable vibration
   */
  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled;
    console.log(`📳 Vibration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Test notification system
   */
  async test() {
    try {
      await this.sendNotification({
        title: '🚀 Notification Test',
        body: 'Ultra-fast notification system is working!',
        type: 'test',
        sound: 'success'
      });
      
      console.log('✅ Notification test completed');
      
    } catch (error) {
      console.error('❌ Notification test failed:', error);
    }
  }

  /**
   * Destroy notification service
   */
  destroy() {
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    // Clear all data structures
    this.audioBuffers.clear();
    this.notificationQueue = [];
    this.channels.clear();
    this.subscribers.clear();
    this.rateLimits.clear();
    
    console.log('🧹 NotificationService destroyed');
  }
}

// Singleton instance
export const notificationService = new NotificationService();
export default NotificationService;
