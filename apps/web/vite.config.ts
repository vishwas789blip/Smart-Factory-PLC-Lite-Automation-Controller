import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000'
const simTarget = process.env.VITE_SIM_PROXY_TARGET || 'http://localhost:5000'
const wsTarget = process.env.VITE_WS_PROXY_TARGET || 'ws://localhost:4000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true
      },
      '/sim': {
        target: simTarget,
        changeOrigin: true
      },
      '/ws': {
        target: wsTarget,
        ws: true,
        changeOrigin: true
      }
    }
  }
})
