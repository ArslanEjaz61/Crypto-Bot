import React, { useState } from 'react';
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
  styled
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';

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
  '&:before': {
    display: 'none',
  },
  '& .MuiAccordionSummary-root': {
    minHeight: 'auto',
    padding: '8px 0',
  },
  '& .MuiAccordionSummary-content': {
    margin: '6px 0',
  },
  '& .MuiAccordionDetails-root': {
    padding: '0 8px 8px 8px',
  },
});

const CustomAccordionSummary = styled(AccordionSummary)({
  '& .MuiAccordionSummary-expandIconWrapper': {
    color: 'white',
  },
});

const DarkTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#151b26',
    color: 'white',
    '& fieldset': {
      borderColor: '#30363d',
    },
    '&:hover fieldset': {
      borderColor: '#4f80ff',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4f80ff',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#8b949e',
  },
  '& .MuiInputAdornment-root': {
    color: '#8b949e',
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
  '&:hover': {
    backgroundColor: '#1c2637',
    borderColor: '#4f80ff',
  },
  '&.MuiButton-contained': {
    backgroundColor: '#4f80ff',
    color: 'white',
    '&:hover': {
      backgroundColor: '#3b6ae8',
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
    color: 'white',
    fontSize: '0.875rem',
  },
  marginLeft: '-6px', // Adjust for better alignment with the screenshot
  '& .MuiCheckbox-root': {
    padding: '2px 6px 2px 2px',
  },
});

const DarkTypography = styled(Typography)({
  color: 'white',
});

const FilterSidebar = ({ filters, setFilters }) => {
  // Handle checkbox change
  const handleCheckboxChange = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [value]: !prev[category]?.[value]
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

  return (
    <Paper sx={{ 
      bgcolor: '#0d1117', 
      borderRadius: 2,
      height: '100%', 
      p: 2,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 100px)',
      color: 'white'
    }}>
      <Box component="aside" sx={{ color: 'text.primary' }}>
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
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
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

        {/* Volume Section */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="volume-content"
            id="volume-header"
          >
            <DarkTypography>Volume</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DarkTypography variant="body2">Min</DarkTypography>
              <DarkTextField 
                size="small"
                variant="outlined"
                fullWidth
                value={filters.volume?.min || ''}
                onChange={(e) => handleTextChange('volume', { ...filters.volume, min: e.target.value })}
              />
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* Display Chart */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="display-chart-content"
            id="display-chart-header"
          >
            <DarkTypography>Display Chart</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <StyledFormControlLabel
                control={
                  <CustomCheckbox 
                    checked={filters.displayChart?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('displayChart', '1HR')}
                  />
                }
                label="1HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox 
                    checked={filters.displayChart?.['4HR'] || false} 
                    onChange={() => handleCheckboxChange('displayChart', '4HR')}
                  />
                }
                label="4HR"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox 
                    checked={filters.displayChart?.D || false} 
                    onChange={() => handleCheckboxChange('displayChart', 'D')}
                  />
                }
                label="D"
              />
              <StyledFormControlLabel
                control={
                  <CustomCheckbox 
                    checked={filters.displayChart?.W || false} 
                    onChange={() => handleCheckboxChange('displayChart', 'W')}
                  />
                }
                label="W"
              />
            </FormGroup>
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
            <FormGroup row>
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
            </FormGroup>
            
            {/* Percentage % */}
            <Box sx={{ mt: 1 }}>
              <DarkTypography variant="body2" gutterBottom>Percentage %</DarkTypography>
              <DarkTextField 
                size="small"
                variant="outlined"
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">%</InputAdornment>,
                }}
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
            <FormGroup row>
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
            </FormGroup>
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
            <FormGroup row>
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
            </FormGroup>
            <FormGroup row>
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
            </FormGroup>
            
            {/* Condition */}
            <Box sx={{ mt: 1 }}>
              <DarkTypography variant="body2" gutterBottom>Condition:</DarkTypography>
              <DarkTextField 
                size="small"
                variant="outlined"
                fullWidth
                value={filters.candleCondition || 'Candle Above Open'}
                onChange={(e) => handleTextChange('candleCondition', e.target.value)}
              />
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
            <FormGroup row>
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
            </FormGroup>
            <FormGroup row>
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
            </FormGroup>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
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
            
            <Box sx={{ mt: 2 }}>
              <DarkToggleButtonGroup
                value={filters.rsiCondition || 'ABOVE'}
                exclusive
                onChange={(e, val) => handleToggleChange('rsiCondition', e, val)}
                aria-label="RSI condition"
                fullWidth
              >
                <DarkToggleButton value="ABOVE" aria-label="above">
                  ABOVE
                </DarkToggleButton>
                <DarkToggleButton value="BELOW" aria-label="below">
                  BELOW
                </DarkToggleButton>
              </DarkToggleButtonGroup>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <DarkButton variant="outlined" fullWidth>CROSSING UP</DarkButton>
                <DarkButton variant="outlined" fullWidth>CROSSING DOWN</DarkButton>
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
            <FormGroup row>
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
            </FormGroup>
            <FormGroup row>
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
            </FormGroup>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
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
            
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <DarkButton variant="outlined" fullWidth>ABOVE</DarkButton>
                <DarkButton variant="outlined" fullWidth>BELOW</DarkButton>
                <DarkButton variant="contained" color="primary" fullWidth>CROSSING UP</DarkButton>
                <DarkButton variant="outlined" fullWidth>CROSSING DOWN</DarkButton>
              </Box>
            </Box>
          </AccordionDetails>
        </DarkAccordion>

        {/* Volume Spike */}
        <DarkAccordion defaultExpanded>
          <CustomAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="volume-spike-content"
            id="volume-spike-header"
          >
            <DarkTypography>Volume Spike ≥ k x avg</DarkTypography>
          </CustomAccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DarkTypography variant="body2">k =</DarkTypography>
              <DarkTextField 
                size="small"
                variant="outlined"
                value={filters.volumeSpikeK || '2'}
                onChange={(e) => handleTextChange('volumeSpikeK', e.target.value)}
                sx={{ width: '100px' }}
              />
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
            sx={{ py: 1.5 }}
          >
            New Alert
          </DarkButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default FilterSidebar;
