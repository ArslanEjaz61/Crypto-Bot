import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

// Create Context
const FilterContext = createContext();

// Create Provider
export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    // Market Section
    market: { SPOT: true },
    
    // Exchange Section
    exchange: { BINANCE: true },
    
    // Pair Section
    pair: { USDT: true },
    
    // Min. Daily Section
    minDaily: { },
    
    
    // Change % Section
    changePercent: { },
    percentageValue: '',
    
    // Alert Count Section
    alertCount: { },
    
    // Candle Section
    candle: { },
    candleCondition: 'Candle Above Open',
    
    // RSI Range Section
    rsiRange: { },
    rsiPeriod: '14',
    rsiLevel: '70',
    rsiCondition: 'ABOVE',
    
    // EMA Section
    ema: { },
    emaFast: '12',
    emaSlow: '26',
    emaCondition: 'CROSSING UP',
  });

  // Apply filters to data
  const applyFilters = useCallback((data) => {
    if (!data || !Array.isArray(data)) return [];

    return data.filter(item => {
      // Market Filter
      if (filters.market && Object.keys(filters.market).some(market => filters.market[market]) &&
          !Object.keys(filters.market).filter(market => filters.market[market]).includes(item.market)) {
        return false;
      }

      // Exchange Filter
      if (filters.exchange && Object.keys(filters.exchange).some(exchange => filters.exchange[exchange]) &&
          !Object.keys(filters.exchange).filter(exchange => filters.exchange[exchange]).includes(item.exchange)) {
        return false;
      }

      // Pair Filter
      if (filters.pair && Object.keys(filters.pair).some(pair => filters.pair[pair])) {
        const pairs = Object.keys(filters.pair).filter(pair => filters.pair[pair]);
        if (!pairs.some(pair => item.symbol.endsWith(pair))) {
          return false;
        }
      }

      // Min Daily Volume Filter
      if (filters.minDaily && Object.keys(filters.minDaily).some(volume => filters.minDaily[volume])) {
        const volumes = {
          '10K': 10000,
          '100K': 100000,
          '500K': 500000,
          '1MN': 1000000,
          '2MN': 2000000,
          '5MN': 5000000,
          '10MN': 10000000,
          '25MN': 25000000,
          '50MN_PLUS': 50000000
        };
        
        const selectedVolumes = Object.keys(filters.minDaily)
          .filter(vol => filters.minDaily[vol])
          .map(vol => volumes[vol]);
        
        const minVolume = Math.min(...selectedVolumes);
        
        if (item.volume < minVolume) {
          return false;
        }
      }


      // RSI Range Filter
      if (filters.rsiRange && Object.keys(filters.rsiRange).some(timeframe => filters.rsiRange[timeframe])) {
        const timeframes = Object.keys(filters.rsiRange).filter(tf => filters.rsiRange[tf]);
        const rsiPeriod = parseInt(filters.rsiPeriod) || 14;
        const rsiLevel = parseInt(filters.rsiLevel) || 70;
        
        // Check if at least one timeframe has RSI in the correct range
        const hasValidRSI = timeframes.some(timeframe => {
          const rsiKey = `rsi_${timeframe.toLowerCase()}_${rsiPeriod}`;
          const rsiValue = item[rsiKey];
          
          if (rsiValue === undefined) return false;
          
          if (filters.rsiCondition === 'ABOVE') {
            return rsiValue >= rsiLevel;
          } else if (filters.rsiCondition === 'BELOW') {
            return rsiValue <= rsiLevel;
          }
          
          return false;
        });
        
        if (!hasValidRSI) return false;
      }

      // EMA Filter
      if (filters.ema && Object.keys(filters.ema).some(timeframe => filters.ema[timeframe])) {
        const timeframes = Object.keys(filters.ema).filter(tf => filters.ema[tf]);
        const emaFast = parseInt(filters.emaFast) || 12;
        const emaSlow = parseInt(filters.emaSlow) || 26;
        
        // Check if at least one timeframe has the correct EMA relationship
        const hasValidEMA = timeframes.some(timeframe => {
          const emaFastKey = `ema_${timeframe.toLowerCase()}_${emaFast}`;
          const emaSlowKey = `ema_${timeframe.toLowerCase()}_${emaSlow}`;
          const emaFastValue = item[emaFastKey];
          const emaSlowValue = item[emaSlowKey];
          
          if (emaFastValue === undefined || emaSlowValue === undefined) return false;
          
          if (filters.emaCondition === 'ABOVE') {
            return emaFastValue > emaSlowValue;
          } else if (filters.emaCondition === 'BELOW') {
            return emaFastValue < emaSlowValue;
          } else if (filters.emaCondition === 'CROSSING UP') {
            // Would need previous values to determine crossing
            return emaFastValue > emaSlowValue && 
                   (item.previous && item.previous[emaFastKey] < item.previous[emaSlowKey]);
          } else if (filters.emaCondition === 'CROSSING DOWN') {
            // Would need previous values to determine crossing
            return emaFastValue < emaSlowValue && 
                   (item.previous && item.previous[emaFastKey] > item.previous[emaSlowKey]);
          }
          
          return false;
        });
        
        if (!hasValidEMA) return false;
      }


      // Add more filters as needed for candles, alert count, etc.

      return true;
    });
  }, [filters]);

  // Convert filters to the format expected by the backend validation endpoint
  const getValidationFilters = useCallback(() => {
    const validationFilters = {};
    
    
    // RSI Range filter
    if (filters.rsiRange && Object.keys(filters.rsiRange).some(tf => filters.rsiRange[tf])) {
      const timeframes = Object.keys(filters.rsiRange).filter(tf => filters.rsiRange[tf]);
      if (timeframes.length > 0) {
        validationFilters.rsi = {
          timeframe: timeframes[0].toLowerCase(),
          period: filters.rsiPeriod,
          [filters.rsiCondition === 'ABOVE' ? 'min' : 'max']: filters.rsiLevel
        };
      }
    }
    
    // Change % filter
    if (filters.changePercent && Object.keys(filters.changePercent).some(tf => filters.changePercent[tf])) {
      const timeframes = Object.keys(filters.changePercent).filter(tf => filters.changePercent[tf]);
      if (timeframes.length > 0 && filters.percentageValue) {
        validationFilters.change = {
          timeframe: timeframes[0],
          min: parseFloat(filters.percentageValue)
        };
      }
    }
    
    return validationFilters;
  }, [filters]);
  
  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const filter = filters[key];
      if (typeof filter === 'object') {
        return Object.values(filter).some(val => val === true);
      }
      return false;
    });
  }, [filters]);

  return (
    <FilterContext.Provider 
      value={{ 
        filters, 
        setFilters, 
        applyFilters, 
        getValidationFilters,
        hasActiveFilters 
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

// Custom Hook
export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

export default FilterContext;
