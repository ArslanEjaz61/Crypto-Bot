import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme, IconButton, Menu, MenuItem } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const theme = useTheme();
  const { connected } = useSocket();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

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

  return (
    <>
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
          <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
            {connected ? 'Connected' : 'Disconnected'}
          </Typography>
          
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
