const https = require('https');
const { spawn } = require('child_process');

async function checkTelegramAccess() {
  console.log('🔍 Diagnosing Telegram API connectivity...\n');
  
  // 1. Check if Telegram is accessible via browser/curl
  console.log('1️⃣ Testing basic HTTPS connectivity to api.telegram.org...');
  
  const testConnectivity = () => {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: '/',
        method: 'GET',
        timeout: 10000
      }, (res) => {
        console.log('✅ HTTPS connection successful! Status:', res.statusCode);
        resolve(true);
      });
      
      req.on('error', (err) => {
        console.log('❌ HTTPS connection failed:', err.code, err.message);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.log('❌ HTTPS connection timeout');
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  };
  
  const httpsWorks = await testConnectivity();
  
  // 2. Check DNS resolution
  console.log('\n2️⃣ Testing DNS resolution...');
  const dns = require('dns');
  
  const checkDNS = () => {
    return new Promise((resolve) => {
      dns.resolve4('api.telegram.org', (err, addresses) => {
        if (err) {
          console.log('❌ DNS resolution failed:', err.message);
          resolve(false);
        } else {
          console.log('✅ DNS resolved to:', addresses);
          resolve(true);
        }
      });
    });
  };
  
  const dnsWorks = await checkDNS();
  
  // 3. Check if it's a Node.js specific issue
  console.log('\n3️⃣ Testing with different User-Agent...');
  
  const testWithUserAgent = () => {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: '/bot7689697171:AAHtPknH6HQZMVYAnG9-jl2MWK1ytt31TRU/getMe',
        method: 'GET',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.ok) {
              console.log('✅ Bot token is VALID! Bot info:', response.result.username);
              resolve(true);
            } else {
              console.log('❌ Bot token error:', response.description);
              resolve(false);
            }
          } catch (err) {
            console.log('❌ JSON parse error:', data.substring(0, 200));
            resolve(false);
          }
        });
      });
      
      req.on('error', (err) => {
        console.log('❌ Request failed:', err.code, err.message);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.log('❌ Request timeout');
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  };
  
  const tokenWorks = await testWithUserAgent();
  
  // 4. Summary and recommendations
  console.log('\n📊 DIAGNOSIS SUMMARY:');
  console.log(`HTTPS Connection: ${httpsWorks ? '✅ Working' : '❌ Failed'}`);
  console.log(`DNS Resolution: ${dnsWorks ? '✅ Working' : '❌ Failed'}`);
  console.log(`Bot Token: ${tokenWorks ? '✅ Valid' : '❌ Invalid/Blocked'}`);
  
  console.log('\n🔧 RECOMMENDED SOLUTIONS:');
  
  if (!httpsWorks || !dnsWorks) {
    console.log('❗ Network connectivity issue detected:');
    console.log('   • Check if your ISP blocks Telegram');
    console.log('   • Try using a VPN');
    console.log('   • Check Windows Defender/Antivirus settings');
    console.log('   • Check corporate firewall settings');
  }
  
  if (httpsWorks && dnsWorks && !tokenWorks) {
    console.log('❗ Telegram API access issue:');
    console.log('   • Your IP might be rate-limited by Telegram');
    console.log('   • The bot token might be invalid');
    console.log('   • Try from a different network/IP');
  }
  
  if (httpsWorks && dnsWorks && tokenWorks) {
    console.log('✅ All tests passed! The issue might be:');
    console.log('   • Node.js specific networking issue');
    console.log('   • Try restarting Node.js');
    console.log('   • Try different Node.js version');
  }
  
  console.log('\n💡 IMMEDIATE WORKAROUNDS:');
  console.log('   1. Use a VPN service');
  console.log('   2. Try from mobile hotspot');
  console.log('   3. Use webhook instead of polling');
  console.log('   4. Implement email fallback');
}

checkTelegramAccess().catch(console.error);
