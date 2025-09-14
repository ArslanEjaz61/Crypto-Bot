import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
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
  alpha,
  Skeleton,
  CircularProgress,
  Button,
  Checkbox,
  FormControlLabel
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
import { useAlert } from '../context/AlertContext';
import { useSelectedPairs } from '../context/SelectedPairsContext';
import SmoothTransition from './SmoothTransition';
import { useDebounce, useThrottle } from '../utils/requestThrottle';

const MarketPanel = ({ onSelectCoin, onCreateAlert, filterSidebarRef }) => {
  const { cryptos, error, toggleFavorite, checkAlertConditions, loadCryptos } = useCrypto();
  const { filters, getValidationFilters, hasActiveFilters } = useFilters();
  const { alerts } = useAlert(); // Import to get active alerts
  const { 
    togglePairSelection, 
    selectAllPairs, 
    clearAllSelections, 
    isPairSelected, 
    getSelectedCount,
    getSelectedPairsArray 
  } = useSelectedPairs();
  const [view, setView] = useState('market');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeoutRef = useRef(null);
  // Remove unused state since we're using useMemo now
  // const [filteredCryptos, setFilteredCryptos] = useState([]);
  const [meetingConditions, setMeetingConditions] = useState({});
  const [, setCheckingConditions] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  // Throttled condition checking to prevent API spam
  const checkConditionsThrottled = useCallback(async () => {
    if (!hasActiveFilters) {
      setMeetingConditions({});
      return;
    }
    
    setCheckingConditions(true);
    const results = {};
    
    const validationFilters = getValidationFilters();
    const coinList = view === 'favorites' ? cryptos.filter(crypto => crypto.isFavorite) : cryptos;
    
    if (!coinList || coinList.length === 0) {
      setCheckingConditions(false);
      return;
    }
    
    // Get symbols with active alerts only
    const alertSymbols = new Set(
      alerts
        .filter(alert => alert.isActive)
        .map(alert => alert.symbol)
    );
    
    // Only check conditions for coins that have active alerts
    const coinsWithAlerts = coinList.filter(coin => alertSymbols.has(coin.symbol));
    
    console.log(`Checking conditions for ${coinsWithAlerts.length} coins with active alerts:`, 
      coinsWithAlerts.map(c => c.symbol));
    
    if (coinsWithAlerts.length === 0) {
      setMeetingConditions({});
      setCheckingConditions(false);
      return;
    }
    
    console.log('Validation filters:', validationFilters);
    
    // Process in batches to avoid too many simultaneous requests
    const batchSize = 5;
    for (let i = 0; i < coinsWithAlerts.length; i += batchSize) {
      const batch = coinsWithAlerts.slice(i, i + batchSize);
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
  }, [getValidationFilters, checkAlertConditions, alerts, view, cryptos]);
  
  // Apply throttling to condition checking (max once per 2 seconds)
  const checkConditions = useThrottle(checkConditionsThrottled, 2000);

  /* Filter functionality is handled directly in the component through the context */

  // Load crypto pairs based on FilterSidebar settings
  useEffect(() => {
    const usdtFilter = filters.pair?.USDT || false;
    const spotFilter = filters.market?.SPOT || false;
    
    console.log(`MarketPanel: Loading crypto pairs - USDT: ${usdtFilter}, Spot: ${spotFilter}`);
    loadCryptos(1, 5000, false, true, spotFilter, usdtFilter);
  }, [loadCryptos, filters.pair, filters.market]);

  // Memoized filtered cryptos for better performance
  const filteredCryptos = useMemo(() => {
    if (!cryptos) {
      return [];
    }

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

    // Return all filtered items (no artificial limit)
    return filtered;
  }, [cryptos, view, searchTerm]);

  // Handle select all checkbox
  const handleSelectAll = useCallback((event) => {
    const isChecked = event.target.checked;
    setSelectAllChecked(isChecked);
    
    if (view === 'favorites') {
      // In favorites tab, select all toggles favorite status for all visible pairs
      filteredCryptos.forEach(crypto => {
        if (isChecked && !crypto.isFavorite) {
          toggleFavorite(crypto.symbol);
        } else if (!isChecked && crypto.isFavorite) {
          toggleFavorite(crypto.symbol);
        }
      });
    } else {
      // In market tab, select all adds to favorites AND selects for alerts
      if (isChecked) {
        filteredCryptos.forEach(crypto => {
          if (!crypto.isFavorite) {
            toggleFavorite(crypto.symbol);
          }
          if (!isPairSelected(crypto.symbol)) {
            togglePairSelection(crypto.symbol);
          }
        });
      } else {
        filteredCryptos.forEach(crypto => {
          if (crypto.isFavorite) {
            toggleFavorite(crypto.symbol);
          }
          if (isPairSelected(crypto.symbol)) {
            togglePairSelection(crypto.symbol);
          }
        });
      }
    }
  }, [filteredCryptos, selectAllPairs, clearAllSelections, view, toggleFavorite, isPairSelected, togglePairSelection]);

  // Update select all checkbox based on current selections
  useEffect(() => {
    if (view === 'favorites') {
      // In favorites tab, check if all visible items are favorites
      const favoriteCount = filteredCryptos.filter(crypto => crypto.isFavorite).length;
      const totalCount = filteredCryptos.length;
      
      if (favoriteCount === 0) {
        setSelectAllChecked(false);
      } else if (favoriteCount === totalCount && totalCount > 0) {
        setSelectAllChecked(true);
      } else {
        setSelectAllChecked(false);
      }
    } else {
      // In market tab, use selected pairs count
      const selectedCount = getSelectedCount();
      const totalCount = filteredCryptos.length;
      
      if (selectedCount === 0) {
        setSelectAllChecked(false);
      } else if (selectedCount === totalCount && totalCount > 0) {
        setSelectAllChecked(true);
      } else {
        setSelectAllChecked(false);
      }
    }
  }, [getSelectedCount, filteredCryptos, view]);

  // Check conditions when filtered data changes (debounced)
  const debouncedCheckConditions = useDebounce(() => {
    if (hasActiveFilters) {
      checkConditions(); // Check conditions for coins with alerts
    } else {
      setMeetingConditions({});
    }
  }, 1000);
  
  useEffect(() => {
    debouncedCheckConditions();
  }, [hasActiveFilters, debouncedCheckConditions]);

  // Memoized view change handler
  const handleViewChange = useCallback((event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  }, []);

  // Memoized search handler with debounce
  const handleSearchChange = useCallback((event) => {
    const value = event.target.value;
    setSearchInput(value); // Immediately update input display
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debouncing the actual search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
  }, []);
  
  // Removed handleLoadMore function - loading all pairs at once

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
      {/* Debug information banner */}
      {error && (
        <Box sx={{ mb: 1, p: 1, bgcolor: 'error.main', color: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
          Error: {typeof error === 'string' ? error : 'Failed to fetch crypto data. Check server connection.'}
        </Box>
      )}
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
          value={searchInput}
          onChange={handleSearchChange}
        />
        <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Box>

      {/* Select All Checkbox */}
      {filteredCryptos.length > 0 && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectAllChecked}
                onChange={handleSelectAll}
                sx={{ color: '#60A5FA' }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#E2E8F0' }}>
                Select All ({getSelectedCount()} selected)
              </Typography>
            }
          />
        </Box>
      )}

      {/* Crypto list */}
      <SmoothTransition type="slide" direction="up" timeout={400}>
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
          {/* Only show error states, not loading states */}
          {error ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="subtitle1" align="center" color="error" gutterBottom>
                Error Loading Data
              </Typography>
              <Typography align="center" variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            </Box>
          ) : filteredCryptos.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <ManageSearchIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
              <Typography align="center" variant="body2" color="text.secondary">
                {view === 'favorites' ? 'You have no favorite coins yet' : 'No coins match your search criteria'}
              </Typography>
            </Box>
          ) : !cryptos ? (
            <SmoothTransition type="fade" timeout={500}>
              <Box>
                {[...Array(10)].map((_, index) => (
                  <Box key={index} sx={{ p: 1 }}>
                    <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mb: 1 }} />
                  </Box>
                ))}
              </Box>
            </SmoothTransition>
          ) : cryptos.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <CurrencyExchangeIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
              <Typography align="center" variant="subtitle1" color="text.secondary">
                No Market Data Available
              </Typography>
              <Typography align="center" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Unable to load cryptocurrency data from the server.
              </Typography>
              <Typography align="center" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Please check that the API server is running correctly.
              </Typography>
            </Box>
          ) : (
            filteredCryptos.map((crypto, index) => (
              <React.Fragment key={crypto.symbol}>
                <ListItem
                  sx={{
                    py: 1,
                    '&:hover': {
                      backgroundColor: alpha('#0066FF', 0.05),
                    },
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {/* Checkbox for pair selection and favorite toggle */}
                  <Checkbox
                    checked={view === 'favorites' ? crypto.isFavorite : isPairSelected(crypto.symbol)}
                    onChange={() => {
                      if (view === 'favorites') {
                        // In favorites tab, checkbox toggles favorite status
                        toggleFavorite(crypto.symbol);
                      } else {
                        // In market tab, checkbox adds to favorites AND selects for alerts
                        const isCurrentlySelected = isPairSelected(crypto.symbol);
                        
                        if (!isCurrentlySelected) {
                          // Adding to selection: add to favorites and select for alerts
                          toggleFavorite(crypto.symbol);
                          togglePairSelection(crypto.symbol);
                        } else {
                          // Removing from selection: remove from favorites and deselect
                          toggleFavorite(crypto.symbol);
                          togglePairSelection(crypto.symbol);
                        }
                      }
                    }}
                    sx={{ 
                      color: view === 'favorites' ? '#FFD700' : '#60A5FA',
                      mr: 1,
                      '& .MuiSvgIcon-root': { fontSize: 18 }
                    }}
                  />
                  
                  {/* Clickable area for coin selection */}
                  <Box
                    onClick={() => onSelectCoin && onSelectCoin(crypto)}
                    sx={{
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  >
                    <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {crypto.symbol}
                          </Typography>
                          {meetingConditions[crypto.symbol] && (
                            <Chip
                              icon={<NotificationsActiveIcon />}
                              label="Alert"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            ${parseFloat(crypto.price || 0).toFixed(4)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {crypto.priceChangePercent >= 0 ? (
                              <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            ) : (
                              <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                color: crypto.priceChangePercent >= 0 ? 'success.main' : 'error.main',
                                fontWeight: 500,
                              }}
                            >
                              {crypto.priceChangePercent >= 0 ? '+' : ''}
                              {parseFloat(crypto.priceChangePercent || 0).toFixed(2)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    }
                    secondary={
                      crypto.rsi && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {getRSILabel(crypto.rsi)}
                          </Typography>
                        </Box>
                      )
                    }
                    />
                  </Box>
                </ListItem>
                {index < filteredCryptos.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))
          )}
        </List>
        {/* Removed Load More Button - All USDT pairs loaded at once */}
      </SmoothTransition>
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

// Memoize MarketPanel to prevent unnecessary re-renders
export default memo(MarketPanel, (prevProps, nextProps) => {
  return prevProps.onSelectCoin === nextProps.onSelectCoin &&
         prevProps.onCreateAlert === nextProps.onCreateAlert;
});