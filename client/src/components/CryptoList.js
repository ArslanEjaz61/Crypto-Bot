import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  List,
  ListItem,
  Divider
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FavoriteIcon from '@mui/icons-material/Favorite';

const CryptoList = ({ cryptos = [] }) => {
  // Currency icons with background colors
  const getCurrencyIcon = (symbol) => {
    const firstLetter = symbol.charAt(0);
    let bgColor;
    
    // Define background colors based on currency
    switch(firstLetter) {
      case 'B': bgColor = '#F7931A'; break; // Bitcoin orange
      case 'E': bgColor = '#627EEA'; break; // Ethereum blue
      case 'A': bgColor = '#0033AD'; break; // Cardano blue
      case 'L': bgColor = '#345D9D'; break; // Chainlink blue
      case 'D': bgColor = '#E41E13'; break; // Polkadot red
      default: bgColor = '#333333';
    }
    
    return (
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 16,
          mr: 2
        }}
      >
        {firstLetter}
      </Box>
    );
  };
  
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
  
  // Map crypto symbols to their full names
  const getCryptoFullName = (symbol) => {
    const names = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'ADAUSDT': 'Cardano',
      'LINKUSDT': 'Chainlink',
      'DOTUSDT': 'Polkadot',
    };
    return names[symbol] || symbol;
  };
  
  return (
    <Paper 
      sx={{ 
        bgcolor: '#0A0E17', 
        borderRadius: 2,
        overflow: 'hidden',
        mt: 3,
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Top buttons */}
      <Box sx={{ display: 'flex', p: 2, pl: 3, pr: 3, gap: 2 }}>
        <Button
          variant="contained"
          disableElevation
          startIcon={<NotificationsActiveIcon sx={{ fontSize: 20 }} />}
          sx={{
            bgcolor: '#0066FF',
            color: 'white',
            borderRadius: 50,
            textTransform: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            px: 2.5,
            py: 0.8,
            '&:hover': {
              bgcolor: '#0055DD'
            }
          }}
        >
          Create Alert
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<FavoriteIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#94A3B8',
            borderRadius: 50,
            textTransform: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            px: 2.5,
            py: 0.8,
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.4)',
              bgcolor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Favorite
        </Button>
      </Box>
      
      {/* Market header */}
      <Box sx={{ p: 2, pl: 3, pt: 1, pb: 1 }}>
        <Typography color="#94A3B8" fontSize="0.95rem" fontWeight={500}>Market</Typography>
      </Box>
      
      {/* Crypto list */}
      <List sx={{ p: 0 }}>
        {cryptos.map((crypto, index) => (
          <React.Fragment key={crypto.symbol}>
            <ListItem 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                py: 2,
                px: 3,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.03)'
                }
              }}
            >
              {/* Left side - Symbol and name */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getCurrencyIcon(crypto.symbol)}
                <Box>
                  <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                    {crypto.symbol}
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                    {getCryptoFullName(crypto.symbol)}
                  </Typography>
                </Box>
              </Box>
              
              {/* Middle - Price and change */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography sx={{ color: 'white', fontSize: '0.95rem', fontWeight: 500 }}>
                  ${formatPrice(crypto.price)}
                </Typography>
                <Typography 
                  sx={{
                    color: crypto.priceChange >= 0 ? '#10B981' : '#EF4444',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  {crypto.priceChange >= 0 ? '+' : ''}{crypto.priceChange?.toFixed(2)}%
                </Typography>
              </Box>
              
              {/* Right side - Alerts count and view button */}
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 3 }}>
                <Box sx={{ mr: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                    Alerts: {crypto.alertsCount || 0}
                  </Typography>
                </Box>
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{
                    color: '#94A3B8',
                    minWidth: 50,
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  View
                </Button>
              </Box>
            </ListItem>
            {index < cryptos.length - 1 && (
              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default CryptoList;
