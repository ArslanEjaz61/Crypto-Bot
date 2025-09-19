#!/usr/bin/env node

/**
 * SIMPLE ALERT DEBUGGING SCRIPT
 * 
 * This script will help you debug the alert system by:
 * 1. Running the debug script
 * 2. Creating a test alert
 * 3. Testing the alert processing
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Alert System Debugging...\n');

// Run the main debug script
const debugScript = spawn('node', [path.join(__dirname, 'debug-alert-system.js')], {
  stdio: 'inherit',
  shell: true
});

debugScript.on('close', (code) => {
  console.log(`\n🔍 Debug script finished with code ${code}`);
  
  if (code === 0) {
    console.log('\n✅ Debugging completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check the console output above for any issues');
    console.log('2. If no favorite pairs are found, add some in the frontend');
    console.log('3. If no alerts are found, create some using the frontend');
    console.log('4. Check the server logs for detailed alert processing information');
    console.log('5. Monitor the console for real-time alert processing logs');
  } else {
    console.log('\n❌ Debug script encountered errors. Check the output above.');
  }
});

debugScript.on('error', (error) => {
  console.error('❌ Error running debug script:', error);
});
