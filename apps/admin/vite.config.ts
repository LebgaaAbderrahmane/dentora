import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  optimizeDeps: {
    // Serve workspace packages from source so i18n/contracts/ui edits are always
    // picked up (a stale pre-bundled @dentora/i18n cached at server start showed
    // raw keys like `nav.notifications` after new keys were added).
    exclude: ['@dentora/i18n', '@dentora/ui', '@dentora/contracts'],
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
})
