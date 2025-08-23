import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const CoinMetrics = ({ symbol = 'BTCUSDT', price = '0.00', volume = '0.00', rsi = 'N/A', alertTime = null, trend = 'neutral' }) => {
  // Format price with commas for thousands
  const formattedPrice = parseFloat(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Format volume
  const formattedVolume = parseFloat(volume).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Determine trend color
  const trendColor = trend === 'up' ? '#4caf50' : trend === 'down' ? '#f44336' : '#9e9e9e';

  return (
    <Paper sx={{ p: 2, mb: 1, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          {/* Symbol and Trend */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
              {symbol}
            </Typography>
            <Box 
              sx={{ 
                ml: 1, 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                bgcolor: trendColor 
              }} 
            />
          </Box>
          
          {/* Metrics */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Volume (24h)</Typography>
              <Typography variant="body2">${formattedVolume}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">RSI</Typography>
              <Typography variant="body2">{rsi}</Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Price and Alert Time */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: trendColor }}>
            ${formattedPrice}
          </Typography>
          {alertTime && (
            <Typography variant="caption" color="text.secondary">
              {alertTime}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default CoinMetrics;
