module.exports = {
  apps: [
    {
      name: 'cryptocraze-backend',
      script: 'dist/server/index.cjs',
      cwd: '/home/tkachevartem/cryptocraze',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Логирование
      log_file: '/home/tkachevartem/cryptocraze/logs/combined.log',
      out_file: '/home/tkachevartem/cryptocraze/logs/out.log',
      error_file: '/home/tkachevartem/cryptocraze/logs/error.log',
      
      // Автоперезапуск
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      
      // Ресурсы
      max_memory_restart: '500M',
      
      // Перезапуск при падении
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful reload
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
    }
  ]
};