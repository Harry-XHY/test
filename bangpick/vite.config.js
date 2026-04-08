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

function printOnboardingQR(server) {
  // Defer QR rendering until vite has bound the port and printed its banner.
  const orig = server.printUrls.bind(server)
  server.printUrls = async () => {
    orig()
    try {
      const qrcode = (await import('qrcode-terminal')).default
      const nets = await import('node:os').then(m => m.networkInterfaces())
      let lan = null
      for (const list of Object.values(nets)) {
        for (const n of list || []) {
          if (n.family === 'IPv4' && !n.internal) { lan = n.address; break }
        }
        if (lan) break
      }
      if (!lan) return
      const port = server.config.server.port || server.httpServer?.address()?.port
      const appUrl = `http://${lan}:${port}/stock`
      console.log('\n  📱  手机扫码访问:')
      qrcode.generate(appUrl, { small: true })
      console.log(`     ${appUrl}\n`)
    } catch (e) {
      console.error('[onboarding] QR render failed:', e.message)
    }
  }
}

function vercelApiPlugin() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      loadEnv()
      printOnboardingQR(server)

      // Geocode reverse proxy — try direct first, fall back to local clash proxy.
      // In China, nominatim is often blocked direct; clash on :7890 is the typical escape hatch.
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/api/geocode/')) return next()
        const target = 'https://nominatim.openstreetmap.org' + req.url.replace('/api/geocode', '')

        import('node:child_process').then(({ execFile }) => {
          const env = { ...process.env, NO_PROXY: '', no_proxy: '' }
          const baseArgs = ['-s', '-S', '-m', '8', '-H', 'User-Agent: BangPick/1.0', target]

          const tryFetch = (extraArgs, label, onFail) => {
            execFile('curl', [...extraArgs, ...baseArgs], { encoding: 'utf-8', timeout: 10000, env },
              (err, stdout, stderr) => {
                if (err || !stdout) {
                  console.log(`[geocode:${label}] failed: ${err?.message || stderr || 'empty'}`)
                  onFail()
                } else {
                  console.log(`[geocode:${label}] ok (${stdout.length} bytes)`)
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(stdout)
                }
              },
            )
          }

          tryFetch([], 'direct', () => {
            tryFetch(['-x', 'http://127.0.0.1:7890'], 'clash', () => {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'geocode failed: both direct and proxy unreachable' }))
            })
          })
        })
      })

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/stock-') && !req.url.startsWith('/api/chat')) return next()

        console.log(`[api] ${req.method} ${req.url}`)
        const apiDir = path.resolve(fileURLToPath(import.meta.url), '..', 'api')
        const fnName = req.url.replace('/api/', '').split('?')[0]
        const fnPath = path.join(apiDir, `${fnName}.js`)

        // Vercel functions assume Express-style res.status().json()/.send().
        // Node's raw res only has writeHead/end. Patch the helpers in-place
        // so SSE handlers (which still use res.write directly) keep working.
        if (typeof res.status !== 'function') {
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => {
            if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }
          res.send = (data) => {
            res.end(typeof data === 'string' ? data : JSON.stringify(data))
            return res
          }
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          console.log(`[api] body received for ${req.url} (${body.length} bytes)`)
          try {
            const mod = await import(`${fnPath}?t=${Date.now()}`)
            const fakeReq = { method: req.method, body: body ? JSON.parse(body) : {}, headers: req.headers }
            console.log(`[api] invoking ${fnName} with`, fakeReq.body)
            await mod.default(fakeReq, res)
            console.log(`[api] ${fnName} returned`)
          } catch (err) {
            console.error(`[api] ${fnName} threw:`, err.message)
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
    host: '0.0.0.0',
    proxy: {
      // /api/chat 现在走本地 vercelApiPlugin → _aiProvider.js (zhipu/minimax/gemini)
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
