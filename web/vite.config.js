import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  base: process.env.GITHUB_PAGES ? '/nimiq-doom/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  // No public directory needed - all data comes from blockchain
  publicDir: false,
})
