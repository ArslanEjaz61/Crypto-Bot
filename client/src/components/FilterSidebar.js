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
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
      bgcolor: 'background.paper', 
      borderRadius: 2,
      height: '100%', 
      p: 2,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 100px)'
    }}>
      <Box component="aside" sx={{ color: 'text.primary' }}>
        {/* Market Section */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="market-content"
            id="market-header"
          >
            <Typography>Market</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.market?.SPOT || false} 
                    onChange={() => handleCheckboxChange('market', 'SPOT')}
                  />
                }
                label="SPOT"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Exchange Section */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="exchange-content"
            id="exchange-header"
          >
            <Typography>Exchange</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.exchange?.BINANCE || false} 
                    onChange={() => handleCheckboxChange('exchange', 'BINANCE')}
                  />
                }
                label="BINANCE"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Pair Section */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="pair-content"
            id="pair-header"
          >
            <Typography>Pair</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.pair?.USDT || false} 
                    onChange={() => handleCheckboxChange('pair', 'USDT')}
                  />
                }
                label="USDT"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Min. Daily Section */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="min-daily-content"
            id="min-daily-header"
          >
            <Typography>Min. Daily</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['10K'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '10K')}
                  />
                }
                label="10k"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['100K'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '100K')}
                  />
                }
                label="100K"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['500K'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '500K')}
                  />
                }
                label="500K"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['1MN'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '1MN')}
                  />
                }
                label="1MN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['2MN'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '2MN')}
                  />
                }
                label="2MN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['5MN'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '5MN')}
                  />
                }
                label="5MN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['10MN'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '10MN')}
                  />
                }
                label="10MN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['25MN'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '25MN')}
                  />
                }
                label="25MN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.minDaily?.['50MN_PLUS'] || false} 
                    onChange={() => handleCheckboxChange('minDaily', '50MN_PLUS')}
                  />
                }
                label="50MN and Above"
                sx={{ gridColumn: '1 / span 2' }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Volume Section */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="volume-content"
            id="volume-header"
          >
            <Typography>Volume</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Min</Typography>
              <TextField 
                size="small"
                variant="outlined"
                fullWidth
                value={filters.volume?.min || ''}
                onChange={(e) => handleTextChange('volume', { ...filters.volume, min: e.target.value })}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Display Chart */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="display-chart-content"
            id="display-chart-header"
          >
            <Typography>Display Chart</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.displayChart?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('displayChart', '1HR')}
                  />
                }
                label="1HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.displayChart?.['4HR'] || false} 
                    onChange={() => handleCheckboxChange('displayChart', '4HR')}
                  />
                }
                label="4HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.displayChart?.D || false} 
                    onChange={() => handleCheckboxChange('displayChart', 'D')}
                  />
                }
                label="D"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.displayChart?.W || false} 
                    onChange={() => handleCheckboxChange('displayChart', 'W')}
                  />
                }
                label="W"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Change % */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="change-percent-content"
            id="change-percent-header"
          >
            <Typography>Change %</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.changePercent?.['1MIN'] || false} 
                    onChange={() => handleCheckboxChange('changePercent', '1MIN')}
                  />
                }
                label="1MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.changePercent?.['5MIN'] || false} 
                    onChange={() => handleCheckboxChange('changePercent', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.changePercent?.['15MIN'] || false} 
                    onChange={() => handleCheckboxChange('changePercent', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.changePercent?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('changePercent', '1HR')}
                  />
                }
                label="1HR"
              />
            </FormGroup>
            
            {/* Percentage % */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom>Percentage %</Typography>
              <TextField 
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
        </Accordion>

        {/* Alert Count */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="alert-count-content"
            id="alert-count-header"
          >
            <Typography>Alert Count</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.alertCount?.['5MIN'] || false} 
                    onChange={() => handleCheckboxChange('alertCount', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.alertCount?.['15MIN'] || false} 
                    onChange={() => handleCheckboxChange('alertCount', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.alertCount?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('alertCount', '1HR')}
                  />
                }
                label="1HR"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Candle */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="candle-content"
            id="candle-header"
          >
            <Typography>Candle</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.['5MIN'] || false} 
                    onChange={() => handleCheckboxChange('candle', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.['15MIN'] || false} 
                    onChange={() => handleCheckboxChange('candle', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('candle', '1HR')}
                  />
                }
                label="1HR"
              />
            </FormGroup>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.['4HR'] || false} 
                    onChange={() => handleCheckboxChange('candle', '4HR')}
                  />
                }
                label="4HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.['12HR'] || false} 
                    onChange={() => handleCheckboxChange('candle', '12HR')}
                  />
                }
                label="12HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.D || false} 
                    onChange={() => handleCheckboxChange('candle', 'D')}
                  />
                }
                label="D"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.candle?.W || false} 
                    onChange={() => handleCheckboxChange('candle', 'W')}
                  />
                }
                label="W"
              />
            </FormGroup>
            
            {/* Condition */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom>Condition:</Typography>
              <TextField 
                size="small"
                variant="outlined"
                fullWidth
                value={filters.candleCondition || 'Candle Above Open'}
                onChange={(e) => handleTextChange('candleCondition', e.target.value)}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* RSI Range */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="rsi-range-content"
            id="rsi-range-header"
          >
            <Typography>RSI Range</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.rsiRange?.['5MIN'] || false} 
                    onChange={() => handleCheckboxChange('rsiRange', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.rsiRange?.['15MIN'] || false} 
                    onChange={() => handleCheckboxChange('rsiRange', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.rsiRange?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('rsiRange', '1HR')}
                  />
                }
                label="1HR"
              />
            </FormGroup>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.rsiRange?.['4HR'] || false} 
                    onChange={() => handleCheckboxChange('rsiRange', '4HR')}
                  />
                }
                label="4HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.rsiRange?.['12HR'] || false} 
                    onChange={() => handleCheckboxChange('rsiRange', '12HR')}
                  />
                }
                label="12HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.rsiRange?.D || false} 
                    onChange={() => handleCheckboxChange('rsiRange', 'D')}
                  />
                }
                label="D"
              />
            </FormGroup>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="body2" gutterBottom>RSI Period</Typography>
                <TextField 
                  size="small"
                  variant="outlined"
                  value={filters.rsiPeriod || '14'}
                  onChange={(e) => handleTextChange('rsiPeriod', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>
              
              <Box>
                <Typography variant="body2" gutterBottom>Level (1-100)</Typography>
                <TextField 
                  size="small"
                  variant="outlined"
                  value={filters.rsiLevel || '70'}
                  onChange={(e) => handleTextChange('rsiLevel', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <ToggleButtonGroup
                value={filters.rsiCondition || 'ABOVE'}
                exclusive
                onChange={(e, val) => handleToggleChange('rsiCondition', e, val)}
                aria-label="RSI condition"
                fullWidth
              >
                <ToggleButton value="ABOVE" aria-label="above">
                  ABOVE
                </ToggleButton>
                <ToggleButton value="BELOW" aria-label="below">
                  BELOW
                </ToggleButton>
              </ToggleButtonGroup>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <Button variant="outlined" fullWidth>CROSSING UP</Button>
                <Button variant="outlined" fullWidth>CROSSING DOWN</Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* EMA Fast/Slow */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="ema-content"
            id="ema-header"
          >
            <Typography>EMA Fast / Slow</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.ema?.['5MIN'] || false} 
                    onChange={() => handleCheckboxChange('ema', '5MIN')}
                  />
                }
                label="5MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.ema?.['15MIN'] || false} 
                    onChange={() => handleCheckboxChange('ema', '15MIN')}
                  />
                }
                label="15MIN"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.ema?.['1HR'] || false} 
                    onChange={() => handleCheckboxChange('ema', '1HR')}
                  />
                }
                label="1HR"
              />
            </FormGroup>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.ema?.['4HR'] || false} 
                    onChange={() => handleCheckboxChange('ema', '4HR')}
                  />
                }
                label="4HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.ema?.['12HR'] || false} 
                    onChange={() => handleCheckboxChange('ema', '12HR')}
                  />
                }
                label="12HR"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.ema?.D || false} 
                    onChange={() => handleCheckboxChange('ema', 'D')}
                  />
                }
                label="D"
              />
            </FormGroup>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="body2" gutterBottom>Fast</Typography>
                <TextField 
                  size="small"
                  variant="outlined"
                  value={filters.emaFast || '12'}
                  onChange={(e) => handleTextChange('emaFast', e.target.value)}
                  sx={{ width: '100px' }}
                />
              </Box>
              
              <Box>
                <Typography variant="body2" gutterBottom>Slow</Typography>
                <TextField 
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
                <Button variant="outlined" fullWidth>ABOVE</Button>
                <Button variant="outlined" fullWidth>BELOW</Button>
                <Button variant="contained" color="primary" fullWidth>CROSSING UP</Button>
                <Button variant="outlined" fullWidth>CROSSING DOWN</Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Volume Spike */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="volume-spike-content"
            id="volume-spike-header"
          >
            <Typography>Volume Spike ≥ k x avg</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">k =</Typography>
              <TextField 
                size="small"
                variant="outlined"
                value={filters.volumeSpikeK || '2'}
                onChange={(e) => handleTextChange('volumeSpikeK', e.target.value)}
                sx={{ width: '100px' }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Add New Alert Button */}
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            size="large"
            sx={{ py: 1.5 }}
          >
            New Alert
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default FilterSidebar;
