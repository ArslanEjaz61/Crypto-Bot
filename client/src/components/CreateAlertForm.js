import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Divider,
  FormHelperText,
  InputAdornment,
  Switch,
  FormControlLabel,
  ButtonGroup,
  Chip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';
import { useSocket } from '../context/SocketContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import eventBus from '../services/eventBus';

const CreateAlertForm = ({ onSuccess }) => {
  const { createAlert } = useAlert();
  const { cryptos, filteredCryptos, updateFilter } = useCrypto();
  const { showNotification } = useSocket();

  // Form state
  const [formValues, setFormValues] = useState({
    symbol: '',
    direction: '>',
    targetType: 'price',
    targetValue: '',
    trackingMode: 'current',
    intervalMinutes: 60,
    timeframe: '1h',
    volumeChangeRequired: 0,
    alertTime: new Date(),
    comment: '',
    email: ''
  });
  
  // Predefined values
  const predefinedPercentages = [1, 2, 3, 5, 10, 15, 20, 30];
  const predefinedTimeframes = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '12h', '24h'];
  const [basePrice, setBasePrice] = useState(0);

  // Form errors
  const [errors, setErrors] = useState({});
  
  // Filter state
  const [filterValues, setFilterValues] = useState({
    market: 'USDT',
    favorites: false,
    minVolume: 0,
    search: ''
  });

  // Apply filters to cryptos list
  useEffect(() => {
    updateFilter(filterValues);
  }, [filterValues, updateFilter]);

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
    
    // When symbol changes, update base price
    if (name === 'symbol') {
      const selectedCrypto = filteredCryptos.find(crypto => crypto.symbol === value);
      if (selectedCrypto) {
        setBasePrice(selectedCrypto.price);
      }
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle predefined percentage selection
  const handlePredefinedPercentage = (percentage) => {
    setFormValues(prev => ({
      ...prev,
      targetValue: percentage.toString()
    }));
    
    if (errors.targetValue) {
      setErrors(prev => ({ ...prev, targetValue: '' }));
    }
  };
  
  // Handle predefined price selection
  const handlePredefinedPrice = (priceType) => {
    let price = basePrice;
    
    if (priceType === 'original') {
      // Use original/current price
      if (formValues.symbol) {
        const selectedCrypto = filteredCryptos.find(crypto => crypto.symbol === formValues.symbol);
        if (selectedCrypto) {
          price = selectedCrypto.price;
        }
      }
    } else if (priceType === '5percent_up') {
      price = basePrice * 1.05;
    } else if (priceType === '5percent_down') {
      price = basePrice * 0.95;
    } else if (priceType === '10percent_up') {
      price = basePrice * 1.1;
    } else if (priceType === '10percent_down') {
      price = basePrice * 0.9;
    }
    
    setFormValues(prev => ({
      ...prev,
      targetValue: price.toString()
    }));
    
    if (errors.targetValue) {
      setErrors(prev => ({ ...prev, targetValue: '' }));
    }
  };
  
  // Handle timeframe selection
  const handleTimeframeChange = (event, newTimeframe) => {
    if (newTimeframe !== null) {
      const timeValue = parseInt(newTimeframe.replace(/[^0-9]/g, '') || '1', 10);
      const timeUnit = newTimeframe.includes('m') ? 1 : newTimeframe.includes('h') ? 60 : 1;
      
      setFormValues(prev => ({
        ...prev,
        timeframe: newTimeframe,
        intervalMinutes: timeValue * timeUnit
      }));
    }
  };

  // Handle time picker change
  const handleTimeChange = (newValue) => {
    setFormValues(prev => ({ ...prev, alertTime: newValue }));
    if (errors.alertTime) {
      setErrors(prev => ({ ...prev, alertTime: '' }));
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!formValues.symbol) {
      newErrors.symbol = 'Symbol is required';
    }
    
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      console.log('Submitting form with values:', formValues);
      // Format alert data with all required fields
      const alertData = {
        ...formValues,
        symbol: formValues.symbol.trim(),
        direction: formValues.direction || '>',
        targetType: formValues.targetType || 'price',
        alertTime: formatTimeForAPI(formValues.alertTime),
        targetValue: parseFloat(formValues.targetValue),
        trackingMode: formValues.trackingMode || 'current',
        intervalMinutes: parseInt(formValues.intervalMinutes, 10) || 5,
        volumeChangeRequired: parseFloat(formValues.volumeChangeRequired) || 0,
        email: formValues.email || 'test@example.com',  // Ensure email is provided
        comment: formValues.comment || ''
      };
      
      console.log('Formatted alert data for submission:', alertData);
      
      const createdAlert = await createAlert(alertData);
      showNotification('Alert created successfully', 'success');
      
      // Emit alert created event to refresh alerts list
      eventBus.emit('ALERT_CREATED', createdAlert);
      
      // Call onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
      
      // Reset form
      setFormValues({
        symbol: '',
        direction: '>',
        targetType: 'price',
        targetValue: '',
        trackingMode: 'current',
        intervalMinutes: 60,
        volumeChangeRequired: 0,
        alertTime: new Date(),
        comment: '',
        email: ''
      });
    } catch (error) {
      showNotification('Error creating alert', 'error');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Typography variant="h5" component="h2" gutterBottom>
          Create Alert
        </Typography>
        
        <Grid container spacing={3}>
          {/* Left column - Filters and coin selection */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Filter Coins
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="market-filter-label">Market</InputLabel>
                    <Select
                      labelId="market-filter-label"
                      name="market"
                      value={filterValues.market}
                      onChange={handleFilterChange}
                      label="Market"
                    >
                      <MenuItem value="all">All Markets</MenuItem>
                      <MenuItem value="USDT">USDT</MenuItem>
                      <MenuItem value="BTC">BTC</MenuItem>
                      <MenuItem value="ETH">ETH</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filterValues.favorites}
                        onChange={handleFilterChange}
                        name="favorites"
                        color="primary"
                      />
                    }
                    label="Favorites Only"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Min Volume (USDT)"
                    name="minVolume"
                    type="number"
                    value={filterValues.minVolume}
                    onChange={handleFilterChange}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">USDT</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Search Symbol"
                    name="search"
                    value={filterValues.search}
                    onChange={handleFilterChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Available Coins
              </Typography>
              {filteredCryptos.length > 0 ? (
                <Box component="ul" sx={{ pl: 2, maxHeight: 250, overflow: 'auto' }}>
                  {filteredCryptos.map(crypto => (
                    <Box 
                      component="li" 
                      key={crypto.symbol}
                      sx={{
                        cursor: 'pointer',
                        py: 0.5,
                        '&:hover': {
                          color: 'primary.main',
                        },
                        color: formValues.symbol === crypto.symbol ? 'primary.main' : 'inherit',
                        fontWeight: formValues.symbol === crypto.symbol ? 'bold' : 'normal',
                      }}
                      onClick={() => setFormValues(prev => ({ ...prev, symbol: crypto.symbol }))}
                    >
                      {crypto.symbol} - {crypto.price.toFixed(2)} USDT
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No coins match your filters
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Right column - Alert configuration */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Alert Configuration
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Symbol"
                    name="symbol"
                    value={formValues.symbol}
                    onChange={handleChange}
                    error={Boolean(errors.symbol)}
                    helperText={errors.symbol}
                    required
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
                    helperText={errors.targetValue || (formValues.targetType === 'price' ? 'Price in USDT' : 'Percentage change')}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {formValues.targetType === 'price' ? 'USDT' : '%'}
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Grid>
                
                {/* Predefined values based on target type */}
                <Grid item xs={12}>
                  {formValues.targetType === 'price' ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block" gutterBottom>
                        Predefined Price Options:
                      </Typography>
                      <ButtonGroup variant="outlined" size="small" sx={{ flexWrap: 'wrap' }}>
                        <Button onClick={() => handlePredefinedPrice('original')}>
                          Current
                        </Button>
                        <Button onClick={() => handlePredefinedPrice('5percent_up')}>
                          +5%
                        </Button>
                        <Button onClick={() => handlePredefinedPrice('5percent_down')}>
                          -5%
                        </Button>
                        <Button onClick={() => handlePredefinedPrice('10percent_up')}>
                          +10%
                        </Button>
                        <Button onClick={() => handlePredefinedPrice('10percent_down')}>
                          -10%
                        </Button>
                      </ButtonGroup>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block" gutterBottom>
                        Predefined Percentages:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {predefinedPercentages.map((percentage) => (
                          <Chip 
                            key={percentage}
                            label={`${percentage}%`}
                            onClick={() => handlePredefinedPercentage(percentage)}
                            color={formValues.targetValue === percentage.toString() ? 'primary' : 'default'}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Advanced Options
                  </Typography>
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
                  <>
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
                  <Grid item xs={12}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Time Intervals:
                    </Typography>
                    <ToggleButtonGroup
                      value={formValues.timeframe}
                      exclusive
                      onChange={handleTimeframeChange}
                      size="small"
                      sx={{ flexWrap: 'wrap' }}
                    >
                      {predefinedTimeframes.map((timeframe) => (
                        <ToggleButton key={timeframe} value={timeframe}>
                          {timeframe}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Grid>
                  </>
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
                        required
                        error={Boolean(errors.alertTime)}
                        helperText={errors.alertTime || 'Time to check and send alerts'}
                      />
                    )}
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
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Create Alert
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default CreateAlertForm;
