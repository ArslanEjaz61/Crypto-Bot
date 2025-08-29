import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAlert } from './AlertContext';
import { useCrypto } from './CryptoContext';

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'info' });
  const [notifications, setNotifications] = useState([]);
  const [alertNotifications, setAlertNotifications] = useState([]);
  
  const { loadAlerts } = useAlert();
  const { loadCryptos } = useCrypto();

  useEffect(() => {
    // Create socket connection with robust reconnection options
    const socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    // Set up event listeners with more detailed logging
    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Socket connected successfully');
      showNotification('Connected to server', 'success');
    });

    socketInstance.on('disconnect', (reason) => {
      setConnected(false);
      console.log(`Socket disconnected: ${reason}`);
    });
    
    socketInstance.on('connect_error', (error) => {
      setConnected(false);
      console.error('Socket connection error:', error.message);
      // Don't show errors repeatedly, only on first attempt
      if (!notification.open) {
        showNotification('Connection to server failed. Retrying...', 'error');
      }
    });
    
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect... (${attemptNumber})`);
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      setConnected(true);
      console.log(`Successfully reconnected after ${attemptNumber} attempts`);
      showNotification('Reconnected to server', 'success');
    });
    
    // Manual connection in case autoConnect fails
    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    socketInstance.on('alert-created', () => {
      loadAlerts();
      showNotification('New alert created', 'success');
    });

    socketInstance.on('alert-updated', () => {
      loadAlerts();
    });

    socketInstance.on('alert-deleted', () => {
      loadAlerts();
    });

    socketInstance.on('alert-triggered', (data) => {
      loadAlerts();
      const alertMessage = `Alert triggered: ${data.symbol} at ${data.price}`;
      showNotification(alertMessage, 'info', true, data);
    });

    socketInstance.on('crypto-updated', () => {
      loadCryptos();
    });

    setSocket(socketInstance);

    // Clean up
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [loadAlerts, loadCryptos]);

  // Show notification
  const showNotification = (message, type = 'info', isAlertTriggered = false, alertData = null) => {
    setNotification({ open: true, message, type });

    // Add to notifications list
    const newNotification = {
      id: Date.now().toString(),
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      isAlertTriggered: isAlertTriggered,
      alertData: alertData
    };
    
    // Add to general notifications
    setNotifications(prev => [newNotification, ...prev]);
    
    // Also add to alert notifications if it's a triggered alert
    if (isAlertTriggered) {
      setAlertNotifications(prev => [newNotification, ...prev]);
    }

    // Auto hide after 5 seconds
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 5000);
  };

  // Hide notification
  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };
  
  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
    
    setAlertNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  }, []);
  
  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setAlertNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      notification,
      notifications,
      alertNotifications,
      showNotification,
      hideNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketProvider;
