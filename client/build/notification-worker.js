/**
 * Service Worker for Background Notifications
 * Handles notifications when the app is not in focus
 */

const CACHE_NAME = 'crypto-alerts-v1';
const NOTIFICATION_TAG = 'crypto-alert';

// Install event
self.addEventListener('install', (event) => {
  console.log('📦 Notification service worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/icon-192x192.png',
        '/badge-72x72.png',
        '/sounds/alert.mp3',
        '/sounds/success.mp3',
        '/sounds/warning.mp3',
        '/sounds/error.mp3'
      ]).catch((error) => {
        console.warn('⚠️ Failed to cache some resources:', error);
      });
    })
  );
  
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Notification service worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Message event - receive notifications from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SHOW_NOTIFICATION':
      showNotification(data);
      break;
      
    case 'CLOSE_NOTIFICATION':
      closeNotification(data.tag || NOTIFICATION_TAG);
      break;
      
    case 'CLEAR_ALL_NOTIFICATIONS':
      clearAllNotifications();
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');
  
  let notificationData = {
    title: 'Crypto Alert',
    body: 'Price alert triggered',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  };
  
  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (error) {
      console.error('❌ Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(showNotification(notificationData));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = {
    title: event.notification.title,
    body: event.notification.body,
    tag: event.notification.tag,
    data: event.notification.data
  };
  
  // Handle different actions
  if (event.action) {
    handleNotificationAction(event.action, notificationData);
  } else {
    // Default click action - focus or open app
    event.waitUntil(focusOrOpenApp(notificationData));
  }
  
  // Notify main thread
  sendMessageToClients({
    type: 'NOTIFICATION_CLICK',
    notification: notificationData,
    action: event.action
  });
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification closed:', event.notification.tag);
  
  const notificationData = {
    title: event.notification.title,
    body: event.notification.body,
    tag: event.notification.tag,
    data: event.notification.data
  };
  
  // Notify main thread
  sendMessageToClients({
    type: 'NOTIFICATION_CLOSE',
    notification: notificationData
  });
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-alert-check') {
    console.log('🔄 Background sync: alert check');
    event.waitUntil(performBackgroundAlertCheck());
  }
});

/**
 * Show notification with enhanced options
 */
async function showNotification(data) {
  try {
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      tag: data.tag || NOTIFICATION_TAG,
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now()
    };
    
    // Add actions based on notification type
    if (data.type === 'alert') {
      options.actions = [
        {
          action: 'view',
          title: 'View Alert',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ];
    }
    
    await self.registration.showNotification(data.title, options);
    console.log('🚨 Background notification shown:', data.title);
    
  } catch (error) {
    console.error('❌ Failed to show notification:', error);
  }
}

/**
 * Close specific notification
 */
async function closeNotification(tag) {
  try {
    const notifications = await self.registration.getNotifications({ tag });
    notifications.forEach(notification => notification.close());
    
    console.log(`❌ Closed notifications with tag: ${tag}`);
    
  } catch (error) {
    console.error('❌ Failed to close notification:', error);
  }
}

/**
 * Clear all notifications
 */
async function clearAllNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications.forEach(notification => notification.close());
    
    console.log('🧹 All notifications cleared');
    
  } catch (error) {
    console.error('❌ Failed to clear notifications:', error);
  }
}

/**
 * Handle notification actions
 */
function handleNotificationAction(action, notificationData) {
  switch (action) {
    case 'view':
      focusOrOpenApp(notificationData, '/alerts');
      break;
      
    case 'dismiss':
      // Just close, no action needed
      break;
      
    case 'snooze':
      // Reschedule notification
      scheduleNotification(notificationData, 5 * 60 * 1000); // 5 minutes
      break;
      
    default:
      console.log('Unknown action:', action);
  }
}

/**
 * Focus existing app window or open new one
 */
async function focusOrOpenApp(notificationData, path = '/') {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Try to focus existing window
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        await client.focus();
        
        // Navigate if path specified
        if (path !== '/') {
          client.postMessage({
            type: 'NAVIGATE',
            path: path,
            data: notificationData.data
          });
        }
        
        return;
      }
    }
    
    // Open new window if no existing window found
    const url = `${self.location.origin}${path}`;
    await self.clients.openWindow(url);
    
  } catch (error) {
    console.error('❌ Failed to focus or open app:', error);
  }
}

/**
 * Send message to all clients
 */
async function sendMessageToClients(message) {
  try {
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage(message);
    });
    
  } catch (error) {
    console.error('❌ Failed to send message to clients:', error);
  }
}

/**
 * Schedule notification for later
 */
function scheduleNotification(notificationData, delay) {
  setTimeout(() => {
    showNotification({
      ...notificationData,
      title: `⏰ ${notificationData.title}`,
      body: `Snoozed: ${notificationData.body}`
    });
  }, delay);
}

/**
 * Perform background alert checking
 */
async function performBackgroundAlertCheck() {
  try {
    // This would typically fetch alert data from the server
    // and check conditions without the main app running
    
    console.log('🔍 Performing background alert check...');
    
    // Simulate alert check
    const alertData = await checkAlertsInBackground();
    
    if (alertData && alertData.length > 0) {
      // Show notifications for triggered alerts
      for (const alert of alertData) {
        await showNotification({
          title: `🚨 ${alert.symbol} Alert`,
          body: `Price: $${alert.price} (${alert.change}%)`,
          type: 'alert',
          data: {
            symbol: alert.symbol,
            price: alert.price,
            alertId: alert.id
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Background alert check failed:', error);
  }
}

/**
 * Check alerts in background (placeholder)
 */
async function checkAlertsInBackground() {
  // This would implement actual alert checking logic
  // For now, return empty array
  return [];
}

/**
 * Fetch with cache fallback
 */
async function fetchWithCache(url, options = {}) {
  try {
    // Try network first
    const response = await fetch(url, options);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(url, response.clone());
      return response;
    }
    
    // Fallback to cache on network failure
    return await caches.match(url);
    
  } catch (error) {
    console.warn('⚠️ Network failed, trying cache:', error);
    
    // Fallback to cache
    return await caches.match(url);
  }
}

// Performance monitoring
let performanceMetrics = {
  notificationsShown: 0,
  notificationsClicked: 0,
  backgroundSyncs: 0,
  errors: 0
};

// Log performance metrics every 5 minutes
setInterval(() => {
  console.log('📊 Service Worker Performance:', performanceMetrics);
  
  // Reset metrics
  performanceMetrics = {
    notificationsShown: 0,
    notificationsClicked: 0,
    backgroundSyncs: 0,
    errors: 0
  };
}, 5 * 60 * 1000);

console.log('🚀 Crypto Alerts Notification Service Worker loaded');
