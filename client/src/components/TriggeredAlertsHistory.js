import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import LineChart from './LineChart';

/**
 * Triggered Alerts History Component
 * 
 * Features:
 * - Real-time triggered alerts display
 * - Alert condition details
 * - Chart integration for each alert
 * - Live updates via WebSocket
 */

const TriggeredAlertsHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [filter, setFilter] = useState({
    symbol: '',
    dateRange: 'all',
    status: 'all'
  });

  const { socket, isConnected } = useSocket();

  // Load triggered alerts
  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = `${baseUrl}/api/triggered-alerts`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts || []);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to load alerts');
      }
      
    } catch (err) {
      console.error('❌ Error loading triggered alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load alerts on component mount
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Set up WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔌 Setting up WebSocket listeners for triggered alerts');

    // Listen for new triggered alerts
    const handleAlertTriggered = (data) => {
      console.log('🚨 New alert triggered:', data);
      
      // Add new alert to the beginning of the list
      setAlerts(prevAlerts => {
        const newAlert = {
          _id: Date.now().toString(), // Temporary ID
          symbol: data.symbol,
          triggeredPrice: data.price,
          targetPrice: data.targetValue,
          direction: data.direction,
          conditionResults: data.conditionResults,
          createdAt: new Date().toISOString(),
          notificationSent: true
        };
        
        return [newAlert, ...prevAlerts];
      });
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          `🚨 Alert triggered for ${data.symbol} at $${data.price}`,
          'success'
        );
      }
    };

    // Register event listener
    socket.on('alert-triggered', handleAlertTriggered);

    // Cleanup listener on unmount
    return () => {
      socket.off('alert-triggered', handleAlertTriggered);
    };
  }, [socket, isConnected]);

  // Filter alerts based on criteria
  const filteredAlerts = alerts.filter(alert => {
    if (filter.symbol && !alert.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) {
      return false;
    }
    
    if (filter.dateRange !== 'all') {
      const alertDate = new Date(alert.createdAt);
      const now = new Date();
      const hoursDiff = (now - alertDate) / (1000 * 60 * 60);
      
      if (filter.dateRange === '1h' && hoursDiff > 1) return false;
      if (filter.dateRange === '24h' && hoursDiff > 24) return false;
      if (filter.dateRange === '7d' && hoursDiff > 168) return false;
    }
    
    return true;
  });

  // Handle alert selection for chart
  const handleAlertClick = useCallback((alert) => {
    setSelectedAlert(alert);
    setShowChart(true);
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format price
  const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(8)}`;
  };

  // Get condition status color
  const getConditionColor = (condition) => {
    if (condition === 'minDailyCandle') return 'bg-blue-100 text-blue-800';
    if (condition === 'changePercent') return 'bg-green-100 text-green-800';
    if (condition === 'alertCount') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Get direction emoji
  const getDirectionEmoji = (direction) => {
    if (direction === '>') return '📈';
    if (direction === '<') return '📉';
    return '📊';
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading triggered alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Triggered Alerts History</h1>
              <p className="text-sm text-gray-600">
                {alerts.length} alerts triggered • {isConnected && <span className="text-green-500">● Live</span>}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={loadAlerts}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Symbol
              </label>
              <input
                type="text"
                value={filter.symbol}
                onChange={(e) => setFilter(prev => ({ ...prev, symbol: e.target.value }))}
                placeholder="Filter by symbol..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={filter.dateRange}
                onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="sent">Notification Sent</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading alerts</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No triggered alerts</h3>
            <p className="mt-1 text-sm text-gray-500">No alerts have been triggered yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert._id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg">
                          {getDirectionEmoji(alert.direction)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {alert.symbol} Alert Triggered
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatTimestamp(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-lg font-medium text-gray-900">
                        {formatPrice(alert.triggeredPrice)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Target: {formatPrice(alert.targetPrice)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAlertClick(alert)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      View Chart
                    </button>
                  </div>
                </div>
                
                {/* Condition Results */}
                {alert.conditionResults && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Conditions Met:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(alert.conditionResults).map(([condition, result]) => (
                        result.passed && (
                          <span
                            key={condition}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(condition)}`}
                          >
                            {condition === 'minDailyCandle' && '📏 Min Daily Candle'}
                            {condition === 'changePercent' && '📈 Change %'}
                            {condition === 'alertCount' && '📊 Alert Count'}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Alert Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Direction:</span>
                    <span className="ml-2 text-gray-900">
                      {alert.direction === '>' ? 'Above' : 'Below'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Notification:</span>
                    <span className={`ml-2 ${alert.notificationSent ? 'text-green-600' : 'text-yellow-600'}`}>
                      {alert.notificationSent ? 'Sent' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Price Change:</span>
                    <span className="ml-2 text-gray-900">
                      {alert.conditionResults?.changePercent?.details?.percentageChange?.toFixed(2) || 'N/A'}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart Modal */}
      {showChart && selectedAlert && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedAlert.symbol} Chart - Alert Triggered
                </h3>
                <button
                  onClick={() => setShowChart(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Alert Triggered:</strong> {formatTimestamp(selectedAlert.createdAt)}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Triggered Price:</strong> {formatPrice(selectedAlert.triggeredPrice)}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Target Price:</strong> {formatPrice(selectedAlert.targetPrice)}
                </p>
              </div>
              <LineChart symbol={selectedAlert.symbol} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriggeredAlertsHistory;
