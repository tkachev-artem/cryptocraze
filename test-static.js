// Простой тест для проверки статических файлов
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

console.log('Testing static files setup...');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('distPath:', distPath);
console.log('indexPath:', indexPath);
console.log('Index file exists:', fs.existsSync(indexPath));
console.log('Files in current dir:', fs.readdirSync('.').slice(0, 10));

// Try to setup static files
try {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    console.log('Serving for:', req.path);
    res.sendFile(indexPath);
  });
  console.log('Static files middleware setup successfully');
} catch (error) {
  console.error('Error setting up static files:', error);
}