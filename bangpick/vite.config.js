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
    },
  },
})
