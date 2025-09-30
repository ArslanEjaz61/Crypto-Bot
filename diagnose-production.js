#!/usr/bin/env node

/**
 * Production Diagnostic Script
 * This script helps diagnose production deployment issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing production deployment...\n');

// Check environment
console.log('📋 Environment Information:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`PORT: ${process.env.PORT || 'not set'}`);
console.log(`Current directory: ${process.cwd()}`);

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.log('❌ Error: package.json not found. Please run from project root.');
    process.exit(1);
}

// Check server files
console.log('\n📁 Server Files:');
const serverFiles = [
    'server/index.js',
    'server/config/db.js',
    'server/controllers/cryptoController.js'
];

serverFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - exists`);
    } else {
        console.log(`❌ ${file} - missing`);
    }
});

// Check client build
console.log('\n📁 Client Build:');
const buildPath = path.join('client', 'build');
if (fs.existsSync(buildPath)) {
    console.log('✅ client/build directory exists');
    
    const buildFiles = fs.readdirSync(buildPath);
    console.log('📄 Build files:');
    buildFiles.forEach(file => {
        console.log(`   - ${file}`);
    });
    
    // Check for index.html
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log('✅ index.html found');
    } else {
        console.log('❌ index.html missing');
    }
} else {
    console.log('❌ client/build directory not found');
    console.log('💡 Solution: Run "cd client && npm run build"');
}

// Check environment file
console.log('\n📄 Environment Configuration:');
if (fs.existsSync('.env')) {
    console.log('✅ .env file exists');
    const envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log('📋 Environment variables:');
    lines.forEach(line => {
        const [key] = line.split('=');
        console.log(`   - ${key}`);
    });
} else {
    console.log('❌ .env file not found');
    console.log('💡 Solution: Create .env file with required variables');
}

// Check package.json scripts
console.log('\n📦 Package Configuration:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`Project name: ${packageJson.name}`);
    console.log(`Main file: ${packageJson.main}`);
    
    if (packageJson.scripts) {
        console.log('Available scripts:');
        Object.keys(packageJson.scripts).forEach(script => {
            console.log(`   - npm run ${script}`);
        });
    }
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

console.log('\n🎯 Recommendations:');
console.log('1. Make sure React app is built: cd client && npm run build');
console.log('2. Check that NODE_ENV=production is set');
console.log('3. Verify all environment variables are configured');
console.log('4. Restart PM2: pm2 restart crypto-bot');
console.log('5. Check logs: pm2 logs crypto-bot');

console.log('\n✅ Diagnostic complete!');
