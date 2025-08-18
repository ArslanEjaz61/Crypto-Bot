import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormHelperText,
  InputAdornment,
  FormControlLabel,
  Switch
} from '@mui/material';
import { useAlert } from '../context/AlertContext';
import { useSocket } from '../context/SocketContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';

const EditAlertDialog = ({ alert, open, onClose }) => {
  const { updateAlert } = useAlert();
  const { showNotification } = useSocket();

  // Form state
  const [formValues, setFormValues] = useState({
    symbol: '',
    direction: '',
    targetType: '',
    targetValue: '',
    trackingMode: '',
    intervalMinutes: 0,
    volumeChangeRequired: 0,
    alertTime: null,
    isActive: true,
    comment: '',
    email: ''
  });

  // Form errors
  const [errors, setErrors] = useState({});

  // Initialize form with alert data when it changes
  useEffect(() => {
    if (alert) {
      // Convert alert time string to Date object
      const [hours, minutes] = alert.alertTime.split(':').map(Number);
      const alertTimeDate = new Date();
      alertTimeDate.setHours(hours, minutes, 0);

      setFormValues({
        symbol: alert.symbol,
        direction: alert.direction,
        targetType: alert.targetType,
        targetValue: alert.targetValue,
        trackingMode: alert.trackingMode,
        intervalMinutes: alert.intervalMinutes,
        volumeChangeRequired: alert.volumeChangeRequired,
        alertTime: alertTimeDate,
        isActive: alert.isActive,
        comment: alert.comment || '',
        email: alert.email
      });
    }
  }, [alert]);

  // Format time string for backend
  const formatTimeForAPI = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle time picker change
  const handleTimeChange = (newValue) => {
    setFormValues(prev => ({ ...prev, alertTime: newValue }));
    if (errors.alertTime) {
      setErrors(prev => ({ ...prev, alertTime: '' }));
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!formValues.targetValue || isNaN(formValues.targetValue)) {
      newErrors.targetValue = 'Valid target value is required';
    }
    
    if (!formValues.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formValues.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formValues.alertTime) {
      newErrors.alertTime = 'Alert time is required';
    }
    
    if (formValues.trackingMode === 'interval' && 
        (!formValues.intervalMinutes || isNaN(formValues.intervalMinutes) || formValues.intervalMinutes <= 0)) {
      newErrors.intervalMinutes = 'Valid interval minutes is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // Format alert data
      const alertData = {
        ...formValues,
        alertTime: formatTimeForAPI(formValues.alertTime),
        targetValue: parseFloat(formValues.targetValue),
        intervalMinutes: parseInt(formValues.intervalMinutes, 10),
        volumeChangeRequired: parseFloat(formValues.volumeChangeRequired) || 0
      };
      
      await updateAlert(alert._id, alertData);
      showNotification('Alert updated successfully', 'success');
      onClose();
    } catch (error) {
      showNotification('Error updating alert', 'error');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Alert</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Symbol"
                name="symbol"
                value={formValues.symbol}
                disabled
                helperText="Symbol cannot be changed"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="direction-label">Direction</InputLabel>
                <Select
                  labelId="direction-label"
                  name="direction"
                  value={formValues.direction}
                  onChange={handleChange}
                  label="Direction"
                >
                  <MenuItem value=">">Price Up ↑</MenuItem>
                  <MenuItem value="<">Price Down ↓</MenuItem>
                  <MenuItem value="<>">Either Way ↕</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="target-type-label">Target Type</InputLabel>
                <Select
                  labelId="target-type-label"
                  name="targetType"
                  value={formValues.targetType}
                  onChange={handleChange}
                  label="Target Type"
                >
                  <MenuItem value="price">Price</MenuItem>
                  <MenuItem value="percentage">Percentage</MenuItem>
                </Select>
                <FormHelperText>
                  {formValues.targetType === 'price' ? 'Absolute price level' : 'Percentage change from base price'}
                </FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target Value"
                name="targetValue"
                type="number"
                value={formValues.targetValue}
                onChange={handleChange}
                error={Boolean(errors.targetValue)}
                helperText={errors.targetValue}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {formValues.targetType === 'price' ? 'USDT' : '%'}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="tracking-mode-label">Tracking Mode</InputLabel>
                <Select
                  labelId="tracking-mode-label"
                  name="trackingMode"
                  value={formValues.trackingMode}
                  onChange={handleChange}
                  label="Tracking Mode"
                >
                  <MenuItem value="current">Current Price</MenuItem>
                  <MenuItem value="interval">Price at Interval</MenuItem>
                </Select>
                <FormHelperText>
                  {formValues.trackingMode === 'current' ? 
                    'Compare with current saved price' : 
                    'Compare with price from X minutes ago'}
                </FormHelperText>
              </FormControl>
            </Grid>
            
            {formValues.trackingMode === 'interval' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Interval (minutes)"
                  name="intervalMinutes"
                  type="number"
                  value={formValues.intervalMinutes}
                  onChange={handleChange}
                  error={Boolean(errors.intervalMinutes)}
                  helperText={errors.intervalMinutes}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                  }}
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Volume Change Required"
                name="volumeChangeRequired"
                type="number"
                value={formValues.volumeChangeRequired}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Minimum volume change % (0 for none)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Alert Time"
                value={formValues.alertTime}
                onChange={handleTimeChange}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth 
                    error={Boolean(errors.alertTime)}
                    helperText={errors.alertTime || 'Time to check and send alerts'}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formValues.isActive}
                    onChange={handleChange}
                    name="isActive"
                    color="primary"
                  />
                }
                label="Alert Active"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Comment"
                name="comment"
                value={formValues.comment}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Optional note about this alert"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email for Notifications"
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleChange}
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EditAlertDialog;
