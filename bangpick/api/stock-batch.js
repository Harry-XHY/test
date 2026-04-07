import pLimit from 'p-limit'
import { fetchStockData } from './_stockData.js'

// Batch quote endpoint for the watchlist page.
//   POST { stocks: [{ code, name, market }, ...] }
//   -> { results: [{ code, name, price, changePercent, volRatio, ... }] }
//
// Concurrency-limited so a 30-stock watchlist doesn't overload upstream.

const MAX_STOCKS = 50
const CONCURRENCY = 6

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
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'method_not_allowed' }))
    return
  }

  let body
  try { body = await readBody(req) } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'bad_json' }))
    return
  }

  const stocks = Array.isArray(body?.stocks) ? body.stocks : []
  if (stocks.length === 0) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ results: [] }))
    return
  }
  if (stocks.length > MAX_STOCKS) {
    res.writeHead(413, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'too_many_stocks', max: MAX_STOCKS }))
    return
  }

  const limit = pLimit(CONCURRENCY)
  const tasks = stocks.map(s => limit(async () => {
    if (!s?.code) return { code: s?.code || '', name: s?.name || '', error: 'missing_code' }
    try {
      return await fetchStockData({
        code: String(s.code),
        market: s.market,
        name: s.name || s.code,
      })
    } catch (err) {
      return { code: s.code, name: s.name || s.code, error: 'fetch_failed' }
    }
  }))

  const results = await Promise.all(tasks)

  // Cache for 30s — A-share quotes don't change faster than that for our needs.
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
  })
  res.end(JSON.stringify({ results }))
}

export const config = { maxDuration: 30 }
