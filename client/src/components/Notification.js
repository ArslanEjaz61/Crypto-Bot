import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSocket } from '../context/SocketContext';

const Notification = () => {
  const { notification, hideNotification } = useSocket();
  
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideNotification();
  };

  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={handleClose} 
        severity={notification.type} 
        variant="filled"
        sx={{ width: '100%' }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default Notification;
