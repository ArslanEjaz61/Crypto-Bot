import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    type: "info",
  });
  const [notifications, setNotifications] = useState([]);
  const [alertNotifications, setAlertNotifications] = useState([]);

  // Show notification
  const showNotification = (
    message,
    type = "info",
    isAlertTriggered = false,
    alertData = null
  ) => {
    setNotification({ open: true, message, type });

    // Add to notifications list
    const newNotification = {
      id: Date.now().toString(),
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      isAlertTriggered: isAlertTriggered,
      alertData: alertData,
    };

    // Add to general notifications
    setNotifications((prev) => [newNotification, ...prev]);

    // Also add to alert notifications if it's a triggered alert
    if (isAlertTriggered) {
      setAlertNotifications((prev) => [newNotification, ...prev]);
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
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    setAlertNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setAlertNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notification,
        notifications,
        alertNotifications,
        showNotification,
        hideNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketProvider;
