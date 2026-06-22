import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
  server: {
    host: '127.0.0.1',   // явный IP вместо localhost — обход VPN
    port: 5173,
    strictPort: true,     // не прыгать на другой порт, если 5173 занят
  }
})
