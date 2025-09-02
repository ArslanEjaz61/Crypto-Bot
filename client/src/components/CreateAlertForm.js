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

  // Form state with optimal defaults for reliable triggering
  const [formValues, setFormValues] = useState({
    symbol: '',
    direction: '>',
    targetType: 'price',
    targetValue: '',
    alertTime: new Date(),
    comment: '',
    email: 'jamyasir0534@gmail.com',
    
    // OPTIMAL DEFAULTS - These ensure alerts actually trigger
    trackingMode: 'current',
    candleTimeframe: '1HR',
    candleCondition: 'NONE',        // ← CRITICAL: No blocking conditions
    rsiEnabled: false,              // ← CRITICAL: Disabled by default
    emaEnabled: false,              // ← CRITICAL: Disabled by default
    volumeEnabled: false,           // ← CRITICAL: Disabled by default
    
    // Hidden/simplified settings
    intervalMinutes: 60,
    volumeChangeRequired: 0,
    rsiTimeframe: '1HR',
    rsiPeriod: 14,
    rsiCondition: 'NONE',
    rsiLevel: 70,
    emaTimeframe: '1HR',
    emaFastPeriod: 12,
    emaSlowPeriod: 26,
    emaCondition: 'NONE',
    volumeSpikeMultiplier: 2.0,
    market: 'SPOT',
    exchange: 'BINANCE',
    tradingPair: 'USDT',
    minDailyVolume: 0,
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
        comment: formValues.comment || '',
        // Candle section
        candleTimeframe: formValues.candleTimeframe || '1HR',
        candleCondition: formValues.candleCondition || 'NONE',
        // RSI section
        rsiEnabled: Boolean(formValues.rsiEnabled),
        rsiTimeframe: formValues.rsiTimeframe || '1HR',
        rsiPeriod: parseInt(formValues.rsiPeriod, 10) || 14,
        rsiCondition: formValues.rsiCondition || 'NONE',
        rsiLevel: parseInt(formValues.rsiLevel, 10) || 70,
        // EMA section
        emaEnabled: Boolean(formValues.emaEnabled),
        emaTimeframe: formValues.emaTimeframe || '1HR',
        emaFastPeriod: parseInt(formValues.emaFastPeriod, 10) || 12,
        emaSlowPeriod: parseInt(formValues.emaSlowPeriod, 10) || 26,
        emaCondition: formValues.emaCondition || 'NONE',
        // Volume Spike section
        volumeEnabled: Boolean(formValues.volumeEnabled),
        volumeSpikeMultiplier: parseFloat(formValues.volumeSpikeMultiplier) || 2.0,
        // Market filters
        market: formValues.market || 'ALL',
        exchange: formValues.exchange || 'ALL',
        tradingPair: formValues.tradingPair || 'ALL',
        minDailyVolume: parseFloat(formValues.minDailyVolume) || 0,
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
      
      // Reset form with optimal defaults
      setFormValues({
        symbol: '',
        direction: '>',
        targetType: 'price',
        targetValue: '',
        alertTime: new Date(),
        comment: '',
        email: 'jamyasir0534@gmail.com',
        
        // OPTIMAL DEFAULTS - Reset to reliable settings
        trackingMode: 'current',
        candleTimeframe: '1HR',
        candleCondition: 'NONE',        // ← CRITICAL: No blocking conditions
        rsiEnabled: false,              // ← CRITICAL: Disabled by default
        emaEnabled: false,              // ← CRITICAL: Disabled by default
        volumeEnabled: false,           // ← CRITICAL: Disabled by default
        
        // Hidden/simplified settings
        intervalMinutes: 60,
        volumeChangeRequired: 0,
        rsiTimeframe: '1HR',
        rsiPeriod: 14,
        rsiCondition: 'NONE',
        rsiLevel: 70,
        emaTimeframe: '1HR',
        emaFastPeriod: 12,
        emaSlowPeriod: 26,
        emaCondition: 'NONE',
        volumeSpikeMultiplier: 2.0,
        market: 'SPOT',
        exchange: 'BINANCE',
        tradingPair: 'USDT',
        minDailyVolume: 0,
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
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                🚨 Create Price Alert
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Get notified when your selected crypto reaches your target price
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Trading Pair Symbol"
                    name="symbol"
                    value={formValues.symbol}
                    onChange={handleChange}
                    error={Boolean(errors.symbol)}
                    helperText={errors.symbol || "Select a trading pair from the list on the left"}
                    placeholder="e.g., BTCUSDT"
                    required
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="direction-label">Alert When Price Goes</InputLabel>
                    <Select
                      labelId="direction-label"
                      name="direction"
                      value={formValues.direction}
                      onChange={handleChange}
                      label="Alert When Price Goes"
                      sx={{ 
                        '& .MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '1rem'
                        }
                      }}
                    >
                      <MenuItem value=">">📈 Above Target (Bullish)</MenuItem>
                      <MenuItem value="<">📉 Below Target (Bearish)</MenuItem>
                      <MenuItem value="<>">⚡ Either Direction</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="target-type-label">Alert Type</InputLabel>
                    <Select
                      labelId="target-type-label"
                      name="targetType"
                      value={formValues.targetType}
                      onChange={handleChange}
                      label="Alert Type"
                    >
                      <MenuItem value="price">💰 Specific Price Level</MenuItem>
                      <MenuItem value="percentage">📊 Percentage Change</MenuItem>
                    </Select>
                    <FormHelperText>
                      {formValues.targetType === 'price' ? 
                        '🎯 Alert when price reaches exact USDT value' : 
                        '📈 Alert when price changes by percentage'}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={formValues.targetType === 'price' ? '🎯 Target Price' : '📊 Target Percentage'}
                    name="targetValue"
                    type="number"
                    value={formValues.targetValue}
                    onChange={handleChange}
                    error={Boolean(errors.targetValue)}
                    helperText={
                      errors.targetValue || 
                      (formValues.targetType === 'price' ? 
                        `💡 Current ${formValues.symbol} price: ${basePrice.toFixed(2)} USDT` : 
                        '📈 Percentage change (e.g., 5 = 5% increase)')
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {formValues.targetType === 'price' ? '$' : '%'}
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }
                    }}
                    required
                  />
                </Grid>
                
                {/* Quick Setup Options */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      ⚡ Quick Setup
                    </Typography>
                    {formValues.targetType === 'price' ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button 
                          variant={formValues.targetValue === basePrice.toString() ? 'contained' : 'outlined'}
                          size="small" 
                          onClick={() => handlePredefinedPrice('original')}
                        >
                          Current: ${basePrice.toFixed(2)}
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          color="success"
                          onClick={() => handlePredefinedPrice('5percent_up')}
                        >
                          📈 +5% (${(basePrice * 1.05).toFixed(2)})
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          color="error"
                          onClick={() => handlePredefinedPrice('5percent_down')}
                        >
                          📉 -5% (${(basePrice * 0.95).toFixed(2)})
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          color="success"
                          onClick={() => handlePredefinedPrice('10percent_up')}
                        >
                          📈 +10% (${(basePrice * 1.1).toFixed(2)})
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          color="error"
                          onClick={() => handlePredefinedPrice('10percent_down')}
                        >
                          📉 -10% (${(basePrice * 0.9).toFixed(2)})
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {[0.5, 1, 2, 3, 5, 10].map((percentage) => (
                          <Chip 
                            key={percentage}
                            label={`${percentage}%`}
                            onClick={() => handlePredefinedPercentage(percentage)}
                            color={formValues.targetValue === percentage.toString() ? 'primary' : 'default'}
                            sx={{ cursor: 'pointer' }}
                            variant={formValues.targetValue === percentage.toString() ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Grid>
                
                {/* Email and Alert Time */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="📧 Email for Notifications"
                    name="email"
                    type="email"
                    value={formValues.email}
                    onChange={handleChange}
                    error={Boolean(errors.email)}
                    helperText={errors.email || "We'll send alert notifications here"}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker
                      label="⏰ Alert Time"
                      value={formValues.alertTime}
                      onChange={handleTimeChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={Boolean(errors.alertTime)}
                          helperText={errors.alertTime || "Time to check for alerts"}
                          required
                        />
                      )}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="💬 Comment (Optional)"
                    name="comment"
                    value={formValues.comment}
                    onChange={handleChange}
                    placeholder="Add a note about this alert..."
                    multiline
                    rows={2}
                  />
                </Grid>



                
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, mt: 2, textAlign: 'center', backgroundColor: 'primary.main', color: 'white' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      🚀 Ready to Create Your Alert?
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                      We'll monitor {formValues.symbol || 'your crypto'} and notify you at {formValues.email} when conditions are met
                    </Typography>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="secondary"
                      size="large"
                      sx={{ 
                        py: 2, 
                        px: 4, 
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        borderRadius: 3,
                        boxShadow: 3,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 6
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      🎯 CREATE PRICE ALERT
                    </Button>
                  </Paper>
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
