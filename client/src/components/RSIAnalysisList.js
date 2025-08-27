import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';

const RSIAnalysisList = () => {
  const { alerts, loading } = useAlert();
  const { cryptos } = useCrypto();
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filter, setFilter] = useState({
    symbol: '',
    rsiLevel: 'all', // 'all', 'oversold', 'overbought', 'neutral'
  });

  // Filter alerts when alerts or filter changes
  useEffect(() => {
    if (!alerts || alerts.length === 0) {
      setFilteredAlerts([]);
      return;
    }

    // Get all alerts with RSI data added
    const alertsWithRSI = alerts.map(alert => {
      const crypto = cryptos.find(c => c.symbol === alert.symbol);
      return {
        ...alert,
        rsi: crypto?.rsi || null,
        price: crypto?.price || alert.currentPrice
      };
    });

    // Apply filters
    const filtered = alertsWithRSI.filter(alert => {
      // Filter by symbol
      if (filter.symbol && !alert.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) {
        return false;
      }

      // Filter by RSI level
      if (filter.rsiLevel !== 'all') {
        if (!alert.rsi) return false;
        
        if (filter.rsiLevel === 'oversold' && alert.rsi >= 30) {
          return false;
        }
        if (filter.rsiLevel === 'overbought' && alert.rsi <= 70) {
          return false;
        }
        if (filter.rsiLevel === 'neutral' && (alert.rsi < 30 || alert.rsi > 70)) {
          return false;
        }
      }

      return true;
    });

    // Sort by RSI value (lowest to highest)
    filtered.sort((a, b) => {
      if (a.rsi === null) return 1;
      if (b.rsi === null) return -1;
      return a.rsi - b.rsi;
    });

    setFilteredAlerts(filtered);
  }, [alerts, cryptos, filter]);

  // Handler for filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get RSI indicator color
  const getRsiColor = (rsi) => {
    if (rsi === null) return 'default';
    if (rsi <= 30) return 'success'; // Oversold - Good buying opportunity
    if (rsi >= 70) return 'error';   // Overbought - Potential sell
    return 'primary';                // Neutral
  };

  // Get RSI level text
  const getRsiLevelText = (rsi) => {
    if (rsi === null) return 'Unknown';
    if (rsi <= 30) return 'Oversold';
    if (rsi >= 70) return 'Overbought';
    return 'Neutral';
  };

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        RSI Analysis for Alerts
      </Typography>
      
      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Filter by Symbol"
            name="symbol"
            value={filter.symbol}
            onChange={handleFilterChange}
            variant="outlined"
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="rsi-filter-label">RSI Level</InputLabel>
            <Select
              labelId="rsi-filter-label"
              name="rsiLevel"
              value={filter.rsiLevel}
              onChange={handleFilterChange}
              label="RSI Level"
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="oversold">Oversold (≤ 30)</MenuItem>
              <MenuItem value="overbought">Overbought (≥ 70)</MenuItem>
              <MenuItem value="neutral">Neutral (30-70)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table aria-label="RSI analysis table">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Current Price</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>RSI (14)</TableCell>
                <TableCell>Signal</TableCell>
                <TableCell>Alert Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert._id}>
                    <TableCell component="th" scope="row">
                      {alert.symbol}
                    </TableCell>
                    <TableCell>
                      {typeof alert.price === 'number' 
                        ? alert.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8
                          })
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {alert.targetType === 'price'
                        ? alert.targetValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8
                          })
                        : `${alert.targetValue}%`
                      }
                      {alert.direction === '>' ? ' ↑' : alert.direction === '<' ? ' ↓' : ' ↕'}
                    </TableCell>
                    <TableCell>
                      {alert.rsi !== null ? (
                        <Chip
                          label={alert.rsi.toFixed(2)}
                          color={getRsiColor(alert.rsi)}
                          size="small"
                        />
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRsiLevelText(alert.rsi)}
                        color={getRsiColor(alert.rsi)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.isActive ? 'Active' : 'Inactive'} 
                        color={alert.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No alerts found. Try adjusting your filters or create new alerts.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default RSIAnalysisList;
