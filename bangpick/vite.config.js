import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

process.env.NO_PROXY = '*'
process.env.no_proxy = '*'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/chat': {
        target: 'https://api.minimaxi.com',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/anthropic/v1/messages',
      },
      '/api/ip-location': {
        target: 'https://ipinfo.io',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/json',
      },
      '/api/geocode': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace('/api/geocode', ''),
      },
    },
  },
})
