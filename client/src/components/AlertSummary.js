import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Chip,
  Divider
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const AlertSummary = ({ alert }) => {
  if (!alert) {
    return (
      <Paper sx={{ p: 3, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" align="center">
          No recent alerts available
        </Typography>
      </Paper>
    );
  }

  const isPositive = (alert.priceChange || 0) > 0;

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          {alert.symbol}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip 
            icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={`${isPositive ? '+' : ''}${alert.priceChange ? alert.priceChange.toFixed(2) : '0.00'}%`}
            color={isPositive ? 'success' : 'error'}
            variant="filled"
            sx={{ mr: 1, fontWeight: 'bold' }}
          />
          <Typography variant="h6" color="text.primary">
            ${alert.price ? alert.price.toFixed(4) : '0.0000'}
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Volume (24h)
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              ${formatNumber(alert.volume || 0)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              RSI (1h)
            </Typography>
            <Typography 
              variant="body1" 
              fontWeight="medium"
              color={getRSIColor(alert.rsi_1h)}
            >
              {alert.rsi_1h ? alert.rsi_1h.toFixed(2) : 'N/A'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Market Cap
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              ${formatNumber(alert.marketCap || 0)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Alert Time
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatTime(alert.createdAt)}
            </Typography>
          </Box>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Alert Condition
        </Typography>
        <Typography variant="body1">
          {alert.condition || 'Price alert'}
        </Typography>
      </Box>
    </Paper>
  );
};

// Helper functions
const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
         ' ' + date.toLocaleDateString();
};

const getRSIColor = (rsi) => {
  if (!rsi) return 'text.primary';
  if (rsi >= 70) return 'error.main';
  if (rsi <= 30) return 'success.main';
  return 'text.primary';
};

export default AlertSummary;
