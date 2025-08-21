import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  InputBase,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { useCrypto } from '../context/CryptoContext';
import { useFilters } from '../context/FilterContext';

const MarketPanel = ({ onSelectCoin }) => {
  const { cryptos, loading, error, toggleFavorite, checkAlertConditions, updateFilter, loadCryptos } = useCrypto();
  const { filters, getValidationFilters, hasActiveFilters } = useFilters();
  const [view, setView] = useState('market');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCryptos, setFilteredCryptos] = useState([]);
  const [meetingConditions, setMeetingConditions] = useState({});
  const [checkingConditions, setCheckingConditions] = useState(false);

  // Check which coins meet the alert conditions
  const checkCoinConditions = useCallback(async (coinList) => {
    if (!coinList || coinList.length === 0) return;
    setCheckingConditions(true);
    
    const results = {};
    const validationFilters = getValidationFilters();
    
    // Only proceed if there are actual filters to apply
    if (Object.keys(validationFilters).length === 0) {
      setMeetingConditions({});
      setCheckingConditions(false);
      return;
    }
    
    console.log('Validation filters:', validationFilters);
    
    // Process in batches to avoid too many simultaneous requests
    const batchSize = 5;
    for (let i = 0; i < coinList.length; i += batchSize) {
      const batch = coinList.slice(i, i + batchSize);
      const promises = batch.map(coin => 
        checkAlertConditions(coin.symbol, validationFilters)
          .then(result => {
            results[coin.symbol] = result.meetsConditions;
            return result;
          })
          .catch(err => {
            console.error(`Error checking conditions for ${coin.symbol}:`, err);
            results[coin.symbol] = false;
            return { meetsConditions: false };
          })
      );
      
      await Promise.all(promises);
    }
    
    setMeetingConditions(results);
    setCheckingConditions(false);
  }, [getValidationFilters, checkAlertConditions]);

  // Handle filter change events
  const handleFilterChange = (field, value) => {
    console.log('Filter changed:', field, value);
    
    // Update filter in context
    updateFilter({ [field]: value });
    
    // For all filter changes, make a direct API call to get fresh data without showing loading state
    loadCryptos(1, 50, true, true).then(result => {
      console.log('Filter applied with fresh data, result:', result);
    }).catch(error => {
      console.error('Error applying filter with fresh data:', error);
    });
  };

  // Fetch fresh data and then filter cryptos
  useEffect(() => {
    console.log('MarketPanel: Fetching fresh crypto data from API');
    // Always force refresh for direct API call with silent loading (true)
    loadCryptos(1, 50, true, true);
  }, [loadCryptos, filters.market, filters.minVolume]);
  
  // Filter and sort cryptos based on view and search term
  useEffect(() => {
    if (!cryptos) return;
    
    console.log('Applying filters to', cryptos.length, 'cryptos');

    let filtered = [...cryptos];

    // Apply market/favorite filter
    if (view === 'favorites') {
      filtered = filtered.filter(crypto => crypto.isFavorite);
    }

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        crypto => 
          crypto.symbol.toLowerCase().includes(term) ||
          (crypto.name && crypto.name.toLowerCase().includes(term))
      );
    }

    // Sort by market cap or volume
    filtered.sort((a, b) => {
      // First sort by favorites
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then sort by volume
      return b.volume - a.volume;
    });

    setFilteredCryptos(filtered);
    
    // Check which coins meet alert conditions if we have filters set    
    if (hasActiveFilters) {
      checkCoinConditions(filtered.slice(0, 20)); // Check top 20 coins initially
    } else {
      setMeetingConditions({});
    }
  }, [cryptos, view, searchTerm, filters, checkCoinConditions]);

  // Handle view change
  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  // Handle search input
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Format number with abbreviations
  const formatNumber = (num) => {
    if (!num) return '0';
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

  return (
    <Paper sx={{ 
      p: 2, 
      borderRadius: 2,
      bgcolor: 'background.paper',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Toggle buttons for Market/Favorites */}
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={handleViewChange}
        aria-label="market view"
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton value="market" aria-label="market">
          Market
        </ToggleButton>
        <ToggleButton value="favorites" aria-label="favorites">
          Favorites
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Search input */}
      <Box 
        sx={{ 
          p: '2px 4px', 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%',
          bgcolor: alpha('#000', 0.1),
          borderRadius: 1,
          mb: 2
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Search Coins"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Box>

      {/* Crypto list */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Only show error states, not loading states */}
        {error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="subtitle1" align="center" color="error" gutterBottom>
              Unable to load data
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ maxWidth: '80%' }}>
              {error || 'There was an issue connecting to the Binance API. Please try again later.'}
            </Typography>
          </Box>
        ) : filteredCryptos.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <ManageSearchIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
            <Typography align="center" variant="body2" color="text.secondary">
              {view === 'favorites' ? 'You have no favorite coins yet' : 'No coins match your search criteria'}
            </Typography>
          </Box>
        ) : !cryptos || cryptos.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <CurrencyExchangeIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
            <Typography align="center" variant="body2" color="text.secondary">
              No cryptocurrency data available
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {filteredCryptos.map((crypto, index) => (
              <React.Fragment key={crypto._id || crypto.symbol}>
                <ListItem
                  button
                  onClick={() => onSelectCoin && onSelectCoin(crypto)}
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {meetingConditions[crypto.symbol] && (
                              <NotificationsActiveIcon 
                                color="warning" 
                                fontSize="small" 
                                sx={{ mr: 0.5 }} 
                              />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                              {crypto.symbol}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(crypto.symbol);
                            }}
                            sx={{ p: 0.5 }}
                          >
                            {crypto.isFavorite ? (
                              <StarIcon fontSize="small" color="warning" />
                            ) : (
                              <StarBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            ${crypto.price ? crypto.price.toFixed(4) : '0.0000'}
                          </Typography>
                          {crypto.priceChange !== undefined && (
                            <Chip
                              icon={crypto.priceChange >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                              label={`${crypto.priceChange >= 0 ? '+' : ''}${crypto.priceChange?.toFixed(2)}%`}
                              color={crypto.priceChange >= 0 ? 'success' : 'error'}
                              size="small"
                              sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Vol: ${formatNumber(crypto.volume24h || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getRSILabel(crypto.rsi)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredCryptos.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};

// Helper function to get RSI label
const getRSILabel = (rsi) => {
  if (!rsi) return 'RSI: N/A';
  if (rsi >= 70) return `RSI: ${rsi.toFixed(0)} (Overbought)`;
  if (rsi <= 30) return `RSI: ${rsi.toFixed(0)} (Oversold)`;
  return `RSI: ${rsi.toFixed(0)}`;
};

export default MarketPanel;
