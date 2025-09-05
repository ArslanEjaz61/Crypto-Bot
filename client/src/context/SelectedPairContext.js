import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const SelectedPairContext = createContext();

// Initial state
const initialState = {
  selectedSymbol: 'BTCUSDT',
  selectedTimeframe: '1h',
  chartData: null,
  indicators: {
    rsi: null,
    ema: null,
    volume: null,
    ohlcv: null
  }
};

// Provider component
export const SelectedPairProvider = ({ children }) => {
  const [state, setState] = useState(initialState);

  // Update selected symbol and fetch related data
  const selectSymbol = useCallback(async (symbol) => {
    console.log(`SelectedPairContext: Selecting symbol ${symbol}`);
    
    setState(prevState => ({
      ...prevState,
      selectedSymbol: symbol,
      // Reset indicators when symbol changes
      indicators: {
        rsi: null,
        ema: null,
        volume: null,
        ohlcv: null
      }
    }));

    // Fetch indicators for the selected symbol
    try {
      await fetchIndicators(symbol);
    } catch (error) {
      console.error('Error fetching indicators for', symbol, ':', error);
    }
  }, []);

  // Update selected timeframe
  const selectTimeframe = useCallback((timeframe) => {
    console.log(`SelectedPairContext: Selecting timeframe ${timeframe}`);
    
    setState(prevState => ({
      ...prevState,
      selectedTimeframe: timeframe
    }));
  }, []);

  // Fetch indicators data for the selected symbol
  const fetchIndicators = useCallback(async (symbol = state.selectedSymbol) => {
    // Ensure symbol is a string, not an object
    const symbolStr = typeof symbol === 'object' ? 
      (symbol.symbol || 'BTCUSDT') : // Extract symbol property if it's an object
      String(symbol); // Convert to string otherwise
    
    console.log(`Fetching indicators for ${symbolStr}`);
    
    try {
      // Fetch RSI data
      const rsiResponse = await fetch(`/api/crypto/${symbolStr}/rsi?period=14&timeframe=${state.selectedTimeframe}`);
      const rsiData = rsiResponse.ok ? await rsiResponse.json() : null;

      // Fetch EMA data  
      const emaResponse = await fetch(`/api/crypto/${symbolStr}/ema?periods=9,12,26,50,200&timeframe=${state.selectedTimeframe}`);
      const emaData = emaResponse.ok ? await emaResponse.json() : null;

      // Fetch volume history
      const volumeResponse = await fetch(`/api/crypto/${symbolStr}/volume-history?limit=10`);
      const volumeData = volumeResponse.ok ? await volumeResponse.json() : null;

      // Fetch OHLCV data
      const ohlcvResponse = await fetch(`/api/crypto/${symbolStr}/ohlcv?timeframe=${state.selectedTimeframe}&limit=1`);
      const ohlcvData = ohlcvResponse.ok ? await ohlcvResponse.json() : null;

      // Update state with fetched indicators
      setState(prevState => ({
        ...prevState,
        indicators: {
          rsi: rsiData,
          ema: emaData,
          volume: volumeData,
          ohlcv: ohlcvData
        }
      }));

      console.log('Indicators fetched successfully for', symbol);
    } catch (error) {
      console.error('Error fetching indicators:', error);
    }
  }, [state.selectedSymbol, state.selectedTimeframe]);

  // Refresh indicators (useful for real-time updates)
  const refreshIndicators = useCallback(async () => {
    await fetchIndicators();
  }, [fetchIndicators]);

  // Get formatted data for alert calculations
  const getIndicatorData = useCallback(() => {
    const { indicators } = state;
    
    return {
      symbol: state.selectedSymbol,
      timeframe: state.selectedTimeframe,
      rsi: indicators.rsi,
      ema: indicators.ema,
      volume: indicators.volume,
      ohlcv: indicators.ohlcv
    };
  }, [state]);

  const value = {
    ...state,
    selectSymbol,
    selectTimeframe,
    fetchIndicators,
    refreshIndicators,
    getIndicatorData
  };

  return (
    <SelectedPairContext.Provider value={value}>
      {children}
    </SelectedPairContext.Provider>
  );
};

// Custom hook to use the context
export const useSelectedPair = () => {
  const context = useContext(SelectedPairContext);
  if (!context) {
    throw new Error('useSelectedPair must be used within a SelectedPairProvider');
  }
  return context;
};

export default SelectedPairProvider;
