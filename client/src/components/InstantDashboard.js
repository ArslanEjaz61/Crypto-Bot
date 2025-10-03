import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import LineChart from './LineChart';
import Notification from './Notification';

/**
 * Instant Dashboard Component
 * 
 * Features:
 * - Instant loading of USDT pairs (no disappearing after 15000ms)
 * - Real-time volume updates
 * - Live price updates via WebSocket
 * - Optimized performance
 */

const InstantDashboard = () => {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [minVolume, setMinVolume] = useState(0);
  const [sortBy, setSortBy] = useState('volume24h');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPair, setSelectedPair] = useState(null);
  const [showChart, setShowChart] = useState(false);
  
  const { socket, isConnected } = useSocket();

  // Load pairs instantly from cache
  const loadPairs = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      
      console.log('⚡ Loading pairs instantly...');
      
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = `${baseUrl}/api/pairs/instant`;
      
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
        console.log(`✅ Loaded ${data.totalCount} pairs instantly`);
        setPairs(data.pairs || []);
        setLastUpdate(data.timestamp);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to load pairs');
      }
      
    } catch (err) {
      console.error('❌ Error loading pairs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load pairs on component mount
  useEffect(() => {
    loadPairs();
  }, [loadPairs]);

  // Set up WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔌 Setting up WebSocket listeners for real-time updates');

    // Listen for price updates
    const handlePriceUpdate = (data) => {
      console.log('📊 Price update received:', data);
      
      setPairs(prevPairs => {
        return prevPairs.map(pair => {
          if (pair.symbol === data.symbol) {
            return {
              ...pair,
              price: data.price,
              volume24h: data.volume || pair.volume24h,
              priceChangePercent24h: data.priceChangePercent || pair.priceChangePercent24h,
              high24h: data.high24h || pair.high24h,
              low24h: data.low24h || pair.low24h,
              open24h: data.open24h || pair.open24h,
              _liveData: true,
              _lastUpdate: data.timestamp
            };
          }
          return pair;
        });
      });
    };

    // Listen for pairs updates
    const handlePairsUpdate = (data) => {
      console.log('📊 Pairs update received:', data);
      // Optionally refresh pairs data
      if (data.count > 0) {
        loadPairs(true); // Silent refresh
      }
    };

    // Listen for triggered alerts
    const handleAlertTriggered = (data) => {
      console.log('🚨 Alert triggered:', data);
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          `🚨 Alert triggered for ${data.symbol} at $${data.price}`,
          'success'
        );
      }
    };

    // Register event listeners
    socket.on('price-update', handlePriceUpdate);
    socket.on('pairs-update', handlePairsUpdate);
    socket.on('alert-triggered', handleAlertTriggered);

    // Cleanup listeners on unmount
    return () => {
      socket.off('price-update', handlePriceUpdate);
      socket.off('pairs-update', handlePairsUpdate);
      socket.off('alert-triggered', handleAlertTriggered);
    };
  }, [socket, isConnected, loadPairs]);

  // Filter and sort pairs
  const filteredPairs = useMemo(() => {
    let filtered = pairs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pair =>
        pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pair.name && pair.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply volume filter
    if (minVolume > 0) {
      filtered = filtered.filter(pair => (pair.volume24h || 0) >= minVolume);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [pairs, searchTerm, minVolume, sortBy, sortOrder]);

  // Handle pair selection for chart
  const handlePairClick = useCallback((pair) => {
    setSelectedPair(pair);
    setShowChart(true);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadPairs(true);
  }, [loadPairs]);

  // Format number with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  // Format percentage
  const formatPercentage = (num) => {
    if (num === null || num === undefined) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  // Get price change color
  const getPriceChangeColor = (change) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  if (loading && pairs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading pairs instantly...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Instant Trading Pairs</h1>
              <p className="text-sm text-gray-600">
                {pairs.length} pairs loaded • {lastUpdate ? `Last update: ${new Date(lastUpdate).toLocaleTimeString()}` : 'No data'}
                {isConnected && <span className="ml-2 text-green-500">● Live</span>}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by symbol..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Volume
              </label>
              <input
                type="number"
                value={minVolume}
                onChange={(e) => setMinVolume(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="volume24h">Volume</option>
                <option value="price">Price</option>
                <option value="priceChangePercent24h">Change %</option>
                <option value="symbol">Symbol</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
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
                <h3 className="text-sm font-medium text-red-800">Error loading pairs</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pairs Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Trading Pairs ({filteredPairs.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Real-time USDT trading pairs with live volume updates
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume 24h
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    High 24h
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Low 24h
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPairs.map((pair) => (
                  <tr key={pair.symbol} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {pair.symbol.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {pair.symbol}
                          </div>
                          {pair.name && (
                            <div className="text-sm text-gray-500">{pair.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${parseFloat(pair.price || 0).toFixed(8)}
                      </div>
                      {pair._liveData && (
                        <div className="text-xs text-green-500">● Live</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getPriceChangeColor(pair.priceChangePercent24h)}`}>
                        {formatPercentage(pair.priceChangePercent24h)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatNumber(pair.volume24h)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${parseFloat(pair.high24h || 0).toFixed(8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${parseFloat(pair.low24h || 0).toFixed(8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handlePairClick(pair)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Chart
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Create Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chart Modal */}
      {showChart && selectedPair && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedPair.symbol} Chart
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
              <LineChart symbol={selectedPair.symbol} />
            </div>
          </div>
        </div>
      )}

      {/* Notification Component */}
      <Notification />
    </div>
  );
};

export default InstantDashboard;
