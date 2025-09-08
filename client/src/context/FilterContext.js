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
    
    // Min. Daily Section - Default to empty for null handling
    minDaily: {},
    
    // Change % Section - Default to empty for null handling
    changePercent: {},
    percentageValue: null,
    
    // Alert Count Section - Default to empty for null handling
    alertCount: {},
    
    // Candle Section
    candle: {},
    candleCondition: 'NONE',
    
    // RSI Range Section
    rsiRange: {},
    rsiPeriod: null,
    rsiLevel: null,
    rsiCondition: 'NONE',
    
    // EMA Section
    ema: {},
    emaFast: null,
    emaSlow: null,
    emaCondition: 'NONE',
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

      // Min Daily Volume Filter - Enhanced OHLCV integration
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
        
        if (selectedVolumes.length > 0) {
          const minVolume = Math.min(...selectedVolumes);
          // Use both volume and quoteVolume from OHLCV data
          const itemVolume = item.volume || item.quoteVolume || 0;
          if (itemVolume < minVolume) {
            return false;
          }
        }
      }

      // Change % Filter - Enhanced with OHLCV price change calculation
      if (filters.changePercent && Object.keys(filters.changePercent).some(tf => filters.changePercent[tf]) && filters.percentageValue) {
        const timeframes = Object.keys(filters.changePercent).filter(tf => filters.changePercent[tf]);
        const targetPercentage = parseFloat(filters.percentageValue);
        
        if (timeframes.length > 0 && !isNaN(targetPercentage)) {
          // Check if price change meets the percentage requirement for any selected timeframe
          const hasValidChange = timeframes.some(timeframe => {
            const changeKey = `priceChangePercent_${timeframe.toLowerCase()}`;
            const priceChange = parseFloat(item[changeKey] || item.priceChangePercent || 0);
            return Math.abs(priceChange) >= Math.abs(targetPercentage);
          });
          
          if (!hasValidChange) return false;
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

  // Enhanced validation filters with comprehensive logic checking
  const getValidationFilters = useCallback(() => {
    const validationFilters = {};
    const errors = [];
    const warnings = [];
    
    // Enhanced Min Daily Volume filter with validation
    if (filters.minDaily && Object.keys(filters.minDaily).some(vol => filters.minDaily[vol])) {
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
      
      if (selectedVolumes.length > 0) {
        validationFilters.minDailyVolume = Math.min(...selectedVolumes);
        if (selectedVolumes.length > 1) {
          warnings.push('Multiple volume filters selected - using minimum value');
        }
        if (validationFilters.minDailyVolume >= 50000000) {
          warnings.push('Very high volume filter may result in few matches');
        }
      } else {
        validationFilters.minDailyVolume = 0;
      }
    } else {
      validationFilters.minDailyVolume = 0;
    }
    
    // Enhanced Change % filter with comprehensive validation
    if (filters.changePercent && Object.keys(filters.changePercent).some(tf => filters.changePercent[tf]) && filters.percentageValue) {
      const timeframes = Object.keys(filters.changePercent).filter(tf => filters.changePercent[tf]);
      const percentageVal = parseFloat(filters.percentageValue);
      
      if (timeframes.length > 0 && !isNaN(percentageVal)) {
        if (percentageVal === 0) {
          errors.push('Percentage value cannot be zero');
        } else if (Math.abs(percentageVal) > 100) {
          warnings.push('Percentage over 100% may rarely trigger');
        } else if (Math.abs(percentageVal) < 0.1) {
          warnings.push('Very small percentage may trigger frequently');
        }
        
        validationFilters.change = {
          timeframe: timeframes[0],
          percentage: percentageVal
        };
        
        if (timeframes.length > 1) {
          warnings.push('Multiple Change % timeframes selected - using first one');
        }
      } else {
        if (timeframes.length > 0 && isNaN(percentageVal)) {
          errors.push('Valid percentage value required for Change % filter');
        }
        validationFilters.change = { timeframe: null, percentage: 0 };
      }
    } else {
      validationFilters.change = { timeframe: null, percentage: 0 };
    }
    
    // Alert Count filter - Timeframe-based alert frequency
    if (filters.alertCount && Object.keys(filters.alertCount).some(tf => filters.alertCount[tf])) {
      const timeframes = Object.keys(filters.alertCount).filter(tf => filters.alertCount[tf]);
      if (timeframes.length > 0) {
        validationFilters.alertCount = {
          timeframe: timeframes[0],
          enabled: true
        };
      } else {
        validationFilters.alertCount = { timeframe: null, enabled: false };
      }
    } else {
      validationFilters.alertCount = { timeframe: null, enabled: false };
    }
    
    // Enhanced RSI Range filter with logical validation
    if (filters.rsiRange && Object.keys(filters.rsiRange).some(tf => filters.rsiRange[tf]) && filters.rsiPeriod && filters.rsiLevel) {
      const timeframes = Object.keys(filters.rsiRange).filter(tf => filters.rsiRange[tf]);
      const period = parseInt(filters.rsiPeriod);
      const level = parseInt(filters.rsiLevel);
      
      if (timeframes.length > 0) {
        // Validate RSI parameters
        if (isNaN(period) || period < 2) {
          errors.push('RSI period must be at least 2');
        } else if (period > 100) {
          warnings.push('RSI period over 100 may be too slow');
        }
        
        if (isNaN(level) || level < 0 || level > 100) {
          errors.push('RSI level must be between 0 and 100');
        } else {
          // Logical RSI warnings based on condition
          if (filters.rsiCondition === 'ABOVE' && level < 50) {
            warnings.push('RSI ABOVE with level below 50 may trigger frequently');
          } else if (filters.rsiCondition === 'BELOW' && level > 50) {
            warnings.push('RSI BELOW with level above 50 may trigger frequently');
          }
        }
        
        if (!filters.rsiCondition || filters.rsiCondition === 'NONE') {
          errors.push('RSI condition must be selected');
        }
        
        validationFilters.rsi = {
          timeframe: timeframes[0].toLowerCase(),
          period: period || 14,
          level: level || 70,
          condition: filters.rsiCondition || 'NONE'
        };
        
        if (timeframes.length > 1) {
          warnings.push('Multiple RSI timeframes selected - using first one');
        }
      } else {
        validationFilters.rsi = null;
      }
    } else {
      validationFilters.rsi = null;
    }
    
    // Enhanced EMA filter with relationship validation
    if (filters.ema && Object.keys(filters.ema).some(tf => filters.ema[tf]) && filters.emaFast && filters.emaSlow) {
      const timeframes = Object.keys(filters.ema).filter(tf => filters.ema[tf]);
      const fastPeriod = parseInt(filters.emaFast);
      const slowPeriod = parseInt(filters.emaSlow);
      
      if (timeframes.length > 0) {
        // Validate EMA parameters
        if (isNaN(fastPeriod) || fastPeriod < 2) {
          errors.push('EMA Fast period must be at least 2');
        }
        
        if (isNaN(slowPeriod) || slowPeriod < 2) {
          errors.push('EMA Slow period must be at least 2');
        }
        
        if (fastPeriod >= slowPeriod) {
          errors.push('EMA Fast period must be less than Slow period');
        } else {
          const ratio = slowPeriod / fastPeriod;
          if (ratio < 1.5) {
            warnings.push('EMA periods very close - consider wider separation');
          } else if (ratio > 10) {
            warnings.push('EMA periods very far apart - may cause delayed signals');
          }
        }
        
        if (!filters.emaCondition || filters.emaCondition === 'NONE') {
          errors.push('EMA condition must be selected');
        }
        
        validationFilters.ema = {
          timeframe: timeframes[0].toLowerCase(),
          fastPeriod: fastPeriod || 12,
          slowPeriod: slowPeriod || 26,
          condition: filters.emaCondition || 'NONE'
        };
        
        if (timeframes.length > 1) {
          warnings.push('Multiple EMA timeframes selected - using first one');
        }
      } else {
        validationFilters.ema = null;
      }
    } else {
      validationFilters.ema = null;
    }
    
    // Add validation results to the return object
    validationFilters._validation = { errors, warnings };
    return validationFilters;
  }, [filters]);
  
  // Check if any filter is active (excluding always-active defaults)
  const hasActiveFilters = useMemo(() => {
    const excludeDefaults = ['market', 'exchange', 'pair']; // Always active defaults
    return Object.keys(filters).some(key => {
      if (excludeDefaults.includes(key)) return false;
      
      const filter = filters[key];
      if (typeof filter === 'object' && filter !== null) {
        return Object.values(filter).some(val => val === true);
      }
      if (typeof filter === 'string' && filter !== '' && filter !== 'NONE') {
        return true;
      }
      return filter !== null && filter !== 0 && filter !== '';
    });
  }, [filters]);
  
  // Helper function to get selected filter values with null defaults
  const getFilterValues = useCallback(() => {
    const getValue = (sectionObj) => {
      if (!sectionObj || typeof sectionObj !== 'object') return null;
      const selectedKeys = Object.keys(sectionObj).filter(k => sectionObj[k]);
      return selectedKeys.length > 0 ? selectedKeys[0] : null;
    };
    
    return {
      minDailyVolume: (() => {
        const volumes = {
          '10K': 10000, '100K': 100000, '500K': 500000, '1MN': 1000000,
          '2MN': 2000000, '5MN': 5000000, '10MN': 10000000, '25MN': 25000000,
          '50MN_PLUS': 50000000
        };
        const selected = getValue(filters.minDaily);
        return selected ? volumes[selected] : 0;
      })(),
      changePercent: {
        timeframe: getValue(filters.changePercent),
        percentage: filters.percentageValue !== undefined ? parseFloat(filters.percentageValue) : 0
      },
      alertCount: {
        timeframe: getValue(filters.alertCount),
        enabled: Boolean(getValue(filters.alertCount))
      },
      rsi: filters.rsiPeriod && filters.rsiLevel ? {
        timeframe: getValue(filters.rsiRange),
        period: parseInt(filters.rsiPeriod) || 0,
        level: parseInt(filters.rsiLevel) || 0,
        condition: filters.rsiCondition || 'NONE'
      } : null,
      ema: filters.emaFast && filters.emaSlow ? {
        timeframe: getValue(filters.ema),
        fastPeriod: parseInt(filters.emaFast) || 0,
        slowPeriod: parseInt(filters.emaSlow) || 0,
        condition: filters.emaCondition || 'NONE'
      } : null
    };
  }, [filters]);

  // Memoize the provider value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    filters,
    setFilters,
    applyFilters,
    getValidationFilters,
    hasActiveFilters,
    getFilterValues
  }), [filters, setFilters, applyFilters, getValidationFilters, hasActiveFilters, getFilterValues]);

  return (
    <FilterContext.Provider value={contextValue}>
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
