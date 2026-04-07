import { Redis } from '@upstash/redis'

// Allowed data buckets per device. Anything else is rejected.
const ALLOWED_KEYS = new Set([
  'history',
  'holdings',
  'watchlist',
  'stockChat',
  'snapshots',
  'alerts',
  'notifications', // server-written by cron-check-alerts; client clears after read
])

// Soft cap on payload size to keep KV usage in check (per bucket).
const MAX_BYTES = 64 * 1024 // 64 KB

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return Redis.fromEnv()
}

function isValidDeviceId(id) {
  return typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  return await new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const redis = getRedis()
  if (!redis) {
    return jsonResponse(res, 503, { error: 'cloud_sync_unavailable' })
  }

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost')
    const deviceId = url.searchParams.get('deviceId')
    const key = url.searchParams.get('key')
    if (!isValidDeviceId(deviceId)) return jsonResponse(res, 400, { error: 'invalid_device_id' })
    if (!ALLOWED_KEYS.has(key)) return jsonResponse(res, 400, { error: 'invalid_key' })

    try {
      const value = await redis.get(`user:${deviceId}:${key}`)
      return jsonResponse(res, 200, { value: value ?? null })
    } catch (err) {
      return jsonResponse(res, 500, { error: 'kv_read_failed' })
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body
    try { body = await readBody(req) } catch { return jsonResponse(res, 400, { error: 'bad_json' }) }

    const { deviceId, key, value } = body || {}
    if (!isValidDeviceId(deviceId)) return jsonResponse(res, 400, { error: 'invalid_device_id' })
    if (!ALLOWED_KEYS.has(key)) return jsonResponse(res, 400, { error: 'invalid_key' })

    const serialized = JSON.stringify(value ?? null)
    if (serialized.length > MAX_BYTES) {
      return jsonResponse(res, 413, { error: 'payload_too_large' })
    }

    try {
      // 90-day TTL: keeps unused devices from accumulating forever.
      await redis.set(`user:${deviceId}:${key}`, value, { ex: 60 * 60 * 24 * 90 })
      return jsonResponse(res, 200, { ok: true })
    } catch (err) {
      return jsonResponse(res, 500, { error: 'kv_write_failed' })
    }
  }

  res.writeHead(405, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'method_not_allowed' }))
}
