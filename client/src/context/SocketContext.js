import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAlert } from './AlertContext';
import { useCrypto } from './CryptoContext';

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'info' });
  
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
      showNotification(`Alert triggered: ${data.symbol} at ${data.price}`, 'info');
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
  const showNotification = (message, type = 'info') => {
    setNotification({ open: true, message, type });

    // Auto hide after 5 seconds
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 5000);
  };

  // Hide notification
  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <SocketContext.Provider value={{ socket, connected, notification, showNotification, hideNotification }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketProvider;
