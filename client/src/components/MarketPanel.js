import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  useCallback,
} from "react";
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
  FormControlLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import { useCrypto } from "../context/CryptoContext";
import { useFilters } from "../context/FilterContext";
import { useAlert } from "../context/AlertContext";
import { useSelectedPairs } from "../context/SelectedPairsContext";
import SmoothTransition from "./SmoothTransition";
import { useDebounce, useThrottle } from "../utils/requestThrottle";

const MarketPanel = ({ onSelectCoin, onCreateAlert, filterSidebarRef }) => {
  const { cryptos, error, toggleFavorite, checkAlertConditions, loadCryptos } =
    useCrypto();
  const { filters, getValidationFilters, hasActiveFilters } = useFilters();
  const { alerts } = useAlert(); // Import to get active alerts
  const {
    togglePairSelection,
    selectAllPairs,
    clearAllSelections,
    isPairSelected,
    getSelectedCount,
    getSelectedPairsArray,
  } = useSelectedPairs();
  const [view, setView] = useState("market");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimeoutRef = useRef(null);
  // Remove unused state since we're using useMemo now
  // const [filteredCryptos, setFilteredCryptos] = useState([]);
  const [meetingConditions, setMeetingConditions] = useState({});
  const [, setCheckingConditions] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [checkedPairs, setCheckedPairs] = useState(new Set());

  // Throttled condition checking to prevent API spam
  const checkConditionsThrottled = useCallback(async () => {
    if (!hasActiveFilters) {
      setMeetingConditions({});
      return;
    }

    setCheckingConditions(true);
    const results = {};

    const validationFilters = getValidationFilters();
    const coinList =
      view === "favorites"
        ? cryptos.filter((crypto) => crypto.isFavorite)
        : cryptos;

    if (!coinList || coinList.length === 0) {
      setCheckingConditions(false);
      return;
    }

    // Get symbols with active alerts only
    const alertSymbols = new Set(
      alerts.filter((alert) => alert.isActive).map((alert) => alert.symbol)
    );

    // Only check conditions for coins that have active alerts
    const coinsWithAlerts = coinList.filter((coin) =>
      alertSymbols.has(coin.symbol)
    );

    console.log(
      `Checking conditions for ${coinsWithAlerts.length} coins with active alerts:`,
      coinsWithAlerts.map((c) => c.symbol)
    );

    if (coinsWithAlerts.length === 0) {
      setMeetingConditions({});
      setCheckingConditions(false);
      return;
    }

    console.log("Validation filters:", validationFilters);

    // Process in batches to avoid too many simultaneous requests
    const batchSize = 5;
    for (let i = 0; i < coinsWithAlerts.length; i += batchSize) {
      const batch = coinsWithAlerts.slice(i, i + batchSize);
      const promises = batch.map((coin) =>
        checkAlertConditions(coin.symbol, validationFilters)
          .then((result) => {
            results[coin.symbol] = result.meetsConditions;
            return result;
          })
          .catch((err) => {
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

    console.log(
      `MarketPanel: Loading crypto pairs - USDT: ${usdtFilter}, Spot: ${spotFilter}`
    );

    // If USDT is checked, load only USDT pairs
    // If USDT is unchecked, load all SPOT pairs (USDT, BTC, ETH, BNB, etc.)
    if (usdtFilter) {
      // Load only USDT pairs
      loadCryptos(1, 5000, false, true, true, true);
    } else {
      // Load all SPOT pairs (including USDT, BTC, ETH, BNB, etc.)
      loadCryptos(1, 5000, false, true, true, false);
    }
  }, [loadCryptos, filters.pair?.USDT, filters.market?.SPOT]);

  // Memoized filtered cryptos for better performance
  const filteredCryptos = useMemo(() => {
    if (!cryptos) {
      return [];
    }

    let filtered = [...cryptos];

    // Apply USDT filter based on FilterSidebar checkbox
    const usdtFilter = filters.pair?.USDT || false;
    if (usdtFilter) {
      // Show only USDT pairs
      filtered = filtered.filter((crypto) => crypto.symbol.endsWith("USDT"));
    } else {
      // Show all SPOT pairs (BTC, ETH, BNB, etc.)
      filtered = filtered.filter(
        (crypto) =>
          crypto.symbol.endsWith("USDT") ||
          crypto.symbol.endsWith("BTC") ||
          crypto.symbol.endsWith("ETH") ||
          crypto.symbol.endsWith("BNB")
      );
    }

    // Apply market/favorite filter
    if (view === "favorites") {
      filtered = filtered.filter((crypto) => crypto.isFavorite);
    }

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (crypto) =>
          crypto.symbol.toLowerCase().includes(term) ||
          (crypto.name && crypto.name.toLowerCase().includes(term))
      );
    }

    // Remove duplicates based on symbol
    const uniqueFiltered = filtered.filter(
      (crypto, index, self) =>
        index === self.findIndex((c) => c.symbol === crypto.symbol)
    );

    // Sort by market cap or volume
    uniqueFiltered.sort((a, b) => {
      // First sort by favorites
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Then sort by volume
      return b.volume - a.volume;
    });

    // Return all filtered items (no artificial limit)
    return uniqueFiltered;
  }, [cryptos, view, searchTerm, filters.pair]);

  // Memoized total filtered count (before search and view filters)
  const totalFilteredCount = useMemo(() => {
    if (!cryptos) {
      return 0;
    }

    let filtered = [...cryptos];

    // Apply USDT filter based on FilterSidebar checkbox
    const usdtFilter = filters.pair?.USDT || false;
    if (usdtFilter) {
      // Show only USDT pairs
      filtered = filtered.filter((crypto) => crypto.symbol.endsWith("USDT"));
    } else {
      // Show all SPOT pairs (BTC, ETH, BNB, etc.)
      filtered = filtered.filter(
        (crypto) =>
          crypto.symbol.endsWith("USDT") ||
          crypto.symbol.endsWith("BTC") ||
          crypto.symbol.endsWith("ETH") ||
          crypto.symbol.endsWith("BNB")
      );
    }

    // Remove duplicates based on symbol
    const uniqueFiltered = filtered.filter(
      (crypto, index, self) =>
        index === self.findIndex((c) => c.symbol === crypto.symbol)
    );

    return uniqueFiltered.length;
  }, [cryptos, filters.pair]);

  // Handle select all checkbox
  const handleSelectAll = useCallback(
    (event) => {
      const isChecked = event.target.checked;
      setSelectAllChecked(isChecked);

      if (isChecked) {
        // Check all visible pairs
        const visibleSymbols = filteredCryptos.map((crypto) => crypto.symbol);
        setCheckedPairs(new Set(visibleSymbols));

        // Add all to favorites and selection
        filteredCryptos.forEach((crypto) => {
          if (!crypto.isFavorite) {
            toggleFavorite(crypto.symbol);
          }
          if (!isPairSelected(crypto.symbol)) {
            togglePairSelection(crypto.symbol);
          }
        });

        // Switch to favorites view when selecting all
        if (view !== "favorites") {
          setView("favorites");
        }
      } else {
        // Uncheck all visible pairs
        const visibleSymbols = filteredCryptos.map((crypto) => crypto.symbol);
        setCheckedPairs((prev) => {
          const newSet = new Set(prev);
          visibleSymbols.forEach((symbol) => newSet.delete(symbol));
          return newSet;
        });

        // Remove all from favorites and selection
        filteredCryptos.forEach((crypto) => {
          if (crypto.isFavorite) {
            toggleFavorite(crypto.symbol);
          }
          if (isPairSelected(crypto.symbol)) {
            togglePairSelection(crypto.symbol);
          }
        });

        // Switch back to market view when deselecting all
        if (view === "favorites") {
          setView("market");
        }
      }
    },
    [filteredCryptos, toggleFavorite, isPairSelected, togglePairSelection, view]
  );

  // Sync checked pairs with favorites when cryptos data changes
  // Remove auto-selection - pairs should only be selected when explicitly checked
  useEffect(() => {
    if (cryptos && cryptos.length > 0) {
      // Don't auto-select pairs - let user manually select them
      // Only sync with existing favorites if they exist
      const favoriteSymbols = cryptos
        .filter((crypto) => crypto.isFavorite)
        .map((crypto) => crypto.symbol);

      const newCheckedPairs = new Set(favoriteSymbols);

      // Only update if the set has actually changed to prevent unnecessary re-renders
      setCheckedPairs((prev) => {
        if (
          prev.size !== newCheckedPairs.size ||
          ![...prev].every((symbol) => newCheckedPairs.has(symbol))
        ) {
          return newCheckedPairs;
        }
        return prev; // No change needed
      });
    }
  }, [cryptos]);

  // Update select all checkbox based on checked pairs
  useEffect(() => {
    const visibleSymbols = filteredCryptos.map((crypto) => crypto.symbol);
    const checkedVisibleCount = visibleSymbols.filter((symbol) =>
      checkedPairs.has(symbol)
    ).length;
    const totalVisible = visibleSymbols.length;

    if (checkedVisibleCount === 0) {
      setSelectAllChecked(false);
    } else if (checkedVisibleCount === totalVisible && totalVisible > 0) {
      setSelectAllChecked(true);
    } else {
      setSelectAllChecked(false);
    }
  }, [checkedPairs, filteredCryptos]);

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
    if (!num) return "0";
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + "B";
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K";
    }
    return num.toFixed(2);
  };

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Debug information banner */}
      {error && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            bgcolor: "error.main",
            color: "white",
            borderRadius: 1,
            fontSize: "0.75rem",
          }}
        >
          Error:{" "}
          {typeof error === "string"
            ? error
            : "Failed to fetch crypto data. Check server connection."}
        </Box>
      )}
      {/* Filter Status Indicator with Counts */}
      <Box
        sx={{
          mb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Showing: {filters.pair?.USDT ? "USDT pairs only" : "All SPOT pairs"}
        </Typography>
        {filters.pair?.USDT && (
          <Chip
            label="USDT"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: "0.7rem", height: "20px" }}
          />
        )}
        {checkedPairs.size > 0 && (
          <Chip
            label={`${checkedPairs.size} Selected`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontSize: "0.7rem", height: "20px" }}
          />
        )}
      </Box>

      {/* Counts Display */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          bgcolor: alpha("#1E293B", 0.3),
          borderRadius: 1,
          border: "1px solid rgba(59, 130, 246, 0.2)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "0.7rem" }}
            >
              Total Filtered
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "#60A5FA", fontWeight: "bold" }}
            >
              {totalFilteredCount}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              alignItems: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "0.7rem" }}
            >
              Currently Showing
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "#22C55E", fontWeight: "bold" }}
            >
              {filteredCryptos.length}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              alignItems: "flex-end",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "0.7rem" }}
            >
              Selected
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "#F59E0B", fontWeight: "bold" }}
            >
              {checkedPairs.size}
            </Typography>
          </Box>
        </Box>
      </Box>

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
          p: "2px 4px",
          display: "flex",
          alignItems: "center",
          width: "100%",
          bgcolor: alpha("#000", 0.1),
          borderRadius: 1,
          mb: 2,
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Search Coins"
          value={searchInput}
          onChange={handleSearchChange}
        />
        <IconButton type="button" sx={{ p: "10px" }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Box>

      {/* Select All Checkbox */}
      {filteredCryptos.length > 0 && (
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectAllChecked}
                onChange={handleSelectAll}
                sx={{ color: "#60A5FA" }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: "#E2E8F0" }}>
                Select All
              </Typography>
            }
          />
        </Box>
      )}

      {/* Crypto list */}
      <SmoothTransition type="slide" direction="up" timeout={400}>
        <List sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
          {/* Only show error states, not loading states */}
          {error ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
              }}
            >
              <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography
                variant="subtitle1"
                align="center"
                color="error"
                gutterBottom
              >
                Error Loading Data
              </Typography>
              <Typography
                align="center"
                variant="body2"
                color="error"
                sx={{ mt: 1 }}
              >
                {error}
              </Typography>
            </Box>
          ) : filteredCryptos.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
              }}
            >
              <ManageSearchIcon
                sx={{ fontSize: 48, mb: 2, color: "text.secondary" }}
              />
              <Typography align="center" variant="body2" color="text.secondary">
                {view === "favorites"
                  ? "You have no favorite coins yet"
                  : "No coins match your search criteria"}
              </Typography>
            </Box>
          ) : !cryptos ? (
            <SmoothTransition type="fade" timeout={500}>
              <Box>
                {[...Array(10)].map((_, index) => (
                  <Box key={index} sx={{ p: 1 }}>
                    <Skeleton
                      variant="rectangular"
                      height={60}
                      sx={{ borderRadius: 1, mb: 1 }}
                    />
                  </Box>
                ))}
              </Box>
            </SmoothTransition>
          ) : cryptos.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
              }}
            >
              <CurrencyExchangeIcon
                sx={{ fontSize: 48, mb: 2, color: "text.secondary" }}
              />
              <Typography
                align="center"
                variant="subtitle1"
                color="text.secondary"
              >
                No Market Data Available
              </Typography>
              <Typography
                align="center"
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Unable to load cryptocurrency data from the server.
              </Typography>
              <Typography
                align="center"
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Please check that the API server is running correctly.
              </Typography>
            </Box>
          ) : (
            filteredCryptos.map((crypto, index) => (
              <React.Fragment key={crypto.symbol}>
                <ListItem
                  sx={{
                    py: 1,
                    "&:hover": {
                      backgroundColor: alpha("#0066FF", 0.05),
                    },
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {/* Checkbox for pair selection and favorite toggle */}
                  <Checkbox
                    checked={checkedPairs.has(crypto.symbol)}
                    onChange={() => {
                      const isCurrentlyChecked = checkedPairs.has(
                        crypto.symbol
                      );

                      setCheckedPairs((prev) => {
                        const newSet = new Set(prev);
                        if (isCurrentlyChecked) {
                          // Unchecking: remove from checked pairs and favorites
                          newSet.delete(crypto.symbol);
                          toggleFavorite(crypto.symbol); // Remove from favorites
                          togglePairSelection(crypto.symbol); // Remove from selection

                          // If we're in favorites view and this was the last favorite, stay in favorites view
                          // The favorites view will show empty state
                        } else {
                          // Checking: add to checked pairs and favorites
                          newSet.add(crypto.symbol);
                          if (!crypto.isFavorite) {
                            toggleFavorite(crypto.symbol); // Add to favorites
                          }
                          if (!isPairSelected(crypto.symbol)) {
                            togglePairSelection(crypto.symbol); // Add to selection
                          }

                          // Automatically switch to favorites view when a pair is checked
                          if (view !== "favorites") {
                            setView("favorites");
                          }
                        }
                        return newSet;
                      });
                    }}
                    sx={{
                      color: view === "favorites" ? "#FFD700" : "#60A5FA",
                      mr: 1,
                      "& .MuiSvgIcon-root": { fontSize: 18 },
                    }}
                  />

                  {/* Clickable area for coin selection */}
                  <Box
                    onClick={() => onSelectCoin && onSelectCoin(crypto)}
                    sx={{
                      flex: 1,
                      cursor: "pointer",
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600 }}
                            >
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
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              ${parseFloat(crypto.price || 0).toFixed(4)}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              {crypto.priceChangePercent >= 0 ? (
                                <TrendingUpIcon
                                  sx={{ fontSize: 14, color: "success.main" }}
                                />
                              ) : (
                                <TrendingDownIcon
                                  sx={{ fontSize: 14, color: "error.main" }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    crypto.priceChangePercent >= 0
                                      ? "success.main"
                                      : "error.main",
                                  fontWeight: 500,
                                }}
                              >
                                {crypto.priceChangePercent >= 0 ? "+" : ""}
                                {parseFloat(
                                  crypto.priceChangePercent || 0
                                ).toFixed(2)}
                                %
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      }
                      secondary={
                        crypto.rsi && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {getRSILabel(crypto.rsi)}
                            </Typography>
                          </Box>
                        )
                      }
                    />
                  </Box>
                </ListItem>
                {index < filteredCryptos.length - 1 && (
                  <Divider component="li" />
                )}
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
  if (!rsi) return "RSI: N/A";
  if (rsi >= 70) return `RSI: ${rsi.toFixed(0)} (Overbought)`;
  if (rsi <= 30) return `RSI: ${rsi.toFixed(0)} (Oversold)`;
  return `RSI: ${rsi.toFixed(0)}`;
};

// Memoize MarketPanel to prevent unnecessary re-renders
export default memo(MarketPanel, (prevProps, nextProps) => {
  return (
    prevProps.onSelectCoin === nextProps.onSelectCoin &&
    prevProps.onCreateAlert === nextProps.onCreateAlert
  );
});
