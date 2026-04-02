import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

process.env.NO_PROXY = '*'
process.env.no_proxy = '*'

function loadEnv() {
  const envFile = path.resolve(fileURLToPath(import.meta.url), '..', '.env.local')
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim().replace(/^VITE_/, '')
      if (!process.env[key]) process.env[key] = m[2].trim()
    }
  }
}

function vercelApiPlugin() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      loadEnv()

      // Geocode reverse proxy — needs system proxy to reach nominatim
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/api/geocode/')) return next()
        const target = 'https://nominatim.openstreetmap.org' + req.url.replace('/api/geocode', '')
        import('node:child_process').then(({ execFile }) => {
          const env = { ...process.env, NO_PROXY: '', no_proxy: '' }
          execFile('curl', ['-s', '-x', 'http://127.0.0.1:7890', '-m', '10', target, '-H', 'User-Agent: BangPick/1.0'],
            { encoding: 'utf-8', timeout: 12000, env },
            (err, stdout) => {
              if (err || !stdout) {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'geocode failed' }))
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(stdout)
              }
            },
          )
        })
      })

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/stock-')) return next()

        const apiDir = path.resolve(fileURLToPath(import.meta.url), '..', 'api')
        const fnName = req.url.replace('/api/', '').split('?')[0]
        const fnPath = path.join(apiDir, `${fnName}.js`)

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const mod = await import(`${fnPath}?t=${Date.now()}`)
            const fakeReq = { method: req.method, body: body ? JSON.parse(body) : {}, headers: req.headers }
            // Pass raw res for SSE streaming support
            await mod.default(fakeReq, res)
          } catch (err) {
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
            }
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiPlugin()],
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
      // geocode handled by vercelApiPlugin middleware (needs system proxy)
    },
  },
})
