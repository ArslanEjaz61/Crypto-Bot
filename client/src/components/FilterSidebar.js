import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  FormGroup,
  InputAdornment,
  Paper,
  styled,
  useMediaQuery,
  useTheme,
  MenuItem
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useFilters } from '../context/FilterContext';
import { useAlert } from '../context/AlertContext';
import { useSocket } from '../context/SocketContext';
import eventBus from '../services/eventBus';

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

const FilterSidebar = ({ filters, setFilters, selectedSymbol, isMobile, onClose }) => {
  const { filters: ctxFilters, setFilters: setCtxFilters, getFilterValues } = useFilters();
  const { createAlert } = useAlert();
  const { showNotification } = useSocket();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // Fallback to context if props not supplied
  filters = filters || ctxFilters;
  setFilters = setFilters || setCtxFilters;
  // Handle checkbox change - toggle behavior
  const handleCheckboxChange = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [value]: !prev[category]?.[value] // Toggle the current value
      }
    }));
  };

  // Handle text field change
  const handleTextChange = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // Handle toggle button change
  const handleToggleChange = (category, event, newValue) => {
    if (newValue !== null) {
      setFilters(prev => ({
        ...prev,
        [category]: newValue
      }));
    }
  };

  // Effect to adjust accordion state based on screen size
  useEffect(() => {
    // You can add logic here to collapse accordions on small screens if needed
  }, [isSmall]);

  // Create alert using current sidebar filter selections
  const handleCreateAlert = async () => {
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
      const changePercentValue = filterValues.changePercent.percentage || 0;
      const alertCountTimeframe = filterValues.alertCount.timeframe;
      const alertCountEnabled = filterValues.alertCount.enabled;
      
      // Technical indicators with null handling
      const rsiConfig = filterValues.rsi;
      const emaConfig = filterValues.ema;
      const candleTimeframe = firstSelected(filters.candle) || null;

      const alertData = {
        symbol: selectedSymbol || 'BTCUSDT',
        direction: '>',
        targetType: 'percentage',
        targetValue: changePercentValue || 1, // Use filter percentage or default
        trackingMode: 'current',
        intervalMinutes: 60,
        volumeChangeRequired: 0,
        alertTime,
        comment: `Alert created from filter: ${changePercentTimeframe || 'Manual'} timeframe`,
        email: 'jamyasir0534@gmail.com', // Use your email from form
        
        // OHLCV-integrated Min Daily Volume
        minDailyVolume,
        
        // OHLCV-integrated Change % with timeframe
        changePercentTimeframe: changePercentTimeframe || null,
        changePercentValue: changePercentValue || 0,
        
        // Alert Count configuration
        alertCountTimeframe: alertCountTimeframe || null,
        alertCountEnabled: alertCountEnabled || false,
        
        // Candle configuration - null if not selected
        candleTimeframe: candleTimeframe || null,
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
          return conditionMap[condition] || 'NONE';
        })() : 'NONE',
        
        // RSI configuration - null if not selected
        rsiEnabled: Boolean(rsiConfig),
        rsiTimeframe: rsiConfig?.timeframe || null,
        rsiPeriod: rsiConfig?.period || 0,
        rsiCondition: rsiConfig?.condition?.replace(' ', '_') || 'NONE',
        rsiLevel: rsiConfig?.level || 0,
        
        // EMA configuration - null if not selected
        emaEnabled: Boolean(emaConfig),
        emaTimeframe: emaConfig?.timeframe || null,
        emaFastPeriod: emaConfig?.fastPeriod || 0,
        emaSlowPeriod: emaConfig?.slowPeriod || 0,
        emaCondition: emaConfig?.condition?.replace(' ', '_') || 'NONE',
        
        // Market filters (always active)
        market,
        exchange,
        tradingPair,
      };

      // Validate that essential data is present
      if (!selectedSymbol) {
        showNotification('Please select a trading pair first', 'error');
        return;
      }
      
      if (changePercentValue === 0 && !rsiConfig && !emaConfig && !candleTimeframe) {
        showNotification('Please set at least one condition (Change %, RSI, EMA, or Candle)', 'warning');
        return;
      }
      
      console.log('Creating alert with OHLCV data:', {
        symbol: alertData.symbol,
        minDailyVolume: alertData.minDailyVolume,
        changePercent: { timeframe: alertData.changePercentTimeframe, value: alertData.changePercentValue },
        alertCount: { timeframe: alertData.alertCountTimeframe, enabled: alertData.alertCountEnabled },
        rsi: rsiConfig,
        ema: emaConfig
      });
      
      const created = await createAlert(alertData);
      showNotification(`Alert created for ${alertData.symbol} with ${alertData.changePercentValue}% trigger`, 'success');
      eventBus.emit('ALERT_CREATED', created);
      
      // Reset percentage value after successful creation
      setFilters(prev => ({
        ...prev,
        percentageValue: null
      }));
    } catch (err) {
      console.error('Failed to create alert from sidebar:', err);
      showNotification(`Error creating alert: ${err.message || 'Unknown error'}`, 'error');
    }
  };

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
              onClick={onClose} 
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
                size="small"
                variant="outlined"
                fullWidth
                placeholder="%"
                value={filters.percentageValue || ''}
                onChange={(e) => handleTextChange('percentageValue', e.target.value)}
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
          <DarkButton 
            variant="contained" 
            color="primary" 
            fullWidth 
            size="large"
            sx={{ 
              py: 1.5,
              mb: isSmall ? 2 : 0
            }}
            onClick={handleCreateAlert}
          >
            New Alert
          </DarkButton>
        </Box>
        
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
            <DarkButton 
              variant="contained" 
              color="primary" 
              fullWidth 
              onClick={() => {
                handleCreateAlert();
                if (onClose) onClose();
              }}
            >
              Apply & Close
            </DarkButton>
          </Box>
        )}
        
        {isSmall && (
          <Box sx={{ height: '70px' }} /> /* Extra space at bottom for mobile */
        )}
      </Box>
    </Paper>
  );
};

export default FilterSidebar;
