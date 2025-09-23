/**
 * Centralized USDT pair filtering utility
 * This ensures consistent filtering logic across all controllers
 */

/**
 * Filter Binance trading pairs to get all valid USDT spot pairs
 * @param {Array} tickerData - Array of ticker data from Binance API
 * @param {Array} exchangeSymbols - Array of symbol info from exchangeInfo API
 * @param {boolean} enableDebug - Whether to enable debug logging
 * @returns {Object} - { filteredPairs, stats, debugInfo }
 */
function filterUSDTPairs(tickerData, exchangeSymbols = [], enableDebug = false) {
  console.log('🔍 Starting USDT pair filtering...');
  
  // Create exchange info map for quick lookups
  const exchangeInfoMap = {};
  exchangeSymbols.forEach((symbolInfo) => {
    if (symbolInfo && symbolInfo.symbol) {
      exchangeInfoMap[symbolInfo.symbol] = {
        isSpotTradingAllowed: symbolInfo.isSpotTradingAllowed,
        quoteAsset: symbolInfo.quoteAsset,
        baseAsset: symbolInfo.baseAsset,
        permissions: symbolInfo.permissions || [],
        status: symbolInfo.status,
        ocoAllowed: symbolInfo.ocoAllowed,
        icebergAllowed: symbolInfo.icebergAllowed
      };
    }
  });

  const stats = {
    totalTickers: tickerData.length,
    totalExchangeSymbols: exchangeSymbols.length,
    usdtPairs: 0,
    excluded: {
      notUSDT: 0,
      spotTradingDisabled: 0,
      invalidStatus: 0,
      premiumLeveraged: 0,
      delisted: 0
    },
    included: 0
  };

  const debugInfo = {
    excludedPairs: [],
    includedSample: []
  };

  if (enableDebug) {
    console.log(`📊 Input data: ${stats.totalTickers} tickers, ${stats.totalExchangeSymbols} exchange symbols`);
  }

  // Step 1: Filter for USDT pairs only
  const usdtTickers = tickerData.filter(ticker => {
    if (!ticker || !ticker.symbol) return false;
    const isUSDT = ticker.symbol.endsWith('USDT');
    if (!isUSDT) {
      stats.excluded.notUSDT++;
    }
    return isUSDT;
  });
  
  stats.usdtPairs = usdtTickers.length;
  if (enableDebug) {
    console.log(`📊 Step 1 - USDT pairs: ${stats.usdtPairs} (excluded ${stats.excluded.notUSDT} non-USDT)`);
  }

  // Step 2: Apply filtering rules
  const filteredPairs = usdtTickers.filter(ticker => {
    const symbol = ticker.symbol;
    const exchangeInfo = exchangeInfoMap[symbol];
    
    // Rule 1: Check quoteAsset if available (should be USDT)
    if (exchangeInfo && exchangeInfo.quoteAsset && exchangeInfo.quoteAsset !== 'USDT') {
      stats.excluded.notUSDT++;
      if (enableDebug) {
        debugInfo.excludedPairs.push({
          symbol,
          reason: `quoteAsset is ${exchangeInfo.quoteAsset}, not USDT`
        });
      }
      return false;
    }

    // Rule 2: Exclude if explicitly marked as spot trading not allowed
    if (exchangeInfo && exchangeInfo.isSpotTradingAllowed === false) {
      stats.excluded.spotTradingDisabled++;
      if (enableDebug) {
        debugInfo.excludedPairs.push({
          symbol,
          reason: 'isSpotTradingAllowed is false'
        });
      }
      return false;
    }

    // Rule 3: Check status - include TRADING and BREAK, exclude others
    if (exchangeInfo && exchangeInfo.status) {
      const validStatuses = ['TRADING', 'BREAK'];
      if (!validStatuses.includes(exchangeInfo.status)) {
        stats.excluded.invalidStatus++;
        if (enableDebug) {
          debugInfo.excludedPairs.push({
            symbol,
            reason: `status is ${exchangeInfo.status} (not TRADING or BREAK)`
          });
        }
        return false;
      }
    }

    // Rule 4: Exclude premium/leveraged tokens by symbol pattern
    const premiumPattern = /.*(?:UP|DOWN|BULL|BEAR)USDT$/;
    if (premiumPattern.test(symbol)) {
      stats.excluded.premiumLeveraged++;
      if (enableDebug) {
        debugInfo.excludedPairs.push({
          symbol,
          reason: 'matches premium/leveraged token pattern'
        });
      }
      return false;
    }

    // Rule 5: Exclude explicitly delisted or halted pairs
    if (exchangeInfo && (
      exchangeInfo.status === 'HALT_TRADING' ||
      exchangeInfo.status === 'PENDING_TRADING'
    )) {
      stats.excluded.delisted++;
      if (enableDebug) {
        debugInfo.excludedPairs.push({
          symbol,
          reason: `status is ${exchangeInfo.status} (delisted/halted)`
        });
      }
      return false;
    }

    // If we get here, include the pair
    stats.included++;
    if (enableDebug && debugInfo.includedSample.length < 10) {
      debugInfo.includedSample.push({
        symbol,
        status: exchangeInfo?.status || 'unknown',
        isSpotTradingAllowed: exchangeInfo?.isSpotTradingAllowed ?? 'unknown',
        permissions: exchangeInfo?.permissions || []
      });
    }

    return true;
  });

  // Log summary
  console.log(`\n📊 === FILTERING SUMMARY ===`);
  console.log(`   Total tickers processed: ${stats.totalTickers}`);
  console.log(`   USDT pairs found: ${stats.usdtPairs}`);
  console.log(`   Final included pairs: ${stats.included}`);
  console.log(`   Total excluded: ${Object.values(stats.excluded).reduce((a, b) => a + b, 0)}`);
  console.log(`   Breakdown:`);
  console.log(`     - Not USDT: ${stats.excluded.notUSDT}`);
  console.log(`     - Spot trading disabled: ${stats.excluded.spotTradingDisabled}`);
  console.log(`     - Invalid status: ${stats.excluded.invalidStatus}`);
  console.log(`     - Premium/leveraged: ${stats.excluded.premiumLeveraged}`);
  console.log(`     - Delisted/halted: ${stats.excluded.delisted}`);
  
  if (enableDebug) {
    console.log(`\n🔍 === DEBUG INFO ===`);
    
    if (debugInfo.excludedPairs.length > 0) {
      console.log(`❌ First 20 excluded pairs:`);
      debugInfo.excludedPairs.slice(0, 20).forEach(pair => {
        console.log(`   ${pair.symbol}: ${pair.reason}`);
      });
      
      if (debugInfo.excludedPairs.length > 20) {
        console.log(`   ... and ${debugInfo.excludedPairs.length - 20} more`);
      }
    }
    
    if (debugInfo.includedSample.length > 0) {
      console.log(`✅ Sample included pairs:`);
      debugInfo.includedSample.forEach(pair => {
        console.log(`   ${pair.symbol}: status=${pair.status}, spotAllowed=${pair.isSpotTradingAllowed}, permissions=[${pair.permissions.join(', ') || 'none'}]`);
      });
    }
  }

  // Check if we're close to expected count
  const expectedCount = 574;
  const difference = Math.abs(stats.included - expectedCount);
  if (difference <= 20) {
    console.log(`✅ GOOD: Got ${stats.included} pairs (expected ~${expectedCount}, difference: ${difference})`);
  } else {
    console.log(`⚠️ WARNING: Got ${stats.included} pairs (expected ~${expectedCount}, difference: ${difference})`);
  }

  return {
    filteredPairs,
    stats,
    debugInfo
  };
}

module.exports = {
  filterUSDTPairs
};
