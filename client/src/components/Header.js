import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme, IconButton, Menu, MenuItem, Button, Badge, Popover } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import AlertIcon from '@mui/icons-material/NotificationImportant';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const theme = useTheme();
  const { connected, alertNotifications } = useSocket();
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

  // Update notification count when new alert notifications arrive
  useEffect(() => {
    if (alertNotifications && alertNotifications.length > 0) {
      // Get unread count
      const unreadCount = alertNotifications.filter(notif => !notif.read).length;
      setNotificationCount(unreadCount);
      setNotificationList(alertNotifications);
    } else {
      // Reset if no alert notifications
      setNotificationCount(0);
      setNotificationList([]);
    }
  }, [alertNotifications]);

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
          
          {/* New Alert Button */}
          <Button
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{ 
              mr: 2,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 'medium',
              px: 2
            }}
          >
            New Alert
          </Button>
          
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
            <Box sx={{ p: 2, width: 300, maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Alert Notifications</Typography>
              {notificationList.length > 0 ? (
                notificationList.map((notification, index) => (
                  <Box key={index} sx={{ 
                    p: 1, 
                    mb: 1, 
                    borderRadius: 1,
                    bgcolor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                    borderLeft: `3px solid ${notification.read ? 'transparent' : theme.palette.primary.main}`
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                      {notification.message}
                    </Typography>
                    {notification.timestamp && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">No notifications</Typography>
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
