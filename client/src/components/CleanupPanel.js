import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import {
  Delete,
  DeleteSweep,
  Block,
  Schedule,
  Info
} from '@mui/icons-material';
import axios from 'axios';

/**
 * Cleanup Panel Component
 * 
 * Provides manual cleanup controls and shows cleanup statistics
 */

const CleanupPanel = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Fetch cleanup statistics
  const fetchStats = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${API_URL}/api/cleanup/stats`);
      
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching cleanup stats:', error);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show message helper
  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Clean up old triggered alerts (24+ hours)
  const handleCleanupOldAlerts = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${API_URL}/api/cleanup/triggered-alerts`);
      
      if (response.data.success) {
        showMessage(`✅ ${response.data.message}`, 'success');
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      showMessage(`❌ Error: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clean up ALL triggered alerts
  const handleCleanupAllAlerts = async () => {
    if (!window.confirm('Are you sure you want to delete ALL triggered alerts? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${API_URL}/api/cleanup/all-triggered-alerts`);
      
      if (response.data.success) {
        showMessage(`✅ ${response.data.message}`, 'success');
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      showMessage(`❌ Error: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Disable all existing alerts
  const handleDisableAlerts = async () => {
    if (!window.confirm('Are you sure you want to disable ALL existing alerts? This will stop all current alerts from triggering.')) {
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${API_URL}/api/cleanup/disable-alerts`);
      
      if (response.data.success) {
        showMessage(`✅ ${response.data.message}`, 'success');
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      showMessage(`❌ Error: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <DeleteSweep sx={{ mr: 1, fontSize: 28, color: '#1976d2' }} />
        <Typography variant="h6" fontWeight="bold">
          System Cleanup & Management
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your alerts and triggered alerts history. Automatic cleanup runs every hour.
      </Typography>

      {/* Message Alert */}
      {message && (
        <Alert severity={messageType} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Statistics */}
      {stats && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Statistics
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Triggered Alerts
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip 
                    label={`Total: ${stats.triggeredAlerts.total}`}
                    size="small"
                    color="primary"
                  />
                  <Chip 
                    label={`Old (24h+): ${stats.triggeredAlerts.old}`}
                    size="small"
                    color="warning"
                  />
                  <Chip 
                    label={`Recent: ${stats.triggeredAlerts.recent}`}
                    size="small"
                    color="success"
                  />
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Active Alerts
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip 
                    label={`Total: ${stats.alerts.total}`}
                    size="small"
                    color="primary"
                  />
                  <Chip 
                    label={`Active: ${stats.alerts.active}`}
                    size="small"
                    color="success"
                  />
                  <Chip 
                    label={`Inactive: ${stats.alerts.inactive}`}
                    size="small"
                    color="default"
                  />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Manual Cleanup Actions */}
      <Typography variant="subtitle2" gutterBottom>
        Manual Cleanup Actions
      </Typography>

      <Stack spacing={2}>
        {/* Clean Old Triggered Alerts */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Clean Old Triggered Alerts
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Remove triggered alerts older than 24 hours (automatic cleanup)
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <Schedule />}
            onClick={handleCleanupOldAlerts}
            disabled={loading}
            size="small"
          >
            Clean Old
          </Button>
        </Box>

        {/* Clean ALL Triggered Alerts */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Clear All Alert History
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Remove ALL triggered alerts from database (cannot be undone)
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="warning"
            startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
            onClick={handleCleanupAllAlerts}
            disabled={loading}
            size="small"
          >
            Clear All History
          </Button>
        </Box>

        {/* Disable All Alerts */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Disable All Active Alerts
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stop all current alerts from triggering (clean slate for new alerts)
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={loading ? <CircularProgress size={16} /> : <Block />}
            onClick={handleDisableAlerts}
            disabled={loading}
            size="small"
          >
            Disable All
          </Button>
        </Box>
      </Stack>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="caption">
          <strong>Automatic Cleanup:</strong> The system automatically removes triggered alerts older than 24 hours every hour. 
          When you create a new alert, all existing alerts are automatically disabled to ensure clean conditions.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default CleanupPanel;
