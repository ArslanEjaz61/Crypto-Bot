import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  IconButton, 
  Typography,
  Chip,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Grid,
  Tooltip,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';
import EditAlertDialog from './EditAlertDialog';
import ConfirmDialog from './ConfirmDialog';
import eventBus from '../services/eventBus';

const AlertsList = () => {
  const { alerts, loadAlerts, deleteAlert } = useAlert();
  const { cryptos, toggleFavorite } = useCrypto();
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filter, setFilter] = useState({
    symbol: '',
    direction: 'all',
    status: 'all',
  });
  const [editAlert, setEditAlert] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load alerts when component mounts
  useEffect(() => {
    console.log('AlertsList mounted, loading alerts');
    loadAlerts(1, 20, true); // Force refresh to get latest alerts
  }, [loadAlerts]);
  
  // Listen for alert created events
  useEffect(() => {
    // Subscribe to ALERT_CREATED event
    const unsubscribe = eventBus.on('ALERT_CREATED', (alertData) => {
      console.log('ALERT_CREATED event received:', alertData);
      // Reload alerts when a new one is created
      loadAlerts(1, 20, true);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [loadAlerts]);

  // Filter alerts when alerts or filter changes
  useEffect(() => {
    console.log('Alerts changed in AlertsList, current alerts:', alerts);
    if (!alerts || alerts.length === 0) {
      console.log('No alerts to filter');
      setFilteredAlerts([]);
      return;
    }

    const filtered = alerts.filter(alert => {
      // Filter by symbol
      if (filter.symbol && !alert.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) {
        return false;
      }

      // Filter by direction
      if (filter.direction !== 'all' && alert.direction !== filter.direction) {
        return false;
      }

      // Filter by status
      if (filter.status === 'active' && !alert.isActive) {
        return false;
      }
      if (filter.status === 'inactive' && alert.isActive) {
        return false;
      }

      return true;
    });

    setFilteredAlerts(filtered);
  }, [alerts, filter]);

  // Handler for filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Format price or percentage based on alert type
  const formatTarget = (alert) => {
    if (alert.targetType === 'price') {
      return alert.targetValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
    } else {
      return `${alert.targetValue}%`;
    }
  };

  // Format direction symbol
  const formatDirection = (direction) => {
    switch (direction) {
      case '>': return '↑';
      case '<': return '↓';
      case '<>': return '↕';
      default: return direction;
    }
  };

  // Handle delete confirmation
  const handleDelete = (id) => {
    setConfirmDelete(id);
  };

  // Confirm delete
  const confirmDeleteAlert = async () => {
    if (confirmDelete) {
      await deleteAlert(confirmDelete);
      setConfirmDelete(null);
    }
  };

  // Handle edit alert
  const handleEdit = (alert) => {
    setEditAlert(alert);
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (symbol) => {
    toggleFavorite(symbol);
  };

  // Check if crypto is favorite
  const isFavorite = (symbol) => {
    const crypto = cryptos.find(c => c.symbol === symbol);
    return crypto?.isFavorite || false;
  };

  // Handle start all alerts
  const handleStartAllAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/start-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'All alerts started successfully!', severity: 'success' });
        loadAlerts(1, 20, true); // Refresh alerts
      } else {
        throw new Error('Failed to start all alerts');
      }
    } catch (error) {
      console.error('Error starting all alerts:', error);
      setSnackbar({ open: true, message: 'Failed to start all alerts', severity: 'error' });
    }
  };

  // Handle stop all alerts
  const handleStopAllAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/stop-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'All alerts stopped successfully!', severity: 'success' });
        loadAlerts(1, 20, true); // Refresh alerts
      } else {
        throw new Error('Failed to stop all alerts');
      }
    } catch (error) {
      console.error('Error stopping all alerts:', error);
      setSnackbar({ open: true, message: 'Failed to stop all alerts', severity: 'error' });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Your Alerts
        </Typography>
        
        {/* Start/Stop All Alerts Buttons */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartAllAlerts}
            sx={{ minWidth: 140 }}
          >
            Start All Alerts
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStopAllAlerts}
            sx={{ minWidth: 140 }}
          >
            Stop All Alerts
          </Button>
        </Box>
        
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Filter by Symbol"
              name="symbol"
              value={filter.symbol}
              onChange={handleFilterChange}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="direction-filter-label">Direction</InputLabel>
              <Select
                labelId="direction-filter-label"
                name="direction"
                value={filter.direction}
                onChange={handleFilterChange}
                label="Direction"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value=">">Up</MenuItem>
                <MenuItem value="<">Down</MenuItem>
                <MenuItem value="<>">Either</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                label="Status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Alerts Table */}
        <TableContainer component={Paper} sx={{ backgroundColor: 'background.default' }}>
          <Table sx={{ minWidth: 650 }} aria-label="alerts table">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Current Price</TableCell>
                <TableCell>Alert Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Triggered</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert._id}>
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleFavoriteToggle(alert.symbol)}
                          sx={{ mr: 1 }}
                        >
                          {isFavorite(alert.symbol) ? (
                            <StarIcon sx={{ color: 'gold' }} fontSize="small" />
                          ) : (
                            <StarBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                        {alert.symbol}
                        <Chip 
                          size="small" 
                          label={formatDirection(alert.direction)} 
                          color={alert.direction === '>' ? 'success' : alert.direction === '<' ? 'error' : 'primary'}
                          sx={{ ml: 1, minWidth: 30 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={alert.targetType === 'price' ? 'Price target' : 'Percentage change'}>
                        <Chip 
                          label={formatTarget(alert)} 
                          size="small" 
                          variant="outlined"
                          color={alert.targetType === 'price' ? 'primary' : 'secondary'}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {alert.currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </TableCell>
                    <TableCell>{alert.alertTime}</TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.isActive ? 'Active' : 'Inactive'} 
                        color={alert.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>{alert.comment}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEdit(alert)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(alert._id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No alerts found. Try adjusting your filters or create a new alert.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Edit Alert Dialog */}
      {editAlert && (
        <EditAlertDialog
          alert={editAlert}
          open={Boolean(editAlert)}
          onClose={() => setEditAlert(null)}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Alert"
        content="Are you sure you want to delete this alert? This action cannot be undone."
        onConfirm={confirmDeleteAlert}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AlertsList;
