import { getRedis } from './_redis.js'
import pLimit from 'p-limit'
import { fetchStockData } from './_stockData.js'

// Vercel Cron — runs during A股 trading hours, evaluates every user's alerts
// against fresh quotes, and pushes hits into the user's `notifications` bucket.
//
// Schedule (vercel.json): every 5 minutes during 01:00-08:00 UTC Mon-Fri
// (covers 09:00-16:00 Beijing, the A股 trading window).
//
// Authorization: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.

const NOTIFICATIONS_TTL_SEC = 60 * 60 * 24 * 14 // 14 days
const ALERTS_TTL_SEC = 60 * 60 * 24 * 90        // match sync.js
const MAX_NOTIFS_PER_USER = 50
const SCAN_PAGE = 100
const QUOTE_CONCURRENCY = 5

function isTradingHoursUTC() {
  const now = new Date()
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return false
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  // 01:30-03:30 UTC = 09:30-11:30 BJT, 05:00-07:00 UTC = 13:00-15:00 BJT
  return (minutes >= 1 * 60 + 30 && minutes <= 3 * 60 + 30) ||
         (minutes >= 5 * 60      && minutes <= 7 * 60)
}

async function scanAlertKeys(redis) {
  const keys = []
  let cursor = '0'
  do {
    // Upstash REST: scan(cursor, { match, count }) -> [nextCursor, keys]
    const res = await redis.scan(cursor, { match: 'user:*:alerts', count: SCAN_PAGE })
    const next = Array.isArray(res) ? res[0] : res?.[0]
    const batch = Array.isArray(res) ? res[1] : res?.[1] || []
    cursor = String(next ?? '0')
    keys.push(...batch)
  } while (cursor !== '0')
  return keys
}

function evalAlert(alert, quote) {
  if (!alert.enabled || alert.triggered) return null
  const price = quote.close
  const changePct = quote.changePercent
  const macdSignal = quote.macdSignal
  const volRatio = quote.volRatio

  switch (alert.type) {
    case 'price_above':
      if (price != null && alert.threshold != null && price >= alert.threshold) {
        return `${alert.name}(${alert.code}) 现价 ${price.toFixed(2)} 元，已突破设定价 ${alert.threshold} 元`
      }
      break
    case 'price_below':
      if (price != null && alert.threshold != null && price <= alert.threshold) {
        return `${alert.name}(${alert.code}) 现价 ${price.toFixed(2)} 元，已跌破设定价 ${alert.threshold} 元`
      }
      break
    case 'change_pct_above':
      if (changePct != null && alert.threshold != null && changePct >= alert.threshold) {
        return `${alert.name}(${alert.code}) 涨幅 ${changePct.toFixed(2)}%，已超过 ${alert.threshold}%`
      }
      break
    case 'change_pct_below':
      if (changePct != null && alert.threshold != null && changePct <= -Math.abs(alert.threshold)) {
        return `${alert.name}(${alert.code}) 跌幅 ${changePct.toFixed(2)}%，已超过 ${alert.threshold}%`
      }
      break
    case 'macd_golden':
      if (macdSignal === 'golden_cross') {
        return `${alert.name}(${alert.code}) 出现 MACD 金叉信号`
      }
      break
    case 'macd_dead':
      if (macdSignal === 'dead_cross') {
        return `${alert.name}(${alert.code}) 出现 MACD 死叉信号`
      }
      break
    case 'vol_ratio_above':
      if (volRatio != null && alert.threshold != null && volRatio >= alert.threshold) {
        return `${alert.name}(${alert.code}) 量比 ${volRatio.toFixed(2)}，已超过 ${alert.threshold}`
      }
      break
  }
  return null
}

export default async function handler(req, res) {
  // Vercel Cron auth
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (req.headers.authorization !== expected) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'unauthorized' }))
  }

  const redis = getRedis()
  if (!redis) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'kv_not_configured' }))
  }

  // Skip outside trading hours unless explicitly forced (?force=1 for manual test).
  const forced = req.url && req.url.includes('force=1')
  if (!forced && !isTradingHoursUTC()) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ skipped: 'not_trading_hours' }))
  }

  let usersScanned = 0
  let alertsHit = 0

  try {
    const alertKeys = await scanAlertKeys(redis)
    if (alertKeys.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, users: 0, hits: 0 }))
    }

    // Fetch all users' alerts in one round-trip.
    const allAlertsRaw = await redis.mget(...alertKeys)

    // Build a unique set of stocks across all users so we fetch each quote once.
    const uniqueStocks = new Map() // code -> { code, market, name }
    for (const list of allAlertsRaw) {
      if (!Array.isArray(list)) continue
      for (const a of list) {
        if (a?.enabled && !a.triggered && a?.code) {
          if (!uniqueStocks.has(a.code)) {
            uniqueStocks.set(a.code, { code: String(a.code), market: a.market, name: a.name || a.code })
          }
        }
      }
    }

    if (uniqueStocks.size === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, users: alertKeys.length, hits: 0 }))
    }

    const limit = pLimit(QUOTE_CONCURRENCY)
    const quotePairs = await Promise.all(
      [...uniqueStocks.values()].map(s => limit(async () => {
        try { return [s.code, await fetchStockData(s)] } catch { return [s.code, null] }
      }))
    )
    const quotesByCode = new Map(quotePairs.filter(([, q]) => q && !q.error && !q.suspended))

    // Walk each user, evaluate their alerts, append hits to notifications.
    for (let i = 0; i < alertKeys.length; i++) {
      const key = alertKeys[i]
      const list = allAlertsRaw[i]
      if (!Array.isArray(list)) continue
      usersScanned++

      const deviceMatch = key.match(/^user:([a-f0-9-]{36}):alerts$/i)
      if (!deviceMatch) continue
      const deviceId = deviceMatch[1]

      const newNotifs = []
      let mutated = false
      const updated = list.map(alert => {
        if (!alert?.enabled || alert.triggered) return alert
        const quote = quotesByCode.get(String(alert.code))
        if (!quote) return alert
        const message = evalAlert(alert, quote)
        if (!message) return alert
        mutated = true
        alertsHit++
        newNotifs.push({
          id: 'notif_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
          alertId: alert.id,
          code: alert.code,
          name: alert.name,
          message,
          createdAt: new Date().toISOString(),
          read: false,
        })
        return { ...alert, triggered: true, triggeredAt: new Date().toISOString(), hitMessage: message }
      })

      if (!mutated) continue

      // Append to notifications bucket (capped) — read-modify-write.
      const existingNotifs = (await redis.get(`user:${deviceId}:notifications`)) || []
      const merged = [...newNotifs, ...(Array.isArray(existingNotifs) ? existingNotifs : [])].slice(0, MAX_NOTIFS_PER_USER)
      await redis.set(`user:${deviceId}:notifications`, merged, { ex: NOTIFICATIONS_TTL_SEC })
      await redis.set(key, updated, { ex: ALERTS_TTL_SEC })
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, users: usersScanned, hits: alertsHit }))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'cron_failed', detail: String(err?.message || err) }))
  }
}

export const config = { maxDuration: 60 }
