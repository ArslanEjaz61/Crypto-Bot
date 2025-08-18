import React from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useSocket } from '../context/SocketContext';

const Header = () => {
  const theme = useTheme();
  const { connected } = useSocket();

  return (
    <AppBar position="sticky" sx={{ backgroundColor: theme.palette.background.paper }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 28, color: theme.palette.primary.main, mr: 1 }} />
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
        <Typography variant="body2" color="textSecondary">
          {connected ? 'Connected' : 'Disconnected'}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
