import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme, Button, Dialog, DialogContent } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import { useSocket } from '../context/SocketContext';
import CreateAlertForm from './CreateAlertForm';
import eventBus from '../services/eventBus';

const Header = () => {
  const theme = useTheme();
  const { connected } = useSocket();
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  
  const handleOpenAlertDialog = () => {
    setOpenAlertDialog(true);
  };

  const handleCloseAlertDialog = () => {
    setOpenAlertDialog(false);
    
    // Emit an event to navigate to alerts tab
    eventBus.emit('NAVIGATE_TO_ALERTS_TAB');
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
          
          {/* Add New Alert Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddAlertIcon />}
            onClick={handleOpenAlertDialog}
            sx={{ mr: 2 }}
          >
            Add New Alert
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
          <Typography variant="body2" color="textSecondary">
            {connected ? 'Connected' : 'Disconnected'}
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Alert Dialog */}
      <Dialog
        open={openAlertDialog}
        onClose={handleCloseAlertDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <CreateAlertForm onSuccess={handleCloseAlertDialog} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
