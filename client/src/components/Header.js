import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme, IconButton, Menu, MenuItem, Button, Badge, Popover, Chip } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import AlertIcon from '@mui/icons-material/NotificationImportant';
import MarkAsUnreadIcon from '@mui/icons-material/MarkAsUnread';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Header = () => {
  const theme = useTheme();
  const { connected } = useSocket();
  const { user, logout } = useAuth();
  const { createAlert } = useAlert();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [notificationList, setNotificationList] = useState([]);

  const handleOpenUserMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate('/login');
  };

  const handleCreateNew = () => {
    // Open create new alert dialog or navigate to create page
    // For now, we'll just trigger the sidebar's create alert function
    createAlert({
      symbol: 'BTCUSDT',
      direction: '>',
      targetType: 'percentage',
      targetValue: 1,
      trackingMode: 'current',
      intervalMinutes: 60
    });
  };

  const handleOpenNotifications = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotificationAnchorEl(null);
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const response = await axios.get(`${baseUrl}/api/notifications?limit=10`);
      const data = response.data;
      
      if (data.notifications) {
        setNotificationList(data.notifications);
        setNotificationCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      await axios.put(`${baseUrl}/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotificationList(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
      
      // Update count
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      await axios.delete(`${baseUrl}/api/notifications/${notificationId}`);
      
      // Update local state
      const deletedNotification = notificationList.find(n => n._id === notificationId);
      setNotificationList(prev => prev.filter(notif => notif._id !== notificationId));
      
      // Update count if deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setNotificationCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      await axios.put(`${baseUrl}/api/notifications/read-all`);
      
      // Update local state
      setNotificationList(prev => 
        prev.map(notif => ({ ...notif, isRead: true, readAt: new Date() }))
      );
      setNotificationCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
    
    // Set up periodic refresh
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (connected) {
      // Re-fetch notifications when we get a new notification event
      fetchNotifications();
    }
  }, [connected]);

  return (
    <>
      <AppBar position="sticky" sx={{ backgroundColor: theme.palette.background.paper }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h5" component="h1" fontWeight="bold">
              Binance Alerts
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          
          {/* Connection status indicator */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: connected ? theme.palette.success.main : theme.palette.error.main,
              borderRadius: '50%',
              width: 10,
              height: 10,
              mr: 1
            }}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
            {connected ? 'Connected' : 'Disconnected'}
          </Typography>
          
          {/* Alert Notifications Bell */}
          <IconButton 
            color="inherit" 
            onClick={handleOpenNotifications}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={notificationCount} color="error">
              <AlertIcon sx={{ fontSize: 24, color: theme.palette.primary.main }} />
            </Badge>
          </IconButton>
          <Popover
            open={Boolean(notificationAnchorEl)}
            anchorEl={notificationAnchorEl}
            onClose={handleCloseNotifications}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ p: 2, width: 350, maxHeight: 500, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Alert Notifications</Typography>
                {notificationCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<MarkAsUnreadIcon />}
                    onClick={markAllAsRead}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Mark All Read
                  </Button>
                )}
              </Box>
              
              {notificationList.length > 0 ? (
                notificationList.map((notification) => (
                  <Box key={notification._id} sx={{ 
                    p: 1.5, 
                    mb: 1.5, 
                    borderRadius: 1,
                    bgcolor: notification.isRead ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                    borderLeft: `3px solid ${notification.isRead ? 'transparent' : theme.palette.primary.main}`,
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => !notification.isRead && markAsRead(notification._id)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Chip
                            label={notification.symbol}
                            size="small"
                            color="primary"
                            sx={{ mr: 1, fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={notification.type}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: notification.isRead ? 'normal' : 'bold',
                            mb: 0.5,
                            lineHeight: 1.3
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                        
                        {notification.triggerData && (
                          <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                            Price: ${notification.triggerData.currentPrice?.toFixed(4) || 'N/A'}
                            {notification.triggerData.priceChangePercent && (
                              <span style={{ marginLeft: '8px' }}>
                                Change: {notification.triggerData.priceChangePercent.toFixed(2)}%
                              </span>
                            )}
                          </Box>
                        )}
                      </Box>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        sx={{ ml: 1, p: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No notifications
                </Typography>
              )}
            </Box>
          </Popover>
          
          {/* User menu */}
          {user && (
            <>
              <IconButton onClick={handleOpenUserMenu} color="inherit">
                <AccountCircleIcon />
              </IconButton>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user.username}
              </Typography>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseUserMenu}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
