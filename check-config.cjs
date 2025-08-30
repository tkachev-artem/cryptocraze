#!/usr/bin/env node

/**
 * Check current configuration and environment setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Checking CryptoCraze Configuration\n');

// Check environment files
const envFiles = ['.env.development', '.env.production', '.env'];
console.log('📋 Environment Files:');
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check .env.development content
console.log('\n🔧 .env.development Configuration:');
if (fs.existsSync('.env.development')) {
  const envContent = fs.readFileSync('.env.development', 'utf-8');
  const viteVars = envContent.split('\n').filter(line => line.startsWith('VITE_'));
  viteVars.forEach(line => {
    if (line.trim()) {
      console.log(`  ${line.trim()}`);
    }
  });
}

// Check package.json scripts
console.log('\n📦 Package.json Scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const devScripts = ['dev', 'dev:server', 'start:dev'];
devScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`❌ ${script}: missing`);
  }
});

// Check key configuration files
console.log('\n🗂️ Configuration Files:');
const configFiles = [
  'vite.config.ts',
  'src/lib/config.ts',
  'src/lib/api.ts',
  'src/pages/Admin/Analytics.tsx'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n✅ Configuration check completed!');
console.log('\n📋 Next Steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Start the API server: npm run dev:server');
console.log('3. Or use combined: npm run start:dev');
console.log('4. Open http://localhost:5173 in your browser');
console.log('5. Check browser dev tools for any remaining proxy errors');