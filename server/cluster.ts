import cluster from 'cluster';
import os from 'os';

const PORT = process.env.PORT || 8000;
const WORKERS = parseInt(process.env.WORKERS || '') || Math.min(4, os.cpus().length);

async function startServer() {
  const { registerRoutes } = await import('./routes');
  const express = await import('express');
  
  const app = express.default();
  const httpServer = await registerRoutes(app);
  
  httpServer.listen(PORT, () => {
    const workerId = cluster.worker?.id || 'master';
    console.log(`🌐 Сервер ${workerId} слушает порт ${PORT} (PID: ${process.pid})`);
  });
  
  return httpServer;
}

(async () => {
  if (cluster.isPrimary) {
    console.log(`🚀 Запускаем кластер с ${WORKERS} воркерами`);
    
    // Запускаем воркеров
    for (let i = 0; i < WORKERS; i++) {
      const worker = cluster.fork({ WORKER_ID: i + 1 });
      console.log(`👷 Воркер ${i + 1} запущен (PID: ${worker.process.pid})`);
    }
    
    cluster.on('exit', (worker, code, signal) => {
      console.log(`💀 Воркер PID ${worker.process.pid} завершен (${signal || code}). Перезапуск...`);
      const newWorker = cluster.fork();
      console.log(`👷 Новый воркер запущен (PID: ${newWorker.process.pid})`);
    });
    
    // Мастер процесс тоже запускает сервер (для простоты)
    await startServer();
    
  } else {
    // Воркер процесс
    const workerId = process.env.WORKER_ID || cluster.worker?.id;
    console.log(`👷 Воркер ${workerId} (PID: ${process.pid}) запущен`);
    
    await startServer();
    
    process.on('SIGTERM', () => {
      console.log(`👷 Воркер ${workerId} получил SIGTERM, завершение...`);
      process.exit(0);
    });
  }
})().catch(console.error);