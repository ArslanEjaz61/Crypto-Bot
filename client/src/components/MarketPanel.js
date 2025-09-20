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
  Checkbox,
  FormControlLabel,
  Button,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { useCrypto } from "../context/CryptoContext";
import { useFilters } from "../context/FilterContext";
import { useAlert } from "../context/AlertContext";
import { useSelectedPairs } from "../context/SelectedPairsContext";
import SmoothTransition from "./SmoothTransition";
import { useDebounce, useThrottle } from "../utils/requestThrottle";

const MarketPanel = ({
  onSelectCoin,
  onCreateAlert,
  onAlertsCreated,
  onRef,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const {
    cryptos,
    error,
    toggleFavorite,
    batchToggleFavorites,
    isFavorite,
    getFavoriteSymbols,
    isOperationPending,
    clearAllFavorites,
    checkAlertConditions,
    loadCryptos,
  } = useCrypto();
  const { filters, getValidationFilters, hasActiveFilters } = useFilters();
  const { alerts, deleteAlert } = useAlert(); // Import to get active alerts and delete function
  const { togglePairSelection, isPairSelected } = useSelectedPairs();
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
  const [isResettingFavorites, setIsResettingFavorites] = useState(false);
  const [isDeletingAllAlerts, setIsDeletingAllAlerts] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState(null);

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
        ? cryptos.filter((crypto) => isFavorite(crypto.symbol))
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
  }, [
    getValidationFilters,
    checkAlertConditions,
    alerts,
    view,
    cryptos,
    hasActiveFilters,
    isFavorite,
  ]);

  // Apply throttling to condition checking (max once per 2 seconds)
  const checkConditions = useThrottle(checkConditionsThrottled, 2000);

  /* Filter functionality is handled directly in the component through the context */

  // Load active USDT pairs only
  useEffect(() => {
    // Always load only active USDT pairs
    loadCryptos(1, 5000, false, true, true, true);
  }, [loadCryptos, cryptos]);

  // Memoized filtered cryptos for better performance
  const filteredCryptos = useMemo(() => {
    if (!cryptos) {
      return [];
    }

    let filtered = [...cryptos];

    // Show only active USDT pairs (always filter for USDT and TRADING status)
    filtered = filtered.filter((crypto) => 
      crypto.symbol.endsWith("USDT") && 
      crypto.isSpotTradingAllowed === true &&
      crypto.status === "TRADING"
    );

    // Apply market/favorite filter
    if (view === "favorites") {
      filtered = filtered.filter((crypto) => isFavorite(crypto.symbol));
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
      // First sort by favorites using optimized lookup
      const aIsFavorite = isFavorite(a.symbol);
      const bIsFavorite = isFavorite(b.symbol);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Then sort by volume
      return b.volume - a.volume;
    });

    // Return all filtered items (no artificial limit)
    return uniqueFiltered;
  }, [cryptos, view, searchTerm, filters.pair, isFavorite]);

  // Memoized total filtered count (before search and view filters)
  const totalFilteredCount = useMemo(() => {
    if (!cryptos) {
      return 0;
    }

    let filtered = [...cryptos];

    // Show only active USDT pairs (always filter for USDT and TRADING status)
    filtered = filtered.filter((crypto) => 
      crypto.symbol.endsWith("USDT") && 
      crypto.isSpotTradingAllowed === true &&
      crypto.status === "TRADING"
    );

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

        // Batch add all to favorites and selection
        const favoriteOperations = filteredCryptos
          .filter((crypto) => !isFavorite(crypto.symbol))
          .map((crypto) => ({ symbol: crypto.symbol, action: "add" }));

        if (favoriteOperations.length > 0) {
          batchToggleFavorites(favoriteOperations);
        }

        // Add to selection
        filteredCryptos.forEach((crypto) => {
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

        // Batch remove all from favorites and selection
        const removeOperations = filteredCryptos
          .filter((crypto) => isFavorite(crypto.symbol))
          .map((crypto) => ({ symbol: crypto.symbol, action: "remove" }));

        if (removeOperations.length > 0) {
          batchToggleFavorites(removeOperations);
        }

        // Remove from selection
        filteredCryptos.forEach((crypto) => {
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
    [
      filteredCryptos,
      batchToggleFavorites,
      isFavorite,
      isPairSelected,
      togglePairSelection,
      view,
    ]
  );

  // Sync checked pairs with favorites when cryptos data changes
  // Remove auto-selection - pairs should only be selected when explicitly checked
  useEffect(() => {
    if (cryptos && cryptos.length > 0) {
      // Don't auto-select pairs - let user manually select them
      // Only sync with existing favorites if they exist
      const favoriteSymbols = getFavoriteSymbols();

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
  }, [cryptos, getFavoriteSymbols]);

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

  // Handle reset all favorites
  const handleResetFavorites = useCallback(async () => {
    try {
      setIsResettingFavorites(true);
      await clearAllFavorites();

      // Clear checked pairs and switch to market view
      setCheckedPairs(new Set());
      setSelectAllChecked(false);
      setView("market");

      console.log("All favorites reset successfully");
    } catch (error) {
      console.error("Error resetting favorites:", error);
    } finally {
      setIsResettingFavorites(false);
    }
  }, [clearAllFavorites]);

  // Handle delete all alerts
  const handleDeleteAllAlerts = useCallback(async () => {
    try {
      setIsDeletingAllAlerts(true);

      if (!alerts || alerts.length === 0) {
        console.log("No alerts to delete");
        return;
      }

      // Delete all alerts
      const deletePromises = alerts.map((alert) => deleteAlert(alert._id));
      await Promise.all(deletePromises);

      console.log("All alerts deleted successfully");
    } catch (error) {
      console.error("Error deleting all alerts:", error);
    } finally {
      setIsDeletingAllAlerts(false);
    }
  }, [alerts, deleteAlert]);

  // Handle delete individual alert
  const handleDeleteAlert = useCallback(
    async (alertId, symbol) => {
      try {
        setDeletingAlertId(alertId);
        await deleteAlert(alertId);

        // Also remove from favorites if it's in favorites
        if (isFavorite(symbol)) {
          await toggleFavorite(symbol);
        }

        console.log(`Alert deleted successfully for ${symbol}`);
      } catch (error) {
        console.error(`Error deleting alert for ${symbol}:`, error);
      } finally {
        setDeletingAlertId(null);
      }
    },
    [deleteAlert, isFavorite, toggleFavorite]
  );

  // Expose functions to parent via callback
  useEffect(() => {
    if (onRef) {
      onRef({});
    }
  }, [onRef]);

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: { xs: 1, sm: 2 },
        bgcolor: "background.paper",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
        <Chip
          label={totalFilteredCount}
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontSize: "0.7rem", height: "20px" }}
        />
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
      {/* <Box
        sx={{
          mb: 2,
          p: { xs: 1, sm: 1.5 },
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
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 0 },
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
      </Box> */}

      {/* Toggle buttons for Market/Favorites/Alert Generated */}
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={handleViewChange}
        aria-label="market view"
        fullWidth
        sx={{
          mb: 2,
          "& .MuiToggleButton-root": {
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            py: { xs: 0.5, sm: 1 },
            px: { xs: 0.5, sm: 1.5 },
          },
        }}
      >
        <ToggleButton value="market" aria-label="market">
          {isMobile ? "Market" : "Market"}
        </ToggleButton>
        <ToggleButton value="favorites" aria-label="favorites">
          {isMobile ? "Favs" : "Favorites"}
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Reset Favorites Button - only show when in favorites view and has favorites */}
      {view === "favorites" && getFavoriteSymbols().length > 0 && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleResetFavorites}
            disabled={isResettingFavorites}
            sx={{
              borderRadius: "20px",
              textTransform: "none",
              px: 2,
              py: 0.5,
              fontSize: "0.75rem",
              borderColor: "rgba(244, 67, 54, 0.5)",
              color: "#f44336",
              "&:hover": {
                borderColor: "#f44336",
                backgroundColor: "rgba(244, 67, 54, 0.1)",
              },
              "&:disabled": {
                opacity: 0.5,
              },
            }}
          >
            {isResettingFavorites ? "Resetting..." : "🗑️ Clear All Favorites"}
          </Button>
        </Box>
      )}

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
                sx={{ color: view === "favorites" ? "#FFD700" : "#60A5FA" }}
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
        <List
          sx={{
            flexGrow: 1,
            overflow: "auto",
            p: 0,
            maxHeight: "calc(100vh - 300px)",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(255, 255, 255, 0.3)",
              borderRadius: "3px",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.5)",
              },
            },
          }}
        >
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
                    py: { xs: 0.5, sm: 1 },
                    px: { xs: 0.5, sm: 1 },
                    "&:hover": {
                      backgroundColor: alpha("#0066FF", 0.05),
                    },
                    display: "flex",
                    alignItems: "center",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1, sm: 0 },
                  }}
                >
                  {/* Checkbox for pair selection and favorite toggle */}
                  <Checkbox
                    checked={isFavorite(crypto.symbol)}
                    disabled={isOperationPending(crypto.symbol)}
                    onChange={() => {
                      const isCurrentlyFavorite = isFavorite(crypto.symbol);

                      if (isCurrentlyFavorite) {
                        // Unchecking: remove from favorites (this will automatically delete alerts)
                        toggleFavorite(crypto.symbol);
                        togglePairSelection(crypto.symbol);

                        // Update checked pairs
                        setCheckedPairs((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(crypto.symbol);
                          return newSet;
                        });
                      } else {
                        // Checking: add to favorites (no automatic alert creation)
                        toggleFavorite(crypto.symbol);
                        togglePairSelection(crypto.symbol);

                        // Update checked pairs
                        setCheckedPairs((prev) => {
                          const newSet = new Set(prev);
                          newSet.add(crypto.symbol);
                          return newSet;
                        });

                        // Automatically switch to favorites view when a pair is checked
                        if (view !== "favorites") {
                          setView("favorites");
                        }
                      }
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
                      width: "100%",
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexDirection: { xs: "column", sm: "row" },
                            gap: { xs: 1, sm: 0 },
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
                          <Box
                            sx={{
                              textAlign: { xs: "center", sm: "right" },
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexDirection: { xs: "column", sm: "row" },
                            }}
                          >
                            <Box>
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
export default memo(MarketPanel);
