import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

/**
 * Real-time Alerts Hook
 * 
 * This hook connects to the backend WebSocket server and:
 * 1. Receives real-time triggered alerts
 * 2. Receives live price updates
 * 3. Manages WebSocket connection lifecycle
 * 
 * Usage:
 * const { 
 *   triggeredAlerts, 
 *   latestAlert, 
 *   isConnected,
 *   subscribeToPrices,
 *   unsubscribeFromPrices
 * } = useRealtimeAlerts();
 */

const useRealtimeAlerts = () => {
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);
  const [latestPrices, setLatestPrices] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    console.log('🚀 Connecting to real-time alert system...');
    
    // Get auth token if available
    const token = localStorage.getItem('token');
    
    // Create Socket.io connection
    const socket = io(API_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts
    });

    socketRef.current = socket;

    // Connection successful
    socket.on('connect', () => {
      console.log('✅ Connected to real-time alert system');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    // Connection confirmation from server
    socket.on('connection-success', (data) => {
      console.log('✅ Connection confirmed:', data);
    });

    // Triggered alert received
    socket.on('triggered-alert', (data) => {
      console.log('🚨 Real-time alert received:', data);
      
      const alert = data.triggeredAlert || data;
      
      // Add to alerts list
      setTriggeredAlerts(prev => {
        // Avoid duplicates
        const exists = prev.some(a => a._id === alert._id);
        if (exists) return prev;
        return [alert, ...prev];
      });
      
      // Set as latest alert
      setLatestAlert(alert);
      
      // Show browser notification if permitted
      showBrowserNotification(alert);
    });

    // Backward compatibility with old event name
    socket.on('triggered-alert-created', (data) => {
      console.log('🚨 Real-time alert received (legacy):', data);
      
      const alert = data.triggeredAlert || data;
      
      setTriggeredAlerts(prev => {
        const exists = prev.some(a => a._id === alert._id);
        if (exists) return prev;
        return [alert, ...prev];
      });
      
      setLatestAlert(alert);
      showBrowserNotification(alert);
    });

    // Price update received
    socket.on('price-update', (data) => {
      setLatestPrices(prev => ({
        ...prev,
        ...data
      }));
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setConnectionError(error.message);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        setConnectionError('Failed to connect to real-time system. Please refresh the page.');
      }
    });

    // Disconnected
    socket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected from real-time system:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect manually
        socket.connect();
      }
    });

    // Server shutdown
    socket.on('server-shutdown', (data) => {
      console.log('🛑 Server is shutting down:', data.message);
      setConnectionError('Server is restarting...');
    });

    // Cleanup event (when old alerts are automatically removed)
    socket.on('triggered-alerts-cleanup', (data) => {
      console.log('🧹 Automatic cleanup performed:', data);
      
      if (data.isManual) {
        // Manual cleanup - clear all alerts
        setTriggeredAlerts([]);
        setLatestAlert(null);
      } else {
        // Automatic cleanup - remove old alerts only
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        setTriggeredAlerts(prev => 
          prev.filter(alert => 
            new Date(alert.createdAt) > twentyFourHoursAgo
          )
        );
      }
    });

    // Reconnection attempt
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`⏳ Reconnection attempt ${attemptNumber}...`);
    });

    // Reconnected successfully
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting from real-time system...');
      socket.disconnect();
    };
  }, []);

  /**
   * Subscribe to price updates for specific symbols
   */
  const subscribeToPrices = useCallback((symbols) => {
    if (!socketRef.current || !isConnected) {
      console.warn('⚠️ Cannot subscribe: not connected');
      return;
    }

    if (Array.isArray(symbols)) {
      symbols.forEach(symbol => {
        socketRef.current.emit('subscribe-symbol', symbol);
      });
    } else {
      socketRef.current.emit('subscribe-symbol', symbols);
    }
  }, [isConnected]);

  /**
   * Unsubscribe from price updates
   */
  const unsubscribeFromPrices = useCallback((symbols) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    if (Array.isArray(symbols)) {
      symbols.forEach(symbol => {
        socketRef.current.emit('unsubscribe-symbol', symbol);
      });
    } else {
      socketRef.current.emit('unsubscribe-symbol', symbols);
    }
  }, [isConnected]);

  /**
   * Request latest prices for symbols
   */
  const requestPrices = useCallback((symbols = []) => {
    if (!socketRef.current || !isConnected) {
      console.warn('⚠️ Cannot request prices: not connected');
      return;
    }

    socketRef.current.emit('request-prices', symbols);
  }, [isConnected]);

  /**
   * Show browser notification for triggered alert
   */
  const showBrowserNotification = (alert) => {
    // Check if notifications are supported and permitted
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const emoji = alert.direction === '>' ? '📈' : '📉';
      const notification = new Notification(`${emoji} Alert Triggered!`, {
        body: `${alert.symbol}: $${alert.triggeredPrice || alert.price}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert._id,
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showBrowserNotification(alert);
        }
      });
    }
  };

  /**
   * Clear all triggered alerts
   */
  const clearAlerts = useCallback(() => {
    setTriggeredAlerts([]);
    setLatestAlert(null);
  }, []);

  return {
    // State
    triggeredAlerts,
    latestAlert,
    latestPrices,
    isConnected,
    connectionError,
    
    // Actions
    subscribeToPrices,
    unsubscribeFromPrices,
    requestPrices,
    clearAlerts,
    
    // Socket reference (for advanced usage)
    socket: socketRef.current
  };
};

export default useRealtimeAlerts;

