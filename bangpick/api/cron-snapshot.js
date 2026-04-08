import { getRedis } from './_redis.js'
import pLimit from 'p-limit'
import { fetchStockData } from './_stockData.js'

// Vercel Cron — runs once per trading day after market close. Walks every
// user's holdings, fetches the day's closing quote, computes per-stock P&L
// versus the user's cost price, and appends a snapshot to their `snapshots`
// bucket. The Holdings tab consumes this for the P&L curve.
//
// Schedule (vercel.json): 07:30 UTC Mon-Fri (15:30 Beijing, ~30 min after close).

const SNAPSHOTS_TTL_SEC = 60 * 60 * 24 * 400 // ~13 months
const HOLDINGS_TTL_SEC = 60 * 60 * 24 * 90
const MAX_SNAPSHOTS = 365
const SCAN_PAGE = 100
const QUOTE_CONCURRENCY = 5

function todayKey() {
  // Use Beijing date (UTC+8) — snapshots align with the local trading day.
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000
  const bj = new Date(utc + 8 * 60 * 60 * 1000)
  const y = bj.getUTCFullYear()
  const m = String(bj.getUTCMonth() + 1).padStart(2, '0')
  const d = String(bj.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function scanHoldingKeys(redis) {
  const keys = []
  let cursor = '0'
  do {
    const res = await redis.scan(cursor, { match: 'user:*:holdings', count: SCAN_PAGE })
    const next = Array.isArray(res) ? res[0] : res?.[0]
    const batch = Array.isArray(res) ? res[1] : res?.[1] || []
    cursor = String(next ?? '0')
    keys.push(...batch)
  } while (cursor !== '0')
  return keys
}

export default async function handler(req, res) {
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

  const date = todayKey()
  let usersScanned = 0
  let snapshotsWritten = 0

  try {
    const holdingKeys = await scanHoldingKeys(redis)
    if (holdingKeys.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, users: 0, snapshots: 0 }))
    }

    const allHoldingsRaw = await redis.mget(...holdingKeys)

    // Unique stocks across all users → fetch each quote once.
    const uniqueStocks = new Map()
    for (const list of allHoldingsRaw) {
      if (!Array.isArray(list)) continue
      for (const h of list) {
        if (h?.code && !uniqueStocks.has(h.code)) {
          uniqueStocks.set(h.code, { code: String(h.code), market: h.market, name: h.name || h.code })
        }
      }
    }

    if (uniqueStocks.size === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, users: holdingKeys.length, snapshots: 0 }))
    }

    const limit = pLimit(QUOTE_CONCURRENCY)
    const quotePairs = await Promise.all(
      [...uniqueStocks.values()].map(s => limit(async () => {
        try { return [s.code, await fetchStockData(s)] } catch { return [s.code, null] }
      }))
    )
    const quotesByCode = new Map(quotePairs.filter(([, q]) => q && !q.error && !q.suspended))

    for (let i = 0; i < holdingKeys.length; i++) {
      const key = holdingKeys[i]
      const holdings = allHoldingsRaw[i]
      if (!Array.isArray(holdings) || holdings.length === 0) continue
      usersScanned++

      const deviceMatch = key.match(/^user:([a-f0-9-]{36}):holdings$/i)
      if (!deviceMatch) continue
      const deviceId = deviceMatch[1]

      const stocks = []
      let pctSum = 0
      let pctCount = 0
      for (const h of holdings) {
        const quote = quotesByCode.get(String(h.code))
        if (!quote || !h.costPrice) continue
        const close = quote.close
        const pct = ((close - h.costPrice) / h.costPrice) * 100
        stocks.push({
          code: h.code,
          name: h.name,
          close,
          costPrice: h.costPrice,
          pct: Number(pct.toFixed(2)),
        })
        pctSum += pct
        pctCount++
      }

      if (stocks.length === 0) continue

      const snapshot = {
        date,
        createdAt: new Date().toISOString(),
        total: {
          count: stocks.length,
          avgPct: Number((pctSum / pctCount).toFixed(2)),
          winRate: Number((stocks.filter(s => s.pct > 0).length / stocks.length * 100).toFixed(0)),
        },
        stocks,
      }

      const snapshotsKey = `user:${deviceId}:snapshots`
      const existing = (await redis.get(snapshotsKey)) || []
      const list = Array.isArray(existing) ? existing : []
      // Replace any existing entry for the same date so manual reruns are idempotent.
      const filtered = list.filter(s => s?.date !== date)
      filtered.push(snapshot)
      // Sort ascending and cap to MAX_SNAPSHOTS most recent days.
      filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const capped = filtered.slice(-MAX_SNAPSHOTS)

      await redis.set(snapshotsKey, capped, { ex: SNAPSHOTS_TTL_SEC })
      // Touch holdings TTL so an active trader's data doesn't expire from inactivity gaps.
      await redis.expire(key, HOLDINGS_TTL_SEC)
      snapshotsWritten++
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, date, users: usersScanned, snapshots: snapshotsWritten }))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'cron_failed', detail: String(err?.message || err) }))
  }
}

export const config = { maxDuration: 60 }
