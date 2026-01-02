import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Nimiq Retro Games Onchain',
        short_name: 'NimiqGames',
        description: 'Play retro games stored on the Nimiq blockchain',
        theme_color: '#1f2937',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'landscape',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rpc.*\.nimiqscan\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rpc-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      }
    })
  ],
  base: process.env.GITHUB_PAGES ? '/nimiq-doom/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  // Enable public directory for PWA assets
  publicDir: 'public',
})
