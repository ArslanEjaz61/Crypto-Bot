import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUsdtPairs } from '../context/USDTPairsContext';
import { useSelectedPair } from '../context/SelectedPairContext';

const USDTMarketPanel = ({ onSelectCoin, filterSidebarRef }) => {
  const {
    filteredUsdtPairs,
    loading,
    error,
    loadUsdtPairs,
    toggleUsdtFavorite,
    updateUsdtFilter,
    filter
  } = useUsdtPairs();
  
  const { selectSymbol } = useSelectedPair();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  // Load USDT pairs on component mount
  useEffect(() => {
    loadUsdtPairs(1, 100); // Load first 100 USDT pairs
  }, [loadUsdtPairs]);

  // Handle search
  const handleSearch = useCallback((event) => {
    const value = event.target.value;
    setSearchTerm(value);
    updateUsdtFilter({ search: value });
  }, [updateUsdtFilter]);

  // Handle favorites toggle
  const handleFavoritesToggle = useCallback(() => {
    const newShowFavorites = !showFavorites;
    setShowFavorites(newShowFavorites);
    updateUsdtFilter({ favorites: newShowFavorites });
  }, [showFavorites, updateUsdtFilter]);

  // Handle coin selection
  const handleCoinSelect = useCallback((pair) => {
    console.log(`USDT Panel: Selected ${pair.symbol}`);
    selectSymbol(pair.symbol);
    if (onSelectCoin) {
      onSelectCoin(pair);
    }
  }, [selectSymbol, onSelectCoin]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (event, symbol) => {
    event.stopPropagation();
    await toggleUsdtFavorite(symbol);
  }, [toggleUsdtFavorite]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadUsdtPairs(1, 100, true); // Force refresh
  }, [loadUsdtPairs]);

  // Memoized filtered pairs for performance
  const displayPairs = useMemo(() => {
    return filteredUsdtPairs.slice(0, 50); // Show first 50 for performance
  }, [filteredUsdtPairs]);

  // Format price with appropriate decimals
  const formatPrice = (price) => {
    if (!price) return '0.00';
    const num = parseFloat(price);
    if (num >= 1) return num.toFixed(2);
    if (num >= 0.01) return num.toFixed(4);
    return num.toFixed(8);
  };

  // Format volume
  const formatVolume = (volume) => {
    if (!volume) return '0';
    const num = parseFloat(volume);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        backgroundColor: '#1a1a1a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            USDT Pairs
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`${filteredUsdtPairs.length} pairs`}
              size="small"
              sx={{
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                color: '#0066FF',
                fontSize: '12px'
              }}
            />
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={loading}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search USDT pairs..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
              </InputAdornment>
            ),
            sx: {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0066FF',
              },
            }
          }}
        />

        {/* Favorites Toggle */}
        <Box sx={{ mt: 1 }}>
          <Chip
            label="Favorites Only"
            clickable
            onClick={handleFavoritesToggle}
            variant={showFavorites ? "filled" : "outlined"}
            size="small"
            sx={{
              color: showFavorites ? 'white' : 'rgba(255, 255, 255, 0.7)',
              backgroundColor: showFavorites ? '#0066FF' : 'transparent',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                backgroundColor: showFavorites ? '#0052CC' : 'rgba(255, 255, 255, 0.05)',
              }
            }}
          />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} sx={{ color: '#0066FF' }} />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}>
              {error}
            </Alert>
          </Box>
        )}

        {!loading && !error && displayPairs.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              No USDT pairs found
            </Typography>
          </Box>
        )}

        {!loading && !error && displayPairs.length > 0 && (
          <List sx={{ p: 0, overflow: 'auto', height: '100%' }}>
            {displayPairs.map((pair, index) => (
              <React.Fragment key={pair.symbol}>
                <ListItem
                  component="div"
                  onClick={() => handleCoinSelect(pair)}
                  sx={{
                    cursor: 'pointer',
                    py: 1.5,
                    px: 2,
                    '&:hover': {
                      backgroundColor: alpha('#0066FF', 0.05),
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                            {pair.symbol}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleFavoriteToggle(e, pair.symbol)}
                            sx={{ 
                              color: pair.isFavorite ? '#FFD700' : 'rgba(255, 255, 255, 0.3)',
                              '&:hover': { color: '#FFD700' }
                            }}
                          >
                            {pair.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: parseFloat(pair.priceChangePercent) >= 0 ? '#4CAF50' : '#F44336',
                            fontWeight: 500
                          }}
                        >
                          ${formatPrice(pair.price)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: parseFloat(pair.priceChangePercent) >= 0 ? '#4CAF50' : '#F44336'
                          }}
                        >
                          {parseFloat(pair.priceChangePercent) >= 0 ? '+' : ''}{parseFloat(pair.priceChangePercent || 0).toFixed(2)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Vol: {formatVolume(pair.volume)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < displayPairs.length - 1 && (
                  <Box sx={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)', mx: 2 }} />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default USDTMarketPanel;
