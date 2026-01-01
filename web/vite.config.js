import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  base: process.env.GITHUB_PAGES ? '/nimiq-doom/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy RPC requests to local Nimiq node to avoid CORS
      '/rpc': {
        target: 'http://192.168.50.99:8648',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ''),
      },
    },
  },
  // No public directory needed - all data comes from blockchain
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
