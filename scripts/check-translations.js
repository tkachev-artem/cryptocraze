#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/locales');
const files = ['en.json', 'ru.json', 'es.json', 'fr.json', 'pt.json'];

// Функция для получения всех ключей из объекта
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

// Читаем эталонный английский файл
const enPath = path.join(localesDir, 'en.json');
const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = getAllKeys(enContent);

console.log(`🔍 Эталонный файл (en.json): ${enKeys.length} ключей`);

// Проверяем каждый файл перевода
let hasErrors = false;
for (const file of files) {
  if (file === 'en.json') continue; // Пропускаем эталонный файл
  
  const filePath = path.join(localesDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Файл ${file} не найден`);
    hasErrors = true;
    continue;
  }
  
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const keys = getAllKeys(content);
  
  console.log(`\n📋 Проверяем ${file}: ${keys.length} ключей`);
  
  // Проверяем недостающие ключи
  const missingKeys = enKeys.filter(key => !keys.includes(key));
  if (missingKeys.length > 0) {
    console.log(`❌ Недостают ключи в ${file}:`);
    missingKeys.forEach(key => console.log(`   - ${key}`));
    hasErrors = true;
  }
  
  // Проверяем лишние ключи  
  const extraKeys = keys.filter(key => !enKeys.includes(key));
  if (extraKeys.length > 0) {
    console.log(`⚠️  Лишние ключи в ${file}:`);
    extraKeys.forEach(key => console.log(`   + ${key}`));
  }
  
  if (missingKeys.length === 0 && extraKeys.length === 0) {
    console.log(`✅ ${file} - все ключи совпадают`);
  }
}

if (hasErrors) {
  console.log('\n❌ Найдены ошибки в переводах!');
  process.exit(1);
} else {
  console.log('\n✅ Все файлы переводов корректны');
}