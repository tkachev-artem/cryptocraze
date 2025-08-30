// Production server startup script
// This script temporarily disables ES modules for server execution

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read original package.json
const packagePath = path.join(__dirname, 'package.json');
const originalPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Create backup
const backupPackage = { ...originalPackage };

// Temporarily remove "type": "module" for server execution
delete originalPackage.type;
fs.writeFileSync(packagePath, JSON.stringify(originalPackage, null, 2));

console.log('🚀 Starting CryptoCraze server...');

// Start the server
const server = spawn('node', ['server-dist/server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`\n📊 Server exited with code ${code}`);
  
  // Restore original package.json
  fs.writeFileSync(packagePath, JSON.stringify(backupPackage, null, 2));
  console.log('✅ Package.json restored');
  
  process.exit(code);
});

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating server...');
  server.kill('SIGTERM');
});