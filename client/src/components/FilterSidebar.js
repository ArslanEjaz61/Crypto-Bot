import React, { useState, useEffect, memo, forwardRef, useImperativeHandle, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  Button,
  Divider,
  Alert,
  Collapse,
  IconButton,
  InputAdornment,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useCrypto } from '../context/CryptoContext';
import { useFilters } from '../context/FilterContext';
import { useAlert } from '../context/AlertContext';
import { useSelectedPairs } from '../context/SelectedPairsContext';
import { useSelectedPair } from '../context/SelectedPairContext';
import LoadingButton from './LoadingButton';

// Custom styled components to match screenshot
const CustomCheckbox = styled((props) => (
  <Checkbox
    {...props}
    disableRipple
    icon={
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          backgroundColor: "white", // default box white
          border: "1px solid rgba(255,255,255,0.3)",
          display: "inline-block",
        }}
      />
    }
    checkedIcon={
      <span
        style={{
          width: 21,
          height: 21,
          borderRadius: 3,
          backgroundColor: "#1890ff", // full blue fill
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CheckIcon style={{ fontSize: 16, color: "white" }} />
      </span>
    }
  />
))({});

const DarkAccordion = styled(Accordion)({
  backgroundColor: 'transparent',
  color: 'white',
  boxShadow: 'none',
  marginBottom: '8px',
  '&:before': {
    display: 'none',
  },
  '& .MuiAccordionSummary-root': {
    minHeight: '48px',
    padding: '0 16px',
    borderRadius: '6px',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
  },
  '& .MuiAccordionSummary-content': {
    margin: '12px 0',
    fontSize: '14px',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  '& .MuiAccordionDetails-root': {
    padding: '8px 16px 16px 16px',
  },
});

const CustomAccordionSummary = styled(AccordionSummary)({
  '& .MuiAccordionSummary-expandIconWrapper': {
    color: 'rgba(255, 255, 255, 0.7)',
    transition: 'transform 0.2s ease',
  },
  '&:hover .MuiAccordionSummary-expandIconWrapper': {
    color: 'white',
  },
});

const DarkTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#151b26',
    color: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    '& fieldset': {
      borderColor: '#30363d',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#4f80ff',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4f80ff',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#8b949e',
    fontSize: '13px',
    fontWeight: '400',
  },
  '& .MuiInputAdornment-root': {
    color: '#8b949e',
  },
  '& .MuiInputBase-input': {
    padding: '12px 14px',
  },
});

const DarkToggleButton = styled(ToggleButton)({
  color: 'white',
  backgroundColor: '#151b26',
  borderColor: '#30363d',
  '&.Mui-selected': {
    backgroundColor: '#4f80ff',
    color: 'white',
    '&:hover': {
      backgroundColor: '#3b6ae8',
    },
  },
  '&:hover': {
    backgroundColor: '#1c2637',
  },
});

const DarkButton = styled(Button)({
  borderColor: '#30363d',
  color: 'white',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  textTransform: 'none',
  letterSpacing: '0.5px',
  padding: '12px 24px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#1c2637',
    borderColor: '#4f80ff',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(72, 128, 255, 0.3)',
  },
  '&.MuiButton-contained': {
    backgroundColor: '#4f80ff',
    color: 'white',
    boxShadow: '0 2px 8px rgba(72, 128, 255, 0.3)',
    '&:hover': {
      backgroundColor: '#3b6ae8',
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 16px rgba(72, 128, 255, 0.4)',
    },
  },
});

const DarkToggleButtonGroup = styled(ToggleButtonGroup)({
  '& .MuiToggleButtonGroup-grouped': {
    margin: 0,
    border: '1px solid #30363d',
    '&:not(:first-of-type)': {
      borderRadius: 0,
      borderLeft: '1px solid #30363d',
    },
    '&:first-of-type': {
      borderRadius: '4px 0 0 4px',
    },
    '&:last-of-type': {
      borderRadius: '0 4px 4px 0',
    },
  },
});

const StyledFormControlLabel = styled(FormControlLabel)({
  '& .MuiFormControlLabel-label': {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '13px',
    fontWeight: '400',
    letterSpacing: '0.3px',
    marginLeft: '8px',
  },
  margin: '1px 0',
  padding: '1px 2px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  '& .MuiCheckbox-root': {
    padding: '1px',
  },
});

const DarkTypography = styled(Typography)({
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '14px',
  fontWeight: '500',
  letterSpacing: '0.5px',
});

const FilterSidebar = memo(forwardRef((props, ref) => {
  const { filters: ctxFilters, setFilters: setCtxFilters, getFilterValues } = useFilters();
  const { createAlert } = useAlert();
  const { selectedSymbol } = useSelectedPair();
  const { cryptos, updateFilter: updateCryptoFilter } = useCrypto();
  const { getSelectedPairsArray, getSelectedCount, getFavoritePairsForAlerts } = useSelectedPairs();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [percentageValue, setPercentageValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  
  // Simple notification system
  const showNotification = (message, type = 'success') => {
    console.log(`${type}: ${message}`);
  };
  
  // Simple event bus for notifications
  const eventBus = {
    emit: (event, data) => {
      console.log(`Event: ${event}`, data);
    }
  };
  
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fallback to context if props not supplied
  const filters = ctxFilters;

  // Memoized event handlers to prevent re-renders
  const handleCheckboxChange = useCallback((category, value) => {
    const newFilters = {
      ...ctxFilters,
      [category]: {
        ...ctxFilters[category],
        [value]: !ctxFilters[category]?.[value]
      }
    };
    
    setCtxFilters(newFilters);
    
    // Update CryptoContext filter for market panel filtering
    if (category === 'pair' || category === 'market') {
      console.log(`Updating crypto filter for ${category}:`, newFilters[category]);
      if (updateCryptoFilter) {
        updateCryptoFilter({
          [category]: newFilters[category]
        });
      }
    }
  }, [setCtxFilters, ctxFilters, updateCryptoFilter]);

  const handleTextChange = useCallback((category, value) => {
    setCtxFilters(prev => ({
      ...prev,
      [category]: value
    }));
  }, [setCtxFilters]);

  const handleToggleChange = useCallback((category, event, newValue) => {
    if (newValue !== null) {
      setCtxFilters(prev => ({
        ...prev,
        [category]: newValue
      }));
    }
  }, [setCtxFilters]);

  // Effect to adjust accordion state based on screen size  
  useEffect(() => {
    // You can add logic here to collapse accordions on small screens if needed
  }, [isSmall]);

  // Validation function to check if minimum required fields are filled
  const validateAlertForm = useCallback(() => {
    const errors = [];
    
    // Check if at least one condition is selected
    const hasChangePercent = Object.keys(filters.changePercent || {}).some(key => filters.changePercent[key]) && 
                             (percentageValue || filters.percentageValue);
    const hasRSI = Object.keys(filters.rsiRange || {}).some(key => filters.rsiRange[key]) && 
                   filters.rsiPeriod && filters.rsiLevel;
    const hasEMA = Object.keys(filters.ema || {}).some(key => filters.ema[key]) && 
                   filters.emaFast && filters.emaSlow;
    const hasCandle = Object.keys(filters.candle || {}).some(key => filters.candle[key]);
    
    if (!hasChangePercent && !hasRSI && !hasEMA && !hasCandle) {
      errors.push('At least one condition must be selected (Change %, RSI, EMA, or Candle)');
    }
    
    // Validate Change % specific requirements
    if (hasChangePercent) {
      if (!percentageValue && !filters.percentageValue) {
        errors.push('Percentage value is required when Change % timeframe is selected');
      } else {
        const percentValue = Number(percentageValue || filters.percentageValue);
        if (isNaN(percentValue) || percentValue <= 0) {
          errors.push('Percentage value must be a positive number');
        }
      }
    }
    
    // Validate RSI specific requirements
    if (hasRSI) {
      if (!filters.rsiPeriod || !filters.rsiLevel) {
        errors.push('RSI Period and Level are required when RSI timeframe is selected');
      } else {
        const period = Number(filters.rsiPeriod);
        const level = Number(filters.rsiLevel);
        if (isNaN(period) || period <= 0) {
          errors.push('RSI Period must be a positive number');
        }
        if (isNaN(level) || level < 1 || level > 100) {
          errors.push('RSI Level must be between 1 and 100');
        }
      }
    }
    
    // Validate EMA specific requirements
    if (hasEMA) {
      if (!filters.emaFast || !filters.emaSlow) {
        errors.push('EMA Fast and Slow periods are required when EMA timeframe is selected');
      } else {
        const fast = Number(filters.emaFast);
        const slow = Number(filters.emaSlow);
        if (isNaN(fast) || fast <= 0) {
          errors.push('EMA Fast period must be a positive number');
        }
        if (isNaN(slow) || slow <= 0) {
          errors.push('EMA Slow period must be a positive number');
        }
        if (fast >= slow) {
          errors.push('EMA Fast period must be less than Slow period');
        }
      }
    }
    
    return errors;
  }, [filters, percentageValue]);

  // Memoized create alert function - now supports multiple pairs and favorites
  const handleCreateAlert = useCallback(async (symbolOverride = null) => {
    // Debug selectedSymbol to understand its structure
    console.log('=== FilterSidebar Alert Creation Debug ===');
    console.log('selectedSymbol type:', typeof selectedSymbol);
    console.log('selectedSymbol value:', selectedSymbol);
    console.log('symbolOverride:', symbolOverride);
    console.log('selectedSymbol JSON:', JSON.stringify(selectedSymbol, null, 2));
    
    // Deep debugging of selectedSymbol object structure
    if (selectedSymbol && typeof selectedSymbol === 'object') {
      console.log('=== OBJECT STRUCTURE ANALYSIS ===');
      console.log('Object keys:', Object.keys(selectedSymbol));
      console.log('Object values:', Object.values(selectedSymbol));
      console.log('Object entries:', Object.entries(selectedSymbol));
      
      // Check each property
      Object.keys(selectedSymbol).forEach(key => {
        console.log(`Property '${key}':`, selectedSymbol[key], 'Type:', typeof selectedSymbol[key]);
      });
      
      // Check common symbol property names
      const possibleSymbolProps = ['symbol', 'Symbol', 'SYMBOL', 'ticker', 'pair', 'name', 'code'];
      possibleSymbolProps.forEach(prop => {
        if (selectedSymbol[prop]) {
          console.log(`Found potential symbol in '${prop}':`, selectedSymbol[prop]);
        }
      });
    }
    
    // Extract symbol string properly - selectedSymbol should be a string from SelectedPairContext
    let symbol;
    if (symbolOverride) {
      // Check if symbolOverride is an event object (common mistake)
      if (symbolOverride && typeof symbolOverride === 'object' && symbolOverride.type) {
        console.log('symbolOverride is an event object, ignoring it');
        // Ignore the event and use selectedSymbol instead
        symbol = null;
      } else {
        symbol = String(symbolOverride);
        console.log('Using symbolOverride:', symbol);
      }
    }
    
    if (!symbol && selectedSymbol) {
      // selectedSymbol from SelectedPairContext is a string, but handle edge cases
      if (typeof selectedSymbol === 'string' && selectedSymbol.trim() !== '') {
        symbol = selectedSymbol.trim();
        console.log('Using selectedSymbol from context:', symbol);
      } else if (typeof selectedSymbol === 'object' && selectedSymbol !== null) {
        console.log('=== ATTEMPTING SYMBOL EXTRACTION FROM OBJECT ===');
        
        // Try multiple possible property names
        const extractionAttempts = [
          selectedSymbol.symbol,
          selectedSymbol.Symbol, 
          selectedSymbol.SYMBOL,
          selectedSymbol.selectedSymbol,
          selectedSymbol.ticker,
          selectedSymbol.pair,
          selectedSymbol.name,
          selectedSymbol.code
        ];
        
        console.log('Extraction attempts:', extractionAttempts);
        
        // Find first valid string
        symbol = extractionAttempts.find(attempt => 
          attempt && typeof attempt === 'string' && attempt.trim() !== ''
        );
        
        if (symbol) {
          console.log('Successfully extracted symbol:', symbol);
        } else {
          console.log('No valid symbol found in object, using fallback');
          symbol = 'BTCUSDT';
        }
      } else {
        symbol = 'BTCUSDT'; // fallback
        console.log('selectedSymbol invalid, using fallback:', selectedSymbol);
      }
    } else if (!symbol) {
      symbol = 'BTCUSDT'; // fallback
      console.log('No valid symbol found, using fallback');
    }
    
    // Ensure symbol is valid
    if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
      console.warn('Symbol is invalid, forcing BTCUSDT. Original value:', symbol);
      symbol = 'BTCUSDT';
    }
    
    // Get selected pairs from context
    const selectedPairs = getSelectedPairsArray();
    const selectedCount = getSelectedCount();
    
    console.log('Selected pairs:', selectedPairs);
    console.log('Selected count:', selectedCount);
    
    // Determine which symbols to create alerts for
    let symbolsToProcess = [];
    
    // Check if we're in favorites context and should use favorite pairs
    const favoritePairs = getFavoritePairsForAlerts(cryptos);
    
    // Priority order: Selected pairs > Favorite pairs > Single symbol > Fallback
    if (selectedCount > 0) {
      // Use selected pairs from MarketPanel checkboxes
      symbolsToProcess = selectedPairs;
      console.log('Creating alerts for selected pairs:', symbolsToProcess);
    } else if (favoritePairs.length > 0) {
      // Use favorite pairs if no specific selection
      symbolsToProcess = favoritePairs;
      console.log('Creating alerts for favorite pairs:', symbolsToProcess);
    } else if (symbolOverride) {
      // Single symbol override
      symbolsToProcess = [symbol];
      console.log('Creating alert for single override symbol:', symbol);
    } else if (selectedSymbol) {
      // Use current selected symbol
      symbolsToProcess = [symbol];
      console.log('Creating alert for current selected symbol:', symbol);
    } else {
      // Fallback
      symbolsToProcess = ['BTCUSDT'];
      console.log('Using fallback symbol');
    }
    
    console.log('Final symbols for alert creation:', symbolsToProcess);
    
    // Validate form before proceeding
    const validationErrors = validateAlertForm();
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.join('. '));
      return;
    }

    setIsCreatingAlert(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const alertTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      // Get filter values with proper null/0 handling
      const filterValues = getFilterValues();

      // Helpers to read first selected key from a section with null fallback
      const firstSelected = (sectionObj) => {
        if (!sectionObj || typeof sectionObj !== 'object') return null;
        const keys = Object.keys(sectionObj).filter((k) => sectionObj[k]);
        return keys.length > 0 ? keys[0] : null;
      };

      const market = firstSelected(filters.market) || 'SPOT';
      const exchange = firstSelected(filters.exchange) || 'BINANCE';
      const tradingPair = firstSelected(filters.pair) || 'USDT';

      // Use filterValues for OHLCV-integrated data
      const minDailyVolume = filterValues.minDailyVolume || 0;
      const changePercentTimeframe = filterValues.changePercent.timeframe;
      const alertCountTimeframe = filterValues.alertCount.timeframe;
      const alertCountEnabled = filterValues.alertCount.enabled;

      // Technical indicators with null handling
      const rsiConfig = filterValues.rsi;
      const emaConfig = filterValues.ema;
      const candleTimeframe = firstSelected(filters.candle) || null;

      // Get percentage value with multiple fallbacks
      let finalPercentageValue;
      
      // Priority 1: Direct input field value
      if (percentageInputRef.current && percentageInputRef.current.value && percentageInputRef.current.value.trim() !== '') {
        finalPercentageValue = Number(percentageInputRef.current.value);
        console.log('Got percentage from input ref:', finalPercentageValue);
      }
      // Priority 2: Local state value
      else if (percentageValue && percentageValue.toString().trim() !== '') {
        finalPercentageValue = Number(percentageValue);
        console.log('Got percentage from local state:', finalPercentageValue);
      }
      // Priority 3: Context filters value
      else if (filters.percentageValue && filters.percentageValue.toString().trim() !== '') {
        finalPercentageValue = Number(filters.percentageValue);
        console.log('Got percentage from context filters:', finalPercentageValue);
      }
      // Default fallback
      else {
        finalPercentageValue = 1;
        console.log('Using default percentage value:', finalPercentageValue);
      }
      
      // Ensure we have a valid non-zero number
      if (isNaN(finalPercentageValue) || finalPercentageValue <= 0) {
        finalPercentageValue = 1;
        console.log('Invalid percentage, using default:', finalPercentageValue);
      }
      
      console.log('Final percentage value being sent to backend:', finalPercentageValue);

      // Create alerts for all selected symbols
      const alertResults = [];
      const failedAlerts = [];
      
      for (const currentSymbol of symbolsToProcess) {
        try {
          // Validate each symbol
          if (!currentSymbol || typeof currentSymbol !== 'string' || currentSymbol.trim() === '') {
            console.error('Invalid symbol in batch:', currentSymbol);
            failedAlerts.push({ symbol: currentSymbol, error: 'Invalid symbol format' });
            continue;
          }
          
          const cleanSymbol = currentSymbol.trim();
          console.log('Creating alert for symbol:', cleanSymbol);
          
          // Create clean alertData object with only serializable values
          const alertData = {
            symbol: cleanSymbol,
        direction: '>',
        targetType: 'percentage',
        targetValue: Number(finalPercentageValue),
        trackingMode: 'current',
        intervalMinutes: 60,
        volumeChangeRequired: 0,
        alertTime: String(alertTime),
        comment: `Alert created from filter for ${cleanSymbol}`,
        email: ' kainat.tasadaq3@gmail.com',

        // OHLCV-integrated Min Daily Volume
        minDailyVolume: Number(minDailyVolume) || 0,

        // OHLCV-integrated Change % with timeframe
        changePercentTimeframe: changePercentTimeframe ? String(changePercentTimeframe) : null,
        changePercentValue: Number(finalPercentageValue),
        // Alert Count configuration
        alertCountTimeframe: alertCountTimeframe ? String(alertCountTimeframe) : null,
        alertCountEnabled: Boolean(alertCountEnabled),

        // Candle configuration - null if not selected
        candleTimeframe: candleTimeframe ? String(candleTimeframe) : null,
        candleCondition: candleTimeframe ? (() => {
          const condition = filters.candleCondition || 'NONE';
          const conditionMap = {
            'Candle Above Open': 'ABOVE_OPEN',
            'Candle Below Open': 'BELOW_OPEN',
            'Green Candle': 'GREEN_CANDLE',
            'Red Candle': 'RED_CANDLE',
            'Bullish Hammer': 'BULLISH_HAMMER',
            'Bearish Hammer': 'BEARISH_HAMMER',
            'Doji': 'DOJI',
            'Long Upper Wick': 'LONG_UPPER_WICK',
            'Long Lower Wick': 'LONG_LOWER_WICK',
            'None': 'NONE'
          };
          return String(conditionMap[condition] || 'NONE');
        })() : 'NONE',

        // RSI configuration - null if not selected
        rsiEnabled: Boolean(rsiConfig),
        rsiTimeframe: rsiConfig?.timeframe ? String(rsiConfig.timeframe) : null,
        rsiPeriod: rsiConfig?.period ? Number(rsiConfig.period) : 0,
        rsiCondition: rsiConfig?.condition ? String(rsiConfig.condition).replace(' ', '_') : 'NONE',
        rsiLevel: rsiConfig?.level ? Number(rsiConfig.level) : 0,

        // EMA configuration - null if not selected
        emaEnabled: Boolean(emaConfig),
        emaTimeframe: emaConfig?.timeframe ? String(emaConfig.timeframe) : null,
        emaFastPeriod: emaConfig?.fastPeriod ? Number(emaConfig.fastPeriod) : 0,
        emaSlowPeriod: emaConfig?.slowPeriod ? Number(emaConfig.slowPeriod) : 0,
        emaCondition: emaConfig?.condition ? String(emaConfig.condition).replace(' ', '_') : 'NONE',

        // Market filters (always active)
        market: String(market),
        exchange: String(exchange),
        tradingPair: String(tradingPair),
      };

      // Allow creating alerts with null/0 values - no validation required

          console.log('Creating alert with OHLCV data:', {
            symbol: alertData.symbol,
            minDailyVolume: alertData.minDailyVolume,
            changePercent: { timeframe: alertData.changePercentTimeframe, value: alertData.changePercentValue },
            alertCount: { timeframe: alertData.alertCountTimeframe, enabled: alertData.alertCountEnabled },
            rsi: rsiConfig,
            ema: emaConfig
          });

          const created = await createAlert(alertData);
          console.log('Alert created successfully for:', cleanSymbol, created);
          alertResults.push({ symbol: cleanSymbol, success: true, alert: created });
          
          eventBus.emit('ALERT_CREATED', created);
          
        } catch (error) {
          console.error('Error creating alert for', currentSymbol, ':', error);
          const errorMsg = error.response?.data?.message || error.response?.data || error.message || 'Unknown error';
          failedAlerts.push({ symbol: currentSymbol, error: errorMsg });
        }
      }
      
      // Provide feedback based on results
      const successCount = alertResults.length;
      const failureCount = failedAlerts.length;
      const totalCount = symbolsToProcess.length;
      
      if (successCount === totalCount) {
        // All alerts created successfully
        if (totalCount === 1) {
          setSuccessMessage(`Alert created successfully for ${symbolsToProcess[0]}!`);
        } else {
          setSuccessMessage(`All ${totalCount} alerts created successfully!`);
        }
      } else if (successCount > 0) {
        // Partial success
        setSuccessMessage(`${successCount} of ${totalCount} alerts created successfully.`);
        if (failureCount > 0) {
          const failedSymbols = failedAlerts.map(f => f.symbol).join(', ');
          setErrorMessage(`Failed to create alerts for: ${failedSymbols}`);
        }
      } else {
        // All failed
        setErrorMessage(`Failed to create alerts for all ${totalCount} symbols.`);
      }
      
      // Reset form after successful creation(s)
      if (successCount > 0) {
        setPercentageValue('');
        
        // Clear the input field directly
        if (percentageInputRef.current) {
          percentageInputRef.current.value = '';
        }
        
        // Reset percentage value in context
        setCtxFilters(prev => ({
          ...prev,
          percentageValue: null
        }));
      }
      
    } catch (error) {
      console.error('Error in bulk alert creation:', error);
      setErrorMessage(`Failed to create alerts: ${error.message}`);
    } finally {
      setIsCreatingAlert(false);
    }
  }, [createAlert, getFilterValues, setCtxFilters, showNotification, eventBus, setPercentageValue, getSelectedPairsArray, getSelectedCount, selectedSymbol]);

  // Expose handleCreateAlert function via ref
  useImperativeHandle(ref, () => ({
    handleCreateAlert
  }));

  const percentageInputRef = useRef(null);

  // Handle percentage input value change
  const handlePercentageChange = useCallback((e) => {
    const newValue = e.target.value;
    console.log('Percentage input changed to:', newValue);
    setPercentageValue(newValue);
    handleTextChange('percentageValue', newValue);
    
    // Ensure the value is also stored in the input ref for direct access
    if (percentageInputRef.current) {
      percentageInputRef.current.value = newValue;
    }
  }, [handleTextChange]);

  return (
    <Paper sx={{
      bgcolor: '#0d1117',
      borderRadius: isSmall ? '0px' : '12px',
      height: '100%',
      p: isSmall ? 2 : 3,
      overflow: 'auto',
      maxHeight: isSmall ? '100vh' : 'calc(100vh - 100px)',
      width: isSmall ? '100%' : 'auto',
      color: 'white',
      border: isSmall ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: isSmall ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.3)',
      position: isSmall ? 'fixed' : 'relative',
      top: isSmall ? 0 : 'auto',
      left: isSmall ? 0 : 'auto',
      right: isSmall ? 0 : 'auto',
      bottom: isSmall ? 0 : 'auto',
      zIndex: isSmall ? 1300 : 'auto',
    }}>
      <Box component="aside" sx={{
        color: 'text.primary',
        '& > *:not(:last-child)': {
          marginBottom: '4px',
        }
      }}>
        {isSmall && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            pb: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
              Filters
            </Typography>
            <Button
              onClick={() => {
                handleCreateAlert();
              }}
              sx={{
                minWidth: '40px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                p: 0,
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <CloseIcon />
            </Button>
          </Box>
        )}
        {/* Market Section */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="market-content"
            id="market-header"
          >
            <DarkTypography>Market</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.market?.SPOT || false}
                    onChange={() => handleCheckboxChange('market', 'SPOT')}
                  />
                }
                label="SPOT"
              />
            </FormGroup>
          </AccordionDetails>
        </DarkAccordion>

        {/* Exchange Section */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="exchange-content"
            id="exchange-header"
          >
            <DarkTypography>Exchange</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.exchange?.BINANCE || false}
                    onChange={() => handleCheckboxChange('exchange', 'BINANCE')}
                  />
                }
                label="BINANCE"
              />
            </FormGroup>
          </AccordionDetails>
        </DarkAccordion>

        {/* Pair Section */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="pair-content"
            id="pair-header"
          >
            <DarkTypography>Pair</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.pair?.USDT || false}
                    onChange={() => handleCheckboxChange('pair', 'USDT')}
                  />
                }
                label="USDT"
              />
            </FormGroup>
          </AccordionDetails>
        </DarkAccordion>

        {/* Min. Daily Section */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="min-daily-content"
            id="min-daily-header"
          >
            <DarkTypography>Min. Daily</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.5,
              padding: '1px 0'
            }}>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['10K'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '10K')}
                  />
                }
                label="10k"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['100K'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '100K')}
                  />
                }
                label="100K"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['500K'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '500K')}
                  />
                }
                label="500K"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['1MN'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '1MN')}
                  />
                }
                label="1MN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['2MN'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '2MN')}
                  />
                }
                label="2MN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['5MN'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '5MN')}
                  />
                }
                label="5MN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['10MN'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '10MN')}
                  />
                }
                label="10MN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['25MN'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '25MN')}
                  />
                }
                label="25MN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.minDaily?.['50MN_PLUS'] || false}
                    onChange={() => handleCheckboxChange('minDaily', '50MN_PLUS')}
                  />
                }
                label="50MN and Above"
                sx={{ gridColumn: '1 / span 2' }}
              />
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* Change % */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="change-percent-content"
            id="change-percent-header"
          >
            <DarkTypography>Change %</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.5,
              padding: '1px 0'
            }}>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.changePercent?.['1MIN'] || false}
                    onChange={() => handleCheckboxChange('changePercent', '1MIN')}
                  />
                }
                label="1MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.changePercent?.['5MIN'] || false}
                    onChange={() => handleCheckboxChange('changePercent', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.changePercent?.['15MIN'] || false}
                    onChange={() => handleCheckboxChange('changePercent', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.changePercent?.['1HR'] || false}
                    onChange={() => handleCheckboxChange('changePercent', '1HR')}
                  />
                }
                label="1HR"
              />
            </Box>

            {/* Percentage % */}
            <Box sx={{
              mt: 0.5,
              padding: '1px 0'
            }}>
              <DarkTypography variant="body2" sx={{ fontSize: '13px', mb: 1 }}>Percentage %</DarkTypography>
              <DarkTextField
                type="number"
                size="small"
                variant="outlined"
                fullWidth
                placeholder="Enter percentage"
                inputRef={percentageInputRef}
                value={percentageValue || filters.percentageValue || ''}
                onChange={handlePercentageChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: {
                    min: 0.1,
                    step: 0.1
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#4f80ff',
                      borderWidth: '2px',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4f80ff',
                      borderWidth: '2px',
                    },
                  }
                }}
              />
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* Alert Count */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="alert-count-content"
            id="alert-count-header"
          >
            <DarkTypography>Alert Count</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.5,
              padding: '1px 0'
            }}>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.alertCount?.['5MIN'] || false}
                    onChange={() => handleCheckboxChange('alertCount', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.alertCount?.['15MIN'] || false}
                    onChange={() => handleCheckboxChange('alertCount', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.alertCount?.['1HR'] || false}
                    onChange={() => handleCheckboxChange('alertCount', '1HR')}
                  />
                }
                label="1HR"
              />
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* Candle */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="candle-content"
            id="candle-header"
          >
            <DarkTypography>Candle</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              padding: '1px 0'
            }}>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.['5MIN'] || false}
                    onChange={() => handleCheckboxChange('candle', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.['15MIN'] || false}
                    onChange={() => handleCheckboxChange('candle', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.['1HR'] || false}
                    onChange={() => handleCheckboxChange('candle', '1HR')}
                  />
                }
                label="1HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.['4HR'] || false}
                    onChange={() => handleCheckboxChange('candle', '4HR')}
                  />
                }
                label="4HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.['12HR'] || false}
                    onChange={() => handleCheckboxChange('candle', '12HR')}
                  />
                }
                label="12HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.D || false}
                    onChange={() => handleCheckboxChange('candle', 'D')}
                  />
                }
                label="D"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.candle?.W || false}
                    onChange={() => handleCheckboxChange('candle', 'W')}
                  />
                }
                label="W"
              />
            </Box>

            {/* Condition */}
            <Box sx={{ mt: 1 }}>
              <DarkTypography variant="body2" gutterBottom>Condition:</DarkTypography>
              <DarkTextField
                select
                size="small"
                variant="outlined"
                fullWidth
                value={filters.candleCondition || 'Candle Above Open'}
                onChange={(e) => handleTextChange('candleCondition', e.target.value)}
              >
                <MenuItem value="Candle Above Open">Candle Above Open</MenuItem>
                <MenuItem value="Candle Below Open">Candle Below Open</MenuItem>
                <MenuItem value="Green Candle">Green Candle (Close &gt; Open)</MenuItem>
                <MenuItem value="Red Candle">Red Candle (Close &lt; Open)</MenuItem>
                <MenuItem value="Bullish Hammer">Bullish Hammer</MenuItem>
                <MenuItem value="Bearish Hammer">Bearish Hammer</MenuItem>
                <MenuItem value="Doji">Doji (Open ≈ Close)</MenuItem>
                <MenuItem value="Long Upper Wick">Long Upper Wick</MenuItem>
                <MenuItem value="Long Lower Wick">Long Lower Wick</MenuItem>
                <MenuItem value="None">None</MenuItem>
              </DarkTextField>
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* RSI Range */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="rsi-range-content"
            id="rsi-range-header"
          >
            <DarkTypography>RSI Range</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              padding: '1px 0'
            }}>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.rsiRange?.['5MIN'] || false}
                    onChange={() => handleCheckboxChange('rsiRange', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.rsiRange?.['15MIN'] || false}
                    onChange={() => handleCheckboxChange('rsiRange', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.rsiRange?.['1HR'] || false}
                    onChange={() => handleCheckboxChange('rsiRange', '1HR')}
                  />
                }
                label="1HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.rsiRange?.['4HR'] || false}
                    onChange={() => handleCheckboxChange('rsiRange', '4HR')}
                  />
                }
                label="4HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.rsiRange?.['12HR'] || false}
                    onChange={() => handleCheckboxChange('rsiRange', '12HR')}
                  />
                }
                label="12HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.rsiRange?.D || false}
                    onChange={() => handleCheckboxChange('rsiRange', 'D')}
                  />
                }
                label="D"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Box>
                <DarkTypography variant="body2" gutterBottom>RSI Period</DarkTypography>
                <DarkTextField
                  size="small"
                  variant="outlined"
                  value={filters.rsiPeriod || '14'}
                  onChange={(e) => handleTextChange('rsiPeriod', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>

              <Box>
                <DarkTypography variant="body2" gutterBottom>Level (1-100)</DarkTypography>
                <DarkTextField
                  size="small"
                  variant="outlined"
                  value={filters.rsiLevel || '70'}
                  onChange={(e) => handleTextChange('rsiLevel', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <DarkButton
                  variant={filters.rsiCondition === 'ABOVE' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('rsiCondition', null, 'ABOVE')}
                  sx={{ flex: 1, py: 0.5, fontSize: '12px' }}
                >
                  ABOVE
                </DarkButton>
                <DarkButton
                  variant={filters.rsiCondition === 'BELOW' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('rsiCondition', null, 'BELOW')}
                  sx={{ flex: 1, py: 0.5, fontSize: '12px' }}
                >
                  BELOW
                </DarkButton>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <DarkButton
                  variant={filters.rsiCondition === 'CROSSING UP' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('rsiCondition', null, 'CROSSING UP')}
                  sx={{ py: 0.5, fontSize: '12px' }}
                >
                  CROSSING UP
                </DarkButton>
                <DarkButton
                  variant={filters.rsiCondition === 'CROSSING DOWN' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('rsiCondition', null, 'CROSSING DOWN')}
                  sx={{ py: 0.5, fontSize: '12px' }}
                >
                  CROSSING DOWN
                </DarkButton>
              </Box>
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* EMA Fast/Slow */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="ema-content"
            id="ema-header"
          >
            <DarkTypography>EMA Fast / Slow</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              padding: '1px 0'
            }}>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.ema?.['5MIN'] || false}
                    onChange={() => handleCheckboxChange('ema', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.ema?.['15MIN'] || false}
                    onChange={() => handleCheckboxChange('ema', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.ema?.['1HR'] || false}
                    onChange={() => handleCheckboxChange('ema', '1HR')}
                  />
                }
                label="1HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.ema?.['4HR'] || false}
                    onChange={() => handleCheckboxChange('ema', '4HR')}
                  />
                }
                label="4HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.ema?.['12HR'] || false}
                    onChange={() => handleCheckboxChange('ema', '12HR')}
                  />
                }
                label="12HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox
                    checked={filters.ema?.D || false}
                    onChange={() => handleCheckboxChange('ema', 'D')}
                  />
                }
                label="D"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Box>
                <DarkTypography variant="body2" gutterBottom>Fast</DarkTypography>
                <DarkTextField
                  size="small"
                  variant="outlined"
                  value={filters.emaFast || '12'}
                  onChange={(e) => handleTextChange('emaFast', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>

              <Box>
                <DarkTypography variant="body2" gutterBottom>Slow</DarkTypography>
                <DarkTextField
                  size="small"
                  variant="outlined"
                  value={filters.emaSlow || '26'}
                  onChange={(e) => handleTextChange('emaSlow', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <DarkButton
                  variant={filters.emaCondition === 'ABOVE' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('emaCondition', null, 'ABOVE')}
                  sx={{ py: 0.5, fontSize: '12px' }}
                >
                  ABOVE
                </DarkButton>
                <DarkButton
                  variant={filters.emaCondition === 'BELOW' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('emaCondition', null, 'BELOW')}
                  sx={{ py: 0.5, fontSize: '12px' }}
                >
                  BELOW
                </DarkButton>
                <DarkButton
                  variant={filters.emaCondition === 'CROSSING UP' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('emaCondition', null, 'CROSSING UP')}
                  sx={{ py: 0.5, fontSize: '12px' }}
                >
                  CROSSING UP
                </DarkButton>
                <DarkButton
                  variant={filters.emaCondition === 'CROSSING DOWN' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handleToggleChange('emaCondition', null, 'CROSSING DOWN')}
                  sx={{ py: 0.5, fontSize: '12px' }}
                >
                  CROSSING DOWN
                </DarkButton>
              </Box>
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* Add New Alert Button */}
        <Box sx={{ mt: 3 }}>
          <LoadingButton
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{
              py: 1.5,
              mb: isSmall ? 2 : 0
            }}
            onClick={handleCreateAlert}
            disabled={validateAlertForm().length > 0}
            loading={isCreatingAlert}
            loadingText="Creating Alert..."
          >
            Create Alert
          </LoadingButton>
        </Box>

        {/* Error and Success Messages */}
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMessage}
          </Alert>
        )}

        {/* Apply Button for mobile */}
        {isSmall && (
          <Box sx={{
            mt: 3,
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: '#0d1117',
            pt: 1,
            pb: 2,
            zIndex: 5,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            px: 1
          }}>
            <LoadingButton
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => {
                handleCreateAlert();
              }}
              disabled={validateAlertForm().length > 0}
              loading={isCreatingAlert}
              loadingText="Creating Alert..."
            >
              Apply & Close
            </LoadingButton>
            {/* Extra space at bottom for mobile */}
            <Box sx={{ height: '70px' }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}));

// Memoize FilterSidebar with proper comparison
export default memo(FilterSidebar, (prevProps, nextProps) => {
  return prevProps.selectedSymbol === nextProps.selectedSymbol &&
         prevProps.onAlertCreated === nextProps.onAlertCreated;
});
