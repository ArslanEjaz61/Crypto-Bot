import React, { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';

// Direct HTML implementation of TradingView widget with metrics
const TradingViewChart = () => {
  const scriptRef = useRef(null);
  const widgetRef = useRef(null);

  // Direct HTML content for TradingView widget
  const widgetHtml = `
    <!-- TradingView Widget BEGIN -->
    <div class="tradingview-widget-container">
      <div id="tradingview_chart" style="height: 600px; width: 100%;"></div>
    </div>
    <!-- TradingView Widget END -->
  `;

  useEffect(() => {
    // Load TradingView script and initialize widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // Create new TradingView widget
      widgetRef.current = new window.TradingView.widget({
        "width": "100%",
        "height": 600,
        "symbol": "BINANCE:BTCUSDT",
        "interval": "240", // 4h timeframe
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "hide_top_toolbar": false,
        "container_id": "tradingview_chart"
      });
      
      // No symbol change listeners needed
    };
    
    // Save reference to script and append to document
    scriptRef.current = script;
    document.body.appendChild(script);

    // Clean up on unmount
    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
    };
  }, []);

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box 
        sx={{ width: '100%', height: 600 }}
        dangerouslySetInnerHTML={{ __html: widgetHtml }}
      />
    </Paper>
  );
};

export default TradingViewChart;
