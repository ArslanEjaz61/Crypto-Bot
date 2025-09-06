import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box
} from '@mui/material';

const ConfirmDialog = ({ 
  open, 
  title, 
  content, 
  onConfirm, 
  onCancel, 
  confirmButtonProps = {},
  cancelButtonProps = {},
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel'
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {typeof content === 'string' ? (
          <DialogContentText id="confirm-dialog-description">
            {content}
          </DialogContentText>
        ) : (
          <Box id="confirm-dialog-description">
            {content}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onCancel} 
          color="primary"
          {...cancelButtonProps}
        >
          {cancelButtonText}
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained" 
          autoFocus
          {...confirmButtonProps}
        >
          {confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
