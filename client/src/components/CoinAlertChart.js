import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Chip } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useFilters } from '../context/FilterContext';
import { createChart } from 'lightweight-charts';

const CoinAlertChart = ({ symbol, timeframe = '1h', meetsConditions = false }) => {
  const { filters, getValidationFilters } = useFilters();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alertLevels, setAlertLevels] = useState(null);

  // Extract alert levels from filters
  useEffect(() => {
    if (!filters) return;
    
    // Extract price levels from filters that can be visualized on the chart
    const validationFilters = getValidationFilters();
    const levels = {};
    
    if (validationFilters.price) {
      if (validationFilters.price.min) {
        levels.support = validationFilters.price.min;
      }
      if (validationFilters.price.max) {
        levels.resistance = validationFilters.price.max;
      }
    }
    
    setAlertLevels(levels);
  }, [filters, getValidationFilters]);

  // Fetch chart data
  useEffect(() => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);

    // Fetch chart data from our API endpoint that connects to Binance
    fetch(`/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setChartData(data);
        } else {
          setError('No chart data available');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching chart data:', err);
        setError(`Failed to load chart data: ${err.message}`);
        setLoading(false);
      });

    return () => {
      // Cleanup function if needed
    };
  }, [symbol, timeframe]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || loading || error || chartData.length === 0) return;

    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1c252b' },
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: { color: '#2c3940' },
        horzLines: { color: '#2c3940' },
      },
      timeScale: {
        borderColor: '#2c3940',
        timeVisible: true,
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#9acd32',
      downColor: '#ff4500',
      borderVisible: false,
      wickUpColor: '#9acd32',
      wickDownColor: '#ff4500',
    });
    
    // Add price line markers for alert conditions if available
    if (alertLevels) {
      if (alertLevels.support) {
        candleSeries.createPriceLine({
          price: alertLevels.support,
          color: '#4CAF50',
          lineWidth: 2,
          lineStyle: 2, // Dashed line
          axisLabelVisible: true,
          title: 'Support Level',
        });
      }
      
      if (alertLevels.resistance) {
        candleSeries.createPriceLine({
          price: alertLevels.resistance,
          color: '#FF5252',
          lineWidth: 2,
          lineStyle: 2, // Dashed line
          axisLabelVisible: true,
          title: 'Resistance Level',
        });
      }
    }

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#3875d7',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Set data
    candleSeries.setData(chartData);
    volumeSeries.setData(chartData.map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close > item.open ? '#9acd32' : '#ff4500',
    })));

    // Fit content
    chart.timeScale().fitContent();

    // Save chart reference
    chartRef.current = chart;

    // Handle resize
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    
    resizeObserverRef.current = new ResizeObserver(entries => {
      if (chartRef.current && entries[0].contentRect) {
        chartRef.current.applyOptions({ 
          width: entries[0].contentRect.width,
          height: 400
        });
        chartRef.current.timeScale().fitContent();
      }
    });
    
    resizeObserverRef.current.observe(chartContainerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [chartData, loading, error]);

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="h3">
            {symbol} Chart - {timeframe.toUpperCase()}
          </Typography>
          {meetsConditions && (
            <Chip 
              icon={<NotificationsActiveIcon />} 
              label="Alert Condition Met" 
              color="warning" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          )}
        </Box>
      </Box>

      <Box 
        ref={chartContainerRef} 
        sx={{ 
          width: '100%', 
          height: 400, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && error && (
          <Typography color="error.main">
            {error}
          </Typography>
        )}
        
        {!loading && !error && chartData.length === 0 && (
          <Typography>
            No chart data available
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CoinAlertChart;
