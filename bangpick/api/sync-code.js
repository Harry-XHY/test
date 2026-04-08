import { getRedis } from './_redis.js'

// Generate or redeem a 6-digit cross-device sync code.
//   POST { action: 'generate', deviceId }
//     -> { code }
//   POST { action: 'redeem', code, targetDeviceId }
//     -> { merged: { history, holdings, watchlist, stockChat, snapshots, alerts } }
//
// Codes live for 10 minutes. Redeeming pulls all source-device buckets and
// returns them so the client can perform the merge locally and then push the
// merged result back through /api/sync.

const BUCKETS = ['history', 'holdings', 'watchlist', 'stockChat', 'snapshots', 'alerts']
const CODE_TTL_SEC = 600

function isValidDeviceId(id) {
  return typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)
}

function isValidCode(code) {
  return typeof code === 'string' && /^\d{6}$/.test(code)
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
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
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'method_not_allowed' })
  }

  const redis = getRedis()
  if (!redis) return jsonResponse(res, 503, { error: 'cloud_sync_unavailable' })

  let body
  try { body = await readBody(req) } catch { return jsonResponse(res, 400, { error: 'bad_json' }) }
  const { action } = body || {}

  if (action === 'generate') {
    const { deviceId } = body
    if (!isValidDeviceId(deviceId)) return jsonResponse(res, 400, { error: 'invalid_device_id' })

    // Try a few times in the unlikely case of collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      try {
        const ok = await redis.set(`synccode:${code}`, deviceId, { ex: CODE_TTL_SEC, nx: true })
        if (ok) {
          return jsonResponse(res, 200, { code, expiresInSec: CODE_TTL_SEC })
        }
      } catch (err) {
        return jsonResponse(res, 500, { error: 'kv_write_failed' })
      }
    }
    return jsonResponse(res, 500, { error: 'code_collision' })
  }

  if (action === 'redeem') {
    const { code, targetDeviceId } = body
    if (!isValidCode(code)) return jsonResponse(res, 400, { error: 'invalid_code' })
    if (!isValidDeviceId(targetDeviceId)) return jsonResponse(res, 400, { error: 'invalid_device_id' })

    let sourceDeviceId
    try {
      sourceDeviceId = await redis.get(`synccode:${code}`)
    } catch {
      return jsonResponse(res, 500, { error: 'kv_read_failed' })
    }

    if (!sourceDeviceId) return jsonResponse(res, 404, { error: 'code_not_found_or_expired' })
    if (sourceDeviceId === targetDeviceId) {
      return jsonResponse(res, 400, { error: 'same_device' })
    }

    try {
      const keys = BUCKETS.map(b => `user:${sourceDeviceId}:${b}`)
      const values = await redis.mget(...keys)
      const merged = {}
      BUCKETS.forEach((b, i) => { merged[b] = values[i] ?? null })

      // Single-use code: invalidate after successful read.
      await redis.del(`synccode:${code}`)

      return jsonResponse(res, 200, { merged })
    } catch (err) {
      return jsonResponse(res, 500, { error: 'kv_read_failed' })
    }
  }

  return jsonResponse(res, 400, { error: 'unknown_action' })
}
