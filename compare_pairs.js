/**
 * Script to compare the 564 pairs from Binance API extraction 
 * vs the 418 pairs your localhost system has
 * This will show exactly which 146 pairs are missing
 */

const fs = require('fs');
const path = require('path');

async function comparePairs() {
  try {
    console.log('🔍 Comparing trading pairs...\n');
    
    // Read the Binance API extracted pairs (564)
    const extractedFile = path.join(__dirname, 'trading_pairs_2025-09-23.csv');
    if (!fs.existsSync(extractedFile)) {
      throw new Error('Extracted pairs CSV file not found');
    }
    
    const extractedContent = fs.readFileSync(extractedFile, 'utf8');
    const extractedLines = extractedContent.split('\n').slice(1); // Skip header
    const extractedPairs = extractedLines
      .map(line => line.split(',')[1]) // Get trading pair column
      .filter(pair => pair && pair.trim())
      .map(pair => pair.trim());
    
    // Read the API/localhost pairs (418)
    const apiFile = path.join(__dirname, 'api_pairs_list.txt');
    if (!fs.existsSync(apiFile)) {
      throw new Error('API pairs file not found. Run check_api_pairs.js first');
    }
    
    const apiContent = fs.readFileSync(apiFile, 'utf8');
    const apiPairs = apiContent
      .split('\n')
      .slice(1) // Skip header
      .filter(line => line.trim())
      .map(line => line.trim());
    
    console.log(`📊 Extracted from Binance API: ${extractedPairs.length} pairs`);
    console.log(`📊 Available in your system: ${apiPairs.length} pairs`);
    console.log(`📊 Difference: ${extractedPairs.length - apiPairs.length} pairs\n`);
    
    // Find pairs that are in extraction but not in your system (missing pairs)
    const missingPairs = extractedPairs.filter(pair => !apiPairs.includes(pair));
    
    // Find pairs that are in your system but not in extraction (extra pairs)
    const extraPairs = apiPairs.filter(pair => !extractedPairs.includes(pair));
    
    // Find common pairs
    const commonPairs = extractedPairs.filter(pair => apiPairs.includes(pair));
    
    console.log('🎯 COMPARISON RESULTS:');
    console.log(`✅ Common pairs: ${commonPairs.length}`);
    console.log(`❌ Missing from your system: ${missingPairs.length}`);
    console.log(`➕ Extra in your system: ${extraPairs.length}\n`);
    
    if (missingPairs.length > 0) {
      console.log('❌ MISSING PAIRS (in Binance API but not in your system):');
      missingPairs.slice(0, 50).forEach((pair, index) => {
        console.log(`   ${index + 1}. ${pair}`);
      });
      if (missingPairs.length > 50) {
        console.log(`   ... and ${missingPairs.length - 50} more pairs`);
      }
      console.log();
    }
    
    if (extraPairs.length > 0) {
      console.log('➕ EXTRA PAIRS (in your system but not in Binance extraction):');
      extraPairs.forEach((pair, index) => {
        console.log(`   ${index + 1}. ${pair}`);
      });
      console.log();
    }
    
    // Create a comprehensive report
    const reportFile = path.join(__dirname, 'pairs_comparison_report.txt');
    const report = `TRADING PAIRS COMPARISON REPORT
=====================================

Generated: ${new Date().toISOString()}

SUMMARY:
- Binance API Extraction: ${extractedPairs.length} pairs
- Your System (localhost): ${apiPairs.length} pairs
- Missing from your system: ${missingPairs.length} pairs
- Extra in your system: ${extraPairs.length} pairs
- Common pairs: ${commonPairs.length} pairs

MISSING PAIRS (in Binance but not in your system):
${missingPairs.join('\n')}

${extraPairs.length > 0 ? `EXTRA PAIRS (in your system but not in Binance):
${extraPairs.join('\n')}

` : ''}COMMON PAIRS (${commonPairs.length} total):
${commonPairs.join(', ')}

EXPLANATION:
The 146 missing pairs are likely newer pairs that were recently added to Binance
but haven't been updated in your local database yet. Your system shows 418 pairs
which are stored in your MongoDB database, while the Binance API currently has 564
active USDT trading pairs.

RECOMMENDATION:
Run your crypto data refresh/update process to sync the latest pairs from Binance API
into your database. This should bring your system from 418 to 564 pairs.
`;
    
    fs.writeFileSync(reportFile, report, 'utf8');
    console.log(`📁 Detailed comparison report saved to: pairs_comparison_report.txt`);
    
    // Create Excel-compatible CSV with missing pairs
    const missingPairsCSV = `Row,Missing Trading Pair,Base Asset,Quote Asset\n` +
      missingPairs.map((pair, index) => {
        const baseAsset = pair.replace('USDT', '');
        return `${index + 1},${pair},${baseAsset},USDT`;
      }).join('\n');
    
    const missingPairsFile = path.join(__dirname, 'missing_pairs.csv');
    fs.writeFileSync(missingPairsFile, missingPairsCSV, 'utf8');
    console.log(`📁 Missing pairs CSV saved to: missing_pairs.csv\n`);
    
    return {
      extracted: extractedPairs.length,
      system: apiPairs.length,
      missing: missingPairs.length,
      extra: extraPairs.length,
      common: commonPairs.length,
      missingPairs: missingPairs
    };
    
  } catch (error) {
    console.error('❌ Error comparing pairs:', error.message);
    throw error;
  }
}

// Run the comparison
if (require.main === module) {
  comparePairs()
    .then((result) => {
      console.log('✅ Comparison completed successfully');
      console.log(`📊 Your system has ${result.system} pairs vs ${result.extracted} available on Binance`);
      console.log(`📊 You are missing ${result.missing} newer pairs`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Comparison failed:', error.message);
      process.exit(1);
    });
}

module.exports = { comparePairs };
