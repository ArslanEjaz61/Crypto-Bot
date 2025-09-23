/**
 * Script to check how many pairs the API endpoint is returning
 * This should match what localhost shows (418 pairs)
 */

const axios = require('axios');

async function checkApiPairs() {
  try {
    console.log('🔍 Checking API endpoint /api/crypto...');
    
    const API_URL = 'http://localhost:5000';
    
    // Make the same request the frontend makes
    const response = await axios.get(`${API_URL}/api/crypto`, {
      params: { 
        limit: 1000,  // Large limit to get all pairs
        spotOnly: true, 
        usdtOnly: true 
      },
      timeout: 10000
    });
    
    const data = response.data;
    const cryptos = data.cryptos || [];
    
    console.log(`✅ API Response received`);
    console.log(`📊 Total pairs returned: ${cryptos.length}`);
    console.log(`📊 Data source: ${data.dataSource || 'unknown'}`);
    console.log(`📊 Total count in response: ${data.totalCount || 'not specified'}`);
    console.log(`📊 Timestamp: ${data.timestamp || 'not specified'}`);
    
    // Show first few pairs
    console.log('\n📋 First 10 pairs from API:');
    cryptos.slice(0, 10).forEach((crypto, index) => {
      console.log(`   ${index + 1}. ${crypto.symbol} (${crypto.price}) - Vol: ${crypto.volume24h?.toLocaleString()}`);
    });
    
    // Check for any patterns in the data
    const usdtPairs = cryptos.filter(c => c.symbol.endsWith('USDT'));
    const tradingPairs = cryptos.filter(c => c.status === 'TRADING');
    const spotAllowed = cryptos.filter(c => c.isSpotTradingAllowed === true);
    
    console.log('\n🔍 Data Analysis:');
    console.log(`   Total pairs: ${cryptos.length}`);
    console.log(`   USDT pairs: ${usdtPairs.length}`);
    console.log(`   TRADING status: ${tradingPairs.length}`);
    console.log(`   Spot trading allowed: ${spotAllowed.length}`);
    
    // Compare with our extraction
    console.log('\n🎯 Comparison:');
    console.log(`   API endpoint returns: ${cryptos.length} pairs`);
    console.log(`   Our Binance extraction: 564 pairs`);
    console.log(`   Localhost shows: 418 pairs`);
    console.log(`   Difference (Extraction - API): ${564 - cryptos.length}`);
    console.log(`   Difference (Extraction - Localhost): ${564 - 418}`);
    
    if (cryptos.length === 418) {
      console.log('\n✅ MATCH FOUND: API endpoint returns exactly 418 pairs (same as localhost)');
    } else {
      console.log(`\n❓ MISMATCH: API returns ${cryptos.length} but localhost shows 418`);
    }
    
    // Export the API pairs to a file for comparison
    const apiPairsList = cryptos.map(c => c.symbol).sort();
    const fs = require('fs');
    const path = require('path');
    
    const apiPairsFile = path.join(__dirname, 'api_pairs_list.txt');
    const content = `API Pairs (${apiPairsList.length} total):\n${apiPairsList.join('\n')}`;
    fs.writeFileSync(apiPairsFile, content, 'utf8');
    
    console.log(`\n📁 API pairs list saved to: api_pairs_list.txt`);
    
    return {
      apiCount: cryptos.length,
      pairs: apiPairsList
    };
    
  } catch (error) {
    console.error('❌ Error checking API:', error.message);
    throw error;
  }
}

// Run the check
if (require.main === module) {
  checkApiPairs()
    .then((result) => {
      console.log('\n✅ API check completed');
      console.log(`📊 Final result: API returns ${result.apiCount} pairs`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkApiPairs };
