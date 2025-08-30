import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from mode-specific files
  const env = loadEnv(mode, process.cwd(), "")
  
  // Load additional environment variables for backend compatibility
  const nodeEnv = env.NODE_ENV || mode
  
  console.log(`🔧 Vite configuring for mode: ${mode} (NODE_ENV: ${nodeEnv})`);
  
  // Dev proxy target: prefer VITE_API_BASE_URL for consistency
  const rawProxy = env.VITE_API_BASE_URL || env.VITE_API_PROXY_TARGET || env.VITE_API_SERVER || ""
  const proxyTarget = /^https?:\/\//i.test(rawProxy) ? rawProxy : "http://localhost:3001"
  
  console.log(`🔌 API Proxy target: ${proxyTarget}`);

  // HTTPS для доверенного происхождения (IMA SDK требует https/localhost)
  const certDir = path.resolve(process.cwd(), ".cert")
  const certFile = path.join(certDir, "localhost.pem")
  const keyFile = path.join(certDir, "localhost-key.pem")
  
  // Отладочная информация
  console.log("🔐 HTTPS Config:", {
    certDir,
    certExists: fs.existsSync(certFile),
    keyExists: fs.existsSync(keyFile),
    certFile,
    keyFile
  })
  
  // const httpsConfig = fs.existsSync(certFile) && fs.existsSync(keyFile)
  //   ? {
  //       cert: fs.readFileSync(certFile, 'utf8'),
  //       key: fs.readFileSync(keyFile, 'utf8'),
  //     }
  //   : undefined

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['lightweight-charts'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-socket': ['socket.io-client'],
            'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
            // Locales
            'locales': [
              './src/locales/ru.json',
              './src/locales/en.json', 
              './src/locales/es.json',
              './src/locales/fr.json',
              './src/locales/pt.json'
            ],
            // Trading features
            'trading': [
              './src/pages/Trade/Trade',
              './src/pages/Trade/Pro',
              './src/components/Chart.tsx',
              './src/components/ProChart.tsx'
            ]
          }
        }
      },
      // Enable compression
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        }
      },
      // Asset optimization
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096,
    },
    server: {
      host: "0.0.0.0",
      // https: httpsConfig, // временно отключено
      port: 5173,
      allowedHosts: ['localhost', '.trycloudflare.com'],
      hmr: {
        port: 24678
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
