import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (6.3, ADR 035): Workbox precache of the app shell + offline navigation
    // fallback, and a web manifest so the site is installable. API requests are
    // never cached; only the shell and fonts are served offline.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DENTORA — Clinique Dentaire',
        short_name: 'DENTORA',
        description:
          'DENTORA — Clinique Dentaire à Alger. Soins dentaires, prise de rendez-vous en ligne.',
        lang: 'fr',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0A1520',
        background_color: '#0A1520',
        icons: [
          { src: '/pwa/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
