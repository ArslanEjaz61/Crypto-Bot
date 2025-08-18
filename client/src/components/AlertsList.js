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
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';
import EditAlertDialog from './EditAlertDialog';
import ConfirmDialog from './ConfirmDialog';

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

  // Filter alerts when alerts or filter changes
  useEffect(() => {
    if (!alerts) return;

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

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Your Alerts
        </Typography>
        
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
    </>
  );
};

export default AlertsList;
