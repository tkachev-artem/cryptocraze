const { Client } = require('pg');

const hosts = [
  'crypto-db-1755991879.postgresql.yandexcloud.net',
  'rc1a-gxvs7rj7oqz9n7vp.mdb.yandexcloud.net',
  'rc1b-gxvs7rj7oqz9n7vp.mdb.yandexcloud.net',
  'rc1c-gxvs7rj7oqz9n7vp.mdb.yandexcloud.net',
  'c-crypto-db-1755991879.rw.mdb.yandexcloud.net',
  'crypto-db-1755991879.mdb.yandexcloud.net'
];

async function testConnection(host) {
  console.log(`🔍 Тестируем подключение к: ${host}`);
  
  const client = new Client({
    host: host,
    port: 6432,
    database: 'crypto_database',
    user: 'crypto_user',
    password: 'zAlBIauWxJ7JM3huObuew7LYG',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log(`✅ УСПЕШНО: ${host}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
    await client.end();
    return host;
  } catch (error) {
    console.log(`❌ Ошибка: ${host} - ${error.message}`);
    await client.end().catch(() => {});
    return null;
  }
}

async function findWorkingHost() {
  console.log('🚀 Поиск рабочего хоста PostgreSQL...\n');
  
  for (const host of hosts) {
    const working = await testConnection(host);
    if (working) {
      console.log(`\n🎉 Найден рабочий хост: ${working}`);
      console.log(`📝 Используй этот DATABASE_URL:`);
      console.log(`DATABASE_URL=postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@${working}:6432/crypto_database?sslmode=require`);
      return working;
    }
  }
  
  console.log('\n❌ Ни один хост не работает. Проверь:');
  console.log('1. Правильность данных (имя кластера, пользователь, пароль)');
  console.log('2. Настройки сети и файрвола в Yandex Cloud');
  console.log('3. Статус кластера в консоли управления');
}

findWorkingHost().catch(console.error);