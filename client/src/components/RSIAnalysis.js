import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Divider,
  Alert,
  FormHelperText,
  Autocomplete,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCrypto } from '../context/CryptoContext';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const RSIAnalysis = () => {
  const { cryptos, filteredCryptos, updateFilter, getRSI, toggleFavorite } = useCrypto();
  
  // State for RSI data
  const [rsiData, setRsiData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [coinOptions, setCoinOptions] = useState([]);
  const ITEMS_PER_PAGE = 20; // Increased from 10 to 20 items per page
  
  // Filter state
  const [filterValues, setFilterValues] = useState({
    market: 'USDT',
    minVolume: 1000000,
    period: 14,
    timeframe: '1h',
  });
  
  // Available timeframes
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '12h', '24h', '1d', '1w'];
  
  // Apply filters to cryptos list
  useEffect(() => {
    updateFilter({
      market: filterValues.market,
      minVolume: filterValues.minVolume,
    });
    
    // Prepare coin options for autocomplete search
    const options = filteredCryptos.map(crypto => ({
      symbol: crypto.symbol,
      label: crypto.symbol
    }));
    setCoinOptions(options);
  }, [filterValues.market, filterValues.minVolume, updateFilter, filteredCryptos]);
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    const sortedData = [...rsiData].sort((a, b) => {
      if (newValue === 0) return b.rsi - a.rsi; // Descending
      if (newValue === 1) return a.rsi - b.rsi; // Ascending
      return 0;
    });
    
    setRsiData(sortedData);
    
    // Filter the display data based on search term
    let dataToDisplay = sortedData;
    if (searchTerm) {
      dataToDisplay = dataToDisplay.filter(item => 
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(dataToDisplay);
    } else {
      setSearchResults([]);
    }
    
    setDisplayData(dataToDisplay.slice(0, ITEMS_PER_PAGE * page));
    setHasMore(dataToDisplay.length > ITEMS_PER_PAGE * page);
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (event, newTimeframe) => {
    if (newTimeframe !== null) {
      setSelectedTimeframe(newTimeframe);
      setFilterValues(prev => ({
        ...prev,
        timeframe: newTimeframe
      }));
    }
  };
  
  // Handle search input changes
  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    setPage(1); // Reset pagination when search changes
    
    if (newSearchTerm && rsiData.length > 0) {
      // Filter existing results
      const filteredResults = rsiData.filter(item => 
        item.symbol.toLowerCase().includes(newSearchTerm.toLowerCase())
      );
      setSearchResults(filteredResults);
      setDisplayData(filteredResults.slice(0, ITEMS_PER_PAGE));
      setHasMore(filteredResults.length > ITEMS_PER_PAGE);
    } else if (rsiData.length > 0) {
      // No search, show regular paginated data
      setSearchResults([]);
      setDisplayData(rsiData.slice(0, ITEMS_PER_PAGE));
      setHasMore(rsiData.length > ITEMS_PER_PAGE);
    }
  };
  
  // Load more data
  const handleLoadMore = () => {
    const nextPage = page + 1;
    const start = (nextPage - 1) * ITEMS_PER_PAGE;
    const end = nextPage * ITEMS_PER_PAGE;
    
    // Filter by search term if provided
    let dataToPage = rsiData;
    if (searchTerm) {
      dataToPage = searchResults;
    }
    
    if (start < dataToPage.length) {
      setDisplayData(prev => [...prev, ...dataToPage.slice(start, end)]);
      setPage(nextPage);
      setHasMore(end < dataToPage.length);
    } else {
      setHasMore(false);
    }
  };
  
  // Update display data based on page
  const updateDisplayData = (data, currentPage) => {
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    const newDisplayData = data.slice(startIndex, endIndex);
    setDisplayData(newDisplayData);
    setHasMore(endIndex < data.length);
  };
  
  // Categorize RSI
  const getRSICategory = (rsi) => {
    if (rsi < 30) return 'oversold';
    if (rsi > 70) return 'overbought';
    return 'neutral';
  };
  
  // Cache RSI results to prevent redundant calculations
  const [rsiCache, setRsiCache] = useState({});
  const [lastCalculation, setLastCalculation] = useState(null);
  
  // Calculate RSI for filtered coins
  const calculateRSI = async () => {
    setLoading(true);
    setError(null);
    setPage(1); // Reset pagination
    
    // Create a cache key based on current filter settings
    const cacheKey = JSON.stringify({
      market: filterValues.market,
      minVolume: filterValues.minVolume,
      period: filterValues.period,
      timeframe: filterValues.timeframe
    });
    
    // Check if we have cached results for these exact filters
    // and they're less than 5 minutes old
    const now = new Date().getTime();
    if (rsiCache[cacheKey] && 
        now - rsiCache[cacheKey].timestamp < 5 * 60 * 1000 &&
        rsiCache[cacheKey].data.length > 0) {
      
      setRsiData(rsiCache[cacheKey].data);
      updateDisplayData(getFilteredRSIData(tabValue, rsiCache[cacheKey].data), 1);
      setLoading(false);
      return;
    }
    
    try {
      // Prevent duplicate calculations if button is clicked multiple times
      if (loading && lastCalculation && now - lastCalculation < 3000) {
        return;
      }
      
      setLastCalculation(now);
      
      // Filter by search term if provided
      let cryptosToProcess = filteredCryptos;
      if (searchTerm) {
        cryptosToProcess = filteredCryptos.filter(crypto => 
          crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Show processing message
      console.log(`Processing ${cryptosToProcess.length} cryptos for RSI calculation`);
      
      // Process cryptos sequentially instead of all at once
      const validResults = [];
      const partialResults = [];
      
      // Update state with partial results after every few symbols
      const updateInterval = 5;
      
      // Show loading progress
      setRsiData([]);
      
      // Process each crypto one by one
      for (let i = 0; i < cryptosToProcess.length; i++) {
        const crypto = cryptosToProcess[i];
        
        // Check if this specific crypto has recent RSI data in any cache
        const cryptoCacheKey = `${crypto.symbol}_${filterValues.period}_${filterValues.timeframe}`;
        const hasCachedData = Object.values(rsiCache).some(cache => {
          return cache.cryptoData && 
                 cache.cryptoData[cryptoCacheKey] &&
                 now - cache.cryptoData[cryptoCacheKey].timestamp < 5 * 60 * 1000;
        });
        
        try {
          let result;
          
          // Use cached data if available
          if (hasCachedData) {
            const cachedEntry = Object.values(rsiCache).find(cache => 
              cache.cryptoData && cache.cryptoData[cryptoCacheKey] &&
              now - cache.cryptoData[cryptoCacheKey].timestamp < 5 * 60 * 1000
            );
            
            if (cachedEntry) {
              result = cachedEntry.cryptoData[cryptoCacheKey].data;
            }
          } else {
            // Get RSI for the current timeframe
            result = await getRSI(crypto.symbol, filterValues.period, filterValues.timeframe);
            
            // Add a small delay between requests to prevent overloading the API
            if (i < cryptosToProcess.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300)); // Increased delay
            }
          }
          
          // Mock data for change percentages across different timeframes
          // In a real implementation, these would come from the API
          const mockChanges = {
            '1m': Math.random() * 2 - 1, // -1 to 1%
            '5m': Math.random() * 4 - 2, // -2 to 2%
            '15m': Math.random() * 5 - 2.5, // -2.5 to 2.5%
            '30m': Math.random() * 6 - 3, // -3 to 3%
            '1h': Math.random() * 8 - 4, // -4 to 4%
            '4h': Math.random() * 12 - 6, // -6 to 6%
            '12h': Math.random() * 15 - 7.5, // -7.5 to 7.5%
            '24h': crypto.priceChangePercent24h, // Use actual 24h change
            '1d': crypto.priceChangePercent24h, // Same as 24h
            '1w': Math.random() * 20 - 10, // -10 to 10%
          };
          
          const processedItem = {
            ...crypto,
            rsi: result.rsi,
            rsiCategory: getRSICategory(result.rsi),
            timeframeChanges: mockChanges,
            lastUpdated: new Date()
          };
          
          // Add to valid results
          validResults.push(processedItem);
          partialResults.push(processedItem);
          
          // Update UI with partial results periodically to show progress
          if (partialResults.length >= updateInterval || i === cryptosToProcess.length - 1) {
            const currentResults = [...validResults];
            currentResults.sort((a, b) => a.rsi - b.rsi);
            
            setRsiData(currentResults);
            
            // Filter the display data based on search term
            let dataToDisplay = currentResults;
            if (searchTerm) {
              dataToDisplay = dataToDisplay.filter(item => 
                item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
              );
              setSearchResults(dataToDisplay);
            }
            
            setDisplayData(dataToDisplay.slice(0, ITEMS_PER_PAGE));
            setHasMore(dataToDisplay.length > ITEMS_PER_PAGE);
            
            partialResults.length = 0; // Clear partial results array
          }
        } catch (err) {
          console.error(`Failed to get RSI for ${crypto.symbol}:`, err);
          // Continue to the next crypto on error
        }
      }
      
      // Final sort of all valid results
      validResults.sort((a, b) => a.rsi - b.rsi);
      
      // Cache the results
      const cryptoDataCache = {};
      validResults.forEach(item => {
        const itemCacheKey = `${item.symbol}_${filterValues.period}_${filterValues.timeframe}`;
        cryptoDataCache[itemCacheKey] = {
          data: { rsi: item.rsi },
          timestamp: now
        };
      });
      
      setRsiCache(prevCache => ({
        ...prevCache,
        [cacheKey]: {
          data: validResults,
          cryptoData: cryptoDataCache,
          timestamp: now
        }
      }));
      
      setRsiData(validResults);
      
      // Filter the display data based on search term
      let dataToDisplay = validResults;
      if (searchTerm) {
        dataToDisplay = dataToDisplay.filter(item => 
          item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(dataToDisplay);
      }
      
      setDisplayData(dataToDisplay.slice(0, ITEMS_PER_PAGE));
      setHasMore(dataToDisplay.length > ITEMS_PER_PAGE);
    } catch (err) {
      setError('Failed to calculate RSI values. Please try again.');
      console.error('RSI calculation error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter RSI data based on tab selection
  const getFilteredRSIData = (currentTab = tabValue, customData = null) => {
    const tab = typeof currentTab === 'number' ? currentTab : tabValue;
    const dataToFilter = customData || rsiData;
    
    switch (tab) {
      case 0: // All
        return dataToFilter;
      case 1: // Oversold (RSI < 30)
        return dataToFilter.filter((item) => item.rsi < 30);
      case 2: // Overbought (RSI > 70)
        return dataToFilter.filter((item) => item.rsi > 70);
      case 3: // Neutral (30 <= RSI <= 70)
        return dataToFilter.filter((item) => item.rsi >= 30 && item.rsi <= 70);
      default:
        return dataToFilter;
    }
  };
  
  // Get color based on RSI value
  const getRSIColor = (rsi) => {
    if (rsi < 30) return '#ff4500'; // Oversold - red
    if (rsi > 70) return '#9acd32'; // Overbought - green
    return '#3875d7'; // Normal - blue
  };
  
  // Handle favorite toggle
  const handleFavoriteToggle = (symbol) => {
    toggleFavorite(symbol);
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        RSI Analysis 
        <Chip label="Optimized" color="success" size="small" sx={{ ml: 2 }} />
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Configure RSI Analysis
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel id="market-filter-label">Market</InputLabel>
              <Select
                labelId="market-filter-label"
                name="market"
                value={filterValues.market}
                onChange={handleFilterChange}
                label="Market"
                size="small"
              >
                <MenuItem value="all">All Markets</MenuItem>
                <MenuItem value="USDT">USDT</MenuItem>
                <MenuItem value="BTC">BTC</MenuItem>
                <MenuItem value="ETH">ETH</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Min Volume"
              name="minVolume"
              type="number"
              value={filterValues.minVolume}
              onChange={handleFilterChange}
              InputProps={{
                endAdornment: <InputAdornment position="end">USDT</InputAdornment>,
              }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="RSI Period"
              name="period"
              type="number"
              value={filterValues.period}
              onChange={handleFilterChange}
              inputProps={{ min: 1, max: 50 }}
              helperText="Default: 14"
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel id="timeframe-filter-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-filter-label"
                name="timeframe"
                value={filterValues.timeframe}
                onChange={handleFilterChange}
                label="Timeframe"
                size="small"
              >
                {timeframes.map(tf => (
                  <MenuItem key={tf} value={tf}>{tf}</MenuItem>
                ))}
              </Select>
              <FormHelperText>Analysis timeframe</FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Autocomplete
              id="coin-search"
              options={coinOptions}
              getOptionLabel={(option) => option.label || ''}
              onChange={(event, newValue) => {
                handleSearchChange(newValue ? newValue.symbol : '');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Coins"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {params.InputProps.endAdornment}
                        <InputAdornment position="end">
                          <SearchIcon />
                        </InputAdornment>
                      </React.Fragment>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              color="primary"
              onClick={calculateRSI}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
              fullWidth
              sx={{ mb: 1 }}
            >
              {loading ? 'Calculating...' : 'Calculate RSI'}
            </Button>
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="caption">
                {searchTerm ? 
                  `Filtered to coins containing "${searchTerm}"` : 
                  `${filteredCryptos.length} coins match your filters. Processing in batches of ${ITEMS_PER_PAGE}.`
                }
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.dark' }}>
          <Typography color="white">{error}</Typography>
        </Paper>
      )}
      
      {rsiData.length > 0 && (
        <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="rsi tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`All (${rsiData.length})`} />
              <Tab label={`Oversold (${rsiData.filter((item) => item.rsi < 30).length})`} />
              <Tab label={`Overbought (${rsiData.filter((item) => item.rsi > 70).length})`} />
              <Tab label={`Neutral (${rsiData.filter((item) => item.rsi >= 30 && item.rsi <= 70).length})`} />
            </Tabs>
          </Box>
          
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {displayData.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.symbol}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      boxShadow: 2,
                      borderLeft: '4px solid',
                      borderColor: getRSIColor(item.rsi),
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardHeader
                      avatar={
                        <Avatar 
                          onClick={() => handleFavoriteToggle(item.symbol)}
                          sx={{ 
                            bgcolor: item.isFavorite ? 'gold' : 'grey.300',
                            color: item.isFavorite ? 'common.white' : 'grey.700',
                            cursor: 'pointer'
                          }}
                        >
                          {item.symbol.substring(0, 2)}
                        </Avatar>
                      }
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {item.symbol}
                          </Typography>
                          <Chip
                            label={item.rsi.toFixed(2)}
                            size="small"
                            sx={{
                              bgcolor: getRSIColor(item.rsi),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                      }
                      subheader={`$${item.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}`}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Divider sx={{ my: 1 }} />
                      <Grid container spacing={1}>
                        {/* Always show the selected timeframe first */}
                        <Grid item xs={12}>
                          <Chip
                            label={`${filterValues.timeframe}: ${item.timeframeChanges?.[filterValues.timeframe]?.toFixed(2) || item.priceChangePercent24h.toFixed(2)}%`}
                            size="small"
                            sx={{
                              bgcolor: (item.timeframeChanges?.[filterValues.timeframe] >= 0 || item.priceChangePercent24h >= 0) ? 'success.dark' : 'error.dark',
                              color: 'white',
                              width: '100%',
                              fontWeight: 'bold',
                              py: 0.5
                            }}
                          />
                        </Grid>
                        
                        {/* Show bonus timeframes only if they're different from the selected timeframe */}
                        {filterValues.timeframe !== '1h' && (
                          <Grid item xs={4}>
                            <Chip
                              label={`1h: ${item.timeframeChanges?.['1h'].toFixed(2)}%`}
                              size="small"
                              sx={{
                                bgcolor: item.timeframeChanges?.['1h'] >= 0 ? 'success.dark' : 'error.dark',
                                color: 'white',
                                width: '100%',
                                opacity: 0.75
                              }}
                            />
                          </Grid>
                        )}
                        {filterValues.timeframe !== '4h' && (
                          <Grid item xs={4}>
                            <Chip
                              label={`4h: ${item.timeframeChanges?.['4h'].toFixed(2)}%`}
                              size="small"
                              sx={{
                                bgcolor: item.timeframeChanges?.['4h'] >= 0 ? 'success.dark' : 'error.dark',
                                color: 'white',
                                width: '100%',
                                opacity: 0.75
                              }}
                            />
                          </Grid>
                        )}
                        {filterValues.timeframe !== '24h' && filterValues.timeframe !== '1d' && (
                          <Grid item xs={4}>
                            <Chip
                              label={`24h: ${item.priceChangePercent24h.toFixed(2)}%`}
                              size="small"
                              sx={{
                                bgcolor: item.priceChangePercent24h >= 0 ? 'success.dark' : 'error.dark',
                                color: 'white',
                                width: '100%',
                                opacity: 0.75
                              }}
                            />
                          </Grid>
                        )}
                      </Grid>
                      <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'right' }}>
                        Vol: {(item.volume24h / 1000000).toFixed(2)}M USDT
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                ))}
                {displayData.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ my: 2 }}>
                      <Typography variant="body2">
                        No data matches the selected filter
                      </Typography>
                    </Alert>
                  </Grid>
                )}
            </Grid>
            
            {hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 4 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleLoadMore}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  disabled={loading}
                >
                  Load More ({ITEMS_PER_PAGE} More Coins)
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      )}
      
      {rsiData.length === 0 && !loading && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            Click "Calculate RSI" to analyze the selected coins
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default RSIAnalysis;
