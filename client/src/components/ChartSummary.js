import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useCrypto } from '../context/CryptoContext';

const ChartSummary = ({ symbol }) => {
  const { cryptos } = useCrypto();
  
  // Ensure symbol is a string, not an object
  const symbolStr = React.useMemo(() => {
    return typeof symbol === 'object' ? 
      (symbol.symbol || 'BTCUSDT') : // Extract symbol property if it's an object
      String(symbol); // Convert to string otherwise
  }, [symbol]);
  
  // Find the selected crypto data
  const crypto = React.useMemo(() => {
    if (!cryptos || cryptos.length === 0 || !symbolStr) return null;
    return cryptos.find(c => c.symbol === symbolStr) || null;
  }, [cryptos, symbolStr]);
  
  // If no crypto data is found
  if (!crypto) {
    return null;
  }
  
  // Format price with commas
  const formatPrice = (price) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      });
    }
    return price.toFixed(4);
  };

  // Handle create alert button click
  const handleCreateAlert = () => {
    console.log(`Creating alert for ${symbol}`);
    // Add alert creation logic here
  };

  // Handle favorite button click
  const handleFavorite = () => {
    console.log(`Adding ${symbol} to favorites`);
    // Add favorite logic here
  };
  
  return (
    <Paper 
      sx={{ 
        bgcolor: '#0A0E17',
        color: 'white',
        borderRadius: 1,
        p: 2,
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
      elevation={0}
    >
      {/* Chart data summary */}
      <Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="#94A3B8" sx={{ width: '75px' }}>
              Change:
            </Typography>
            <Typography 
              variant="body2" 
              fontWeight="medium"
              color={crypto.priceChange >= 0 ? '#10B981' : '#E11D48'}
            >
              {crypto.priceChange >= 0 ? '+' : ''}{crypto.priceChange?.toFixed(2)}%
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="#94A3B8" sx={{ width: '75px' }}>
              Last Price:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatPrice(crypto.price)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="#94A3B8" sx={{ width: '75px' }}>
              Volume:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {crypto.volume ? Math.round(crypto.volume / 1000).toLocaleString() : 'N/A'}k +{crypto.price ? (crypto.price * 10).toFixed(3) : 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button
          variant="contained"
          startIcon={<NotificationsActiveIcon />}
          onClick={handleCreateAlert}
          sx={{
            bgcolor: '#0066FF',
            color: 'white',
            borderRadius: '50px',
            textTransform: 'none',
            '&:hover': {
              bgcolor: '#0055DD'
            },
            px: 3
          }}
        >
          Create Alert
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<StarBorderIcon />}
          onClick={handleFavorite}
          sx={{
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#94A3B8',
            borderRadius: '50px',
            textTransform: 'none',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.4)',
              bgcolor: 'rgba(255,255,255,0.05)'
            },
            px: 3
          }}
        >
          Favorite
        </Button>
      </Box>
    </Paper>
  );
};

export default ChartSummary;
