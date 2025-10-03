import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Instant Alert Creator Component
 * 
 * Features:
 * - Instant response (no waiting for 436 DB operations)
 * - Real-time progress updates via WebSocket
 * - Background job processing
 * - Non-blocking UI experience
 */

const InstantAlertCreator = () => {
  const [selectedPairs, setSelectedPairs] = useState([]);
  const [conditions, setConditions] = useState({
    direction: '>',
    targetType: 'percentage',
    targetValue: 1,
    changePercentValue: 5,
    minDailyVolume: 1000000,
    alertCountEnabled: true,
    alertCountTimeframe: '5MIN',
    maxAlertsPerTimeframe: 3,
    deleteExisting: true,
    comment: '',
    email: 'user@example.com'
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [availablePairs, setAvailablePairs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minVolume, setMinVolume] = useState(0);
  
  const { socket, isConnected } = useSocket();

  // Load available pairs
  const loadAvailablePairs = useCallback(async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${baseUrl}/api/alerts/pairs/available?limit=1000&minVolume=${minVolume}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailablePairs(data.pairs);
      }
    } catch (error) {
      console.error('Error loading available pairs:', error);
    }
  }, [minVolume]);

  // Load pairs on component mount
  useEffect(() => {
    loadAvailablePairs();
  }, [loadAvailablePairs]);

  // Set up WebSocket listeners for job progress
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔌 Setting up WebSocket listeners for alert job progress');

    const handleJobProgress = (data) => {
      console.log('📊 Job progress update:', data);
      
      if (data.jobId === jobId) {
        setProgress(data.progress);
        setStatus(data.message);
        
        if (data.status === 'completed') {
          setIsCreating(false);
          setJobId(null);
          setProgress(100);
          setStatus('All alerts created successfully!');
          
          // Show success notification
          if (window.showNotification) {
            window.showNotification(
              `✅ Created ${data.totalCreated} alerts successfully!`,
              'success'
            );
          }
        } else if (data.status === 'error') {
          setIsCreating(false);
          setJobId(null);
          setError(data.message);
          
          // Show error notification
          if (window.showNotification) {
            window.showNotification(
              `❌ Alert creation failed: ${data.message}`,
              'error'
            );
          }
        }
      }
    };

    // Register event listener
    socket.on('alert-job-progress', handleJobProgress);

    // Cleanup listener on unmount
    return () => {
      socket.off('alert-job-progress', handleJobProgress);
    };
  }, [socket, isConnected, jobId]);

  // Handle pair selection
  const handlePairToggle = (pair) => {
    setSelectedPairs(prev => {
      const isSelected = prev.some(p => p.symbol === pair.symbol);
      if (isSelected) {
        return prev.filter(p => p.symbol !== pair.symbol);
      } else {
        return [...prev, pair];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedPairs.length === filteredPairs.length) {
      setSelectedPairs([]);
    } else {
      setSelectedPairs(filteredPairs);
    }
  };

  // Filter pairs based on search term
  const filteredPairs = availablePairs.filter(pair =>
    pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pair.name && pair.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Create alerts instantly
  const handleCreateAlerts = async () => {
    if (selectedPairs.length === 0) {
      alert('Please select at least one pair');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setProgress(0);
      setStatus('Queuing alert creation...');

      const baseUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${baseUrl}/api/alerts/instant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pairs: selectedPairs,
          conditions,
          userId: 'user123', // In real app, get from auth context
          sessionId: 'session123'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJobId(data.jobId);
        setStatus('Alerts are being generated, you will be notified shortly...');
        
        // Show instant success notification
        if (window.showNotification) {
          window.showNotification(
            `⚡ Alert creation started for ${selectedPairs.length} pairs!`,
            'info'
          );
        }
      } else {
        throw new Error(data.error || 'Failed to create alerts');
      }

    } catch (error) {
      console.error('Error creating alerts:', error);
      setIsCreating(false);
      setError(error.message);
      
      if (window.showNotification) {
        window.showNotification(
          `❌ Failed to create alerts: ${error.message}`,
          'error'
        );
      }
    }
  };

  // Cancel job
  const handleCancelJob = async () => {
    if (!jobId) return;

    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      await fetch(`${baseUrl}/api/alerts/job/${jobId}/cancel`, {
        method: 'POST',
      });

      setIsCreating(false);
      setJobId(null);
      setProgress(0);
      setStatus('');
      
      if (window.showNotification) {
        window.showNotification('🚫 Job cancellation requested', 'info');
      }
    } catch (error) {
      console.error('Error canceling job:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Instant Alert Creator</h1>
              <p className="text-sm text-gray-600">
                Create alerts instantly with background processing
                {isConnected && <span className="ml-2 text-green-500">● Live</span>}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={loadAvailablePairs}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Refresh Pairs
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Alert Conditions */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Conditions</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Direction
                  </label>
                  <select
                    value={conditions.direction}
                    onChange={(e) => setConditions(prev => ({ ...prev, direction: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value=">">Above</option>
                    <option value="<">Below</option>
                    <option value="<>">Either Way</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Change Percentage
                  </label>
                  <input
                    type="number"
                    value={conditions.changePercentValue}
                    onChange={(e) => setConditions(prev => ({ ...prev, changePercentValue: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Daily Volume
                  </label>
                  <input
                    type="number"
                    value={conditions.minDailyVolume}
                    onChange={(e) => setConditions(prev => ({ ...prev, minDailyVolume: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="deleteExisting"
                    checked={conditions.deleteExisting}
                    onChange={(e) => setConditions(prev => ({ ...prev, deleteExisting: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="deleteExisting" className="ml-2 block text-sm text-gray-900">
                    Delete existing alerts
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment
                  </label>
                  <textarea
                    value={conditions.comment}
                    onChange={(e) => setConditions(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional comment..."
                  />
                </div>
              </div>

              {/* Progress Section */}
              {isCreating && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-900">Creating Alerts...</span>
                    <span className="text-sm text-blue-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">{status}</p>
                  
                  <button
                    onClick={handleCancelJob}
                    className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    Cancel Job
                  </button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateAlerts}
                disabled={isCreating || selectedPairs.length === 0}
                className={`w-full mt-6 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isCreating || selectedPairs.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isCreating ? 'Creating Alerts...' : `Create ${selectedPairs.length} Alerts`}
              </button>
            </div>
          </div>

          {/* Pairs Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Pairs ({selectedPairs.length} selected)
                </h3>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  {selectedPairs.length === filteredPairs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search pairs..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={minVolume}
                    onChange={(e) => setMinVolume(parseFloat(e.target.value))}
                    placeholder="Min volume filter..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pairs List */}
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {filteredPairs.map((pair) => {
                    const isSelected = selectedPairs.some(p => p.symbol === pair.symbol);
                    return (
                      <div
                        key={pair.symbol}
                        onClick={() => handlePairToggle(pair)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{pair.symbol}</div>
                            {pair.name && (
                              <div className="text-sm text-gray-500">{pair.name}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ${parseFloat(pair.price || 0).toFixed(8)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Vol: {parseInt(pair.volume24h || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantAlertCreator;
