import React from 'react';
import { Button, CircularProgress, Box } from '@mui/material';

const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  loadingText = 'Loading...', 
  size = 'small',
  ...props 
}) => {
  return (
    <Button
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} color="inherit" />
          {loadingText}
        </Box>
      ) : (
        children
      )}
    </Button>
  );
};

export default LoadingButton;
