import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  List,
  ListItem,
  Typography, 
  Button,
  Divider,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAlert } from '../context/AlertContext';

const CryptoList = ({ cryptos = [] }) => {
  const { deleteAlert } = useAlert();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingSymbol, setDeletingSymbol] = useState('');
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
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 14,
          mr: 2
        }}
      >
        {firstLetter}
      </Box>
    );
  };
  
  // Format price with commas
  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return '0.00';
    }
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
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Market header */}
      <Box sx={{ p: 1, pl: 2, pt: 1.5, pb: 1 }}>
        <Typography color="#94A3B8" fontSize="0.8rem" fontWeight={500}>Market</Typography>
      </Box>
      
      {/* Crypto list */}
      <List sx={{ p: 0 }}>
        {cryptos.map((crypto, index) => (
          <React.Fragment key={crypto.symbol}>
            <ListItem 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                px: 2,
                minHeight: 54,
                position: 'relative',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.03)'
                }
              }}
            >
              {/* Coin icon and name */}
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '100px', flex: 1.5 }}>
                {getCurrencyIcon(crypto.symbol)}
                <Box>
                  <Typography variant="subtitle2" fontWeight={500} color="white">
                    {crypto.symbol.replace('USDT', '')}
                  </Typography>
                  <Typography variant="caption" color="#94A3B8" fontSize="0.7rem">
                    {getCryptoFullName(crypto.symbol)}
                  </Typography>
                </Box>
              </Box>
              
              {/* Current price */}
              <Box sx={{ flex: 2, textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={600} color="white">
                  ${formatPrice(crypto.price)}
                </Typography>
              </Box>
              
              {/* Change */}
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <Chip 
                  label={
                    `${(crypto.priceChange || 0) >= 0 ? '+' : ''}${(crypto.priceChange || 0).toFixed(2)}%`
                  }
                  size="small"
                  sx={{
                    borderRadius: 1,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    bgcolor: (crypto.priceChange || 0) >= 0 ? '#10B981' : '#E11D48',
                    color: 'white',
                    height: '22px'
                  }}
                />
              </Box>
              
              {/* Alert count */}
              <Box sx={{ flex: 0.8, textAlign: 'center' }}>
                <Typography variant="caption" color="#94A3B8" fontWeight={500}>
                  {crypto.alertsCount || 0} alerts
                </Typography>
              </Box>
              
              {/* Delete button */}
              <Box sx={{ flex: 0.8, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DeleteIcon fontSize="small" />}
                  onClick={() => {
                    // Open delete confirmation dialog
                    setConfirmDelete(crypto.symbol);
                    setDeletingSymbol(crypto.symbol);
                  }}
                  sx={{
                    borderRadius: 1,
                    minWidth: '80px',
                    height: '28px',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    '&:hover': {
                      borderColor: '#ef4444',
                      bgcolor: 'rgba(239, 68, 68, 0.08)'
                    },
                    py: 0
                  }}
                >
                  Delete
                </Button>
              </Box>
            </ListItem>
            {index < cryptos.length - 1 && (
              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
            )}
          </React.Fragment>
        ))}
      </List>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          style: {
            backgroundColor: '#1E293B',
            color: 'white'
          }
        }}
      >
        <DialogTitle id="alert-dialog-title">
          Delete all alerts for {deletingSymbol}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: '#94A3B8' }}>
            This will permanently delete all alerts for {deletingSymbol}. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDelete(null)} 
            sx={{ color: '#94A3B8' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={async () => {
              try {
                // Get all alerts for this symbol from the API
                const response = await fetch('/api/alerts');
                const allAlerts = await response.json();
                
                // Filter alerts for the selected symbol
                const symbolAlerts = allAlerts.filter(alert => alert.symbol === confirmDelete);
                
                // Delete each alert for this symbol
                const deletePromises = symbolAlerts.map(alert => deleteAlert(alert._id));
                await Promise.all(deletePromises);
                
                console.log(`Deleted all alerts for ${confirmDelete}`);
              } catch (error) {
                console.error(`Error deleting alerts for ${confirmDelete}:`, error);
              } finally {
                setConfirmDelete(null);
              }
            }} 
            autoFocus
            variant="contained"
            sx={{ 
              bgcolor: '#ef4444',
              '&:hover': { bgcolor: '#dc2626' }
            }}
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CryptoList;
