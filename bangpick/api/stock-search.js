import https from 'node:https'
import http from 'node:http'

const SEARCH_TOKEN = '894050c76af8597a853f5b408b759f5d'

function httpsGet(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { reject(new Error('JSON parse error')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function httpGetRaw(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'http://vip.stock.finance.sina.com.cn/' } }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// Retry wrapper: try up to 2 times
async function httpsGetRetry(url, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try { return await httpsGet(url) } catch (e) {
      if (i === retries) throw e
    }
  }
}

// Fallback: Sina Finance stock search
async function sinaSearch(keyword) {
  const url = `http://suggest3.sinajs.cn/suggest/type=11,12&key=${encodeURIComponent(keyword)}&name=suggestdata`
  const raw = await httpGetRaw(url)
  // Format: var suggestdata="code,shortname,fullname,market,...;code2,...";
  const m = raw.match(/"(.+?)"/)
  if (!m || !m[1]) return []
  return m[1].split(';').filter(Boolean).map(item => {
    const parts = item.split(',')
    if (!parts[0] || !/^\d{6}$/.test(parts[0])) return null
    const code = parts[0]
    return {
      code,
      name: parts[4] || parts[1] || code,
      market: code.startsWith('6') ? 1 : 0,
    }
  }).filter(Boolean).slice(0, 10)
}

function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonRes(res, 405, { error: 'Method not allowed' })

  const { keyword } = req.body
  if (!keyword || !keyword.trim()) return jsonRes(res, 400, { error: '缺少搜索关键词' })

  const token = process.env.EASTMONEY_TOKEN || SEARCH_TOKEN
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword.trim())}&type=14&token=${token}&count=10`

  // Try EastMoney first, fallback to Sina
  let results = []

  try {
    const data = await httpsGetRetry(url)
    const items = data?.QuotationCodeTable?.Data || data?.result?.Result || []
    if (Array.isArray(items) && items.length > 0) {
      results = items
        .filter(item => /^\d{6}$/.test(String(item.Code)))
        .slice(0, 10)
        .map(item => ({
          code:   String(item.Code),
          name:   String(item.Name),
          market: item.MktNum !== undefined ? Number(item.MktNum) : (String(item.Code).startsWith('6') ? 1 : 0),
        }))
    }
  } catch { /* EastMoney failed, try Sina below */ }

  // Fallback: Sina Finance search
  if (results.length === 0) {
    try {
      results = await sinaSearch(keyword.trim())
    } catch { /* both failed */ }
  }

  return jsonRes(res, 200, results)
}
