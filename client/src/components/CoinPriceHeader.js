import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useCrypto } from '../context/CryptoContext';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const CoinPriceHeader = ({ symbol }) => {
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
  
  // Get symbol display (BTC instead of BTCUSDT)
  const getDisplaySymbol = () => {
    return symbolStr.replace('USDT', '');
  };
  
  // Format the coin name based on symbol
  const getCoinName = () => {
    const names = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'ADAUSDT': 'Cardano',
      'LINKUSDT': 'Chainlink',
      'DOTUSDT': 'Polkadot',
      'SOLUSDT': 'Solana'
    };
    return names[symbolStr] || symbolStr.replace('USDT', '');
  };
  
  return (
    <Paper 
      sx={{ 
        bgcolor: '#0A0E17',
        color: 'white',
        p: 2,
        mb: 1,
        borderRadius: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
      elevation={0}
    >
      <Box>
        <Typography variant="h6" fontWeight="600" component="div" sx={{ fontSize: '1.1rem' }}>
          {getDisplaySymbol()}/USDT
        </Typography>
        <Typography variant="body2" color="#94A3B8" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
          {getCoinName()} to USD Tether
        </Typography>
      </Box>
      
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="h6" fontWeight="600" component="div" sx={{ fontSize: '1.2rem' }}>
          {formatPrice(crypto.price)}
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            mt: 0.5
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: crypto.priceChange >= 0 ? '#10B981' : '#E11D48',
              mr: 1,
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            {crypto.priceChange >= 0 ? 
              <ArrowDropUpIcon fontSize="small" /> : 
              <ArrowDropDownIcon fontSize="small" />
            }
            {Math.abs(crypto.priceChange || 0).toFixed(2)}%
          </Box>
          <Typography variant="caption" color="#94A3B8" sx={{ fontSize: '0.7rem' }}>
            Vol. {crypto.volume ? Math.round(crypto.volume / 1000).toLocaleString() : 'N/A'}k • ${crypto.price ? (crypto.price * 10).toFixed(2) : 'N/A'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CoinPriceHeader;
