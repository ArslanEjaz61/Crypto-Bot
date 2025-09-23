/**
 * Script to extract all trading pairs from the system and export to Excel
 * This script will fetch all USDT trading pairs from Binance API (like the system does)
 * and create an Excel file with the pair names
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import the filtering function from the system
const { filterUSDTPairs } = require('./server/utils/pairFilter');

/**
 * Make API request with retry logic
 */
async function makeApiRequestWithRetry(url, maxRetries = 3, timeout = 30000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 API Request attempt ${attempt}/${maxRetries}: ${url}`);
      const response = await axios.get(url, {
        timeout: timeout,
        headers: {
          'User-Agent': 'Trading-Pairs-Extractor/1.0'
        }
      });
      console.log(`✅ API Request successful (${response.data.length} items)`);
      return response;
    } catch (error) {
      console.error(`❌ API Request attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, etc.
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Fetch all trading pairs from Binance API (same as the system does)
 */
async function fetchAllTradingPairs() {
  try {
    console.log('🚀 Fetching trading pairs from Binance API...');
    
    // Fetch ticker data (all symbols with prices) - with retry
    const tickerResponse = await makeApiRequestWithRetry('https://api.binance.com/api/v3/ticker/price');
    
    // Fetch exchange info (symbol details) - with retry
    const exchangeInfoResponse = await makeApiRequestWithRetry('https://api.binance.com/api/v3/exchangeInfo');
    
    console.log(`📊 Retrieved ${tickerResponse.data.length} total symbols from Binance`);
    console.log(`📊 Retrieved exchange info for ${exchangeInfoResponse.data.symbols.length} symbols`);
    
    // Use the same filtering logic as the system
    const filterResult = filterUSDTPairs(
      tickerResponse.data,
      exchangeInfoResponse.data.symbols,
      true // Enable debug logging
    );
    
    const filteredPairs = filterResult.filteredPairs;
    
    console.log(`✅ Filtered to ${filteredPairs.length} active USDT spot trading pairs`);
    console.log('📋 Filter stats:', filterResult.stats);
    
    // Extract just the symbol names and sort them
    const pairNames = filteredPairs
      .map(pair => pair.symbol)
      .sort();
    
    return {
      pairs: pairNames,
      stats: filterResult.stats,
      totalCount: pairNames.length
    };
    
  } catch (error) {
    console.error('❌ Error fetching trading pairs:', error.message);
    throw error;
  }
}

/**
 * Create CSV file with trading pairs (Excel compatible)
 */
async function createExcelFile(pairData) {
  try {
    console.log('📊 Creating CSV file (Excel compatible)...');
    
    // Create CSV content for trading pairs
    const csvHeader = 'Row,Trading Pair,Base Asset,Quote Asset\n';
    const csvData = pairData.pairs.map((pair, index) => {
      const baseAsset = pair.replace('USDT', '');
      return `${index + 1},${pair},${baseAsset},USDT`;
    }).join('\n');
    
    const csvContent = csvHeader + csvData;
    
    // Create CSV file
    const fileName = `trading_pairs_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = path.join(__dirname, fileName);
    
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    // Also create a summary file
    const summaryFileName = `trading_pairs_summary_${new Date().toISOString().split('T')[0]}.txt`;
    const summaryFilePath = path.join(__dirname, summaryFileName);
    
    const summaryContent = `TRADING PAIRS EXTRACTION SUMMARY
===============================

Generated: ${new Date().toISOString()}
Total Trading Pairs: ${pairData.totalCount}

STATISTICS:
- Total Tickers Processed: ${pairData.stats.totalTickers}
- USDT Pairs Found: ${pairData.stats.usdtPairs}
- Pairs Included: ${pairData.stats.included}
- Excluded (Not USDT): ${pairData.stats.excluded.notUSDT}
- Excluded (Spot Disabled): ${pairData.stats.excluded.spotTradingDisabled}
- Excluded (Invalid Status): ${pairData.stats.excluded.invalidStatus}
- Excluded (Premium/Leveraged): ${pairData.stats.excluded.premiumLeveraged}

ALL TRADING PAIRS:
${pairData.pairs.join(', ')}

INSTRUCTIONS:
1. Open the ${fileName} file in Excel
2. The data will be automatically formatted in columns
3. You can filter, sort, and manipulate the data as needed
4. All ${pairData.totalCount} trading pairs are listed
`;
    
    fs.writeFileSync(summaryFilePath, summaryContent, 'utf8');
    
    console.log(`✅ CSV file created successfully: ${fileName}`);
    console.log(`✅ Summary file created: ${summaryFileName}`);
    console.log(`📍 Files location: ${path.dirname(filePath)}`);
    console.log(`📊 Total pairs exported: ${pairData.totalCount}`);
    
    return { csvPath: filePath, summaryPath: summaryFilePath };
    
  } catch (error) {
    console.error('❌ Error creating files:', error.message);
    throw error;
  }
}

/**
 * Main function to extract and export trading pairs
 */
async function main() {
  try {
    console.log('🚀 Starting trading pairs extraction...\n');
    
    // Fetch all trading pairs
    const pairData = await fetchAllTradingPairs();
    
    console.log('\n📋 Sample of trading pairs found:');
    console.log(pairData.pairs.slice(0, 20).join(', '));
    console.log('...\n');
    
    // Create CSV file
    const files = await createExcelFile(pairData);
    
    console.log('\n🎉 Extraction completed successfully!');
    console.log(`📊 Total pairs: ${pairData.totalCount}`);
    console.log(`📁 CSV file: ${path.basename(files.csvPath)}`);
    console.log(`📁 Summary file: ${path.basename(files.summaryPath)}`);
    
    return files;
    
  } catch (error) {
    console.error('\n❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  fetchAllTradingPairs,
  createExcelFile,
  main
};
