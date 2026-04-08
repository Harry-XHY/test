// Shared A-share stock data module — NOT an HTTP endpoint
// Uses Sina Finance + Tencent Finance APIs for real-time data
import https from 'node:https'
import http from 'node:http'

// Sector code map: display name → Sina concept board node code
export const SECTOR_MAP = {
  'AI算力':   'chgn_701051',
  '消费复苏': 'chgn_700182',  // 白酒 as proxy for consumer recovery
  '新能源':   'chgn_700410',  // 新能源车
  '军工':     'chgn_700071',  // 航天军工
  '半导体':   'chgn_700458',
  '医药生物': 'chgn_730141',  // 生物医药
}

// Derive market prefix for Tencent API: 6xx=sh, 3xx/0xx=sz
function txPrefix(code) {
  return code.startsWith('6') ? 'sh' : 'sz'
}

// Derive market code: 6xx=1(SH), others=0(SZ)
function deriveMarket(code) {
  return code.startsWith('6') ? 1 : 0
}

// HTTP GET with node:https (Node v24 undici drops connections to some CN servers)
function httpsGet(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// HTTP GET (plain http) for Sina Finance API
function httpGet(url, timeout = 8000) {
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

// Returns true if the stock name contains "ST" or "*ST"
export function isSTStock(name) {
  return name.includes('ST') || name.includes('*ST')
}

// Dynamically fetch sector stocks from Sina Finance API
// Returns top 30 stocks by market cap, filtered: no ST, market cap > 50亿
export async function fetchSectorStocks(sectorCode) {
  const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=40&sort=mktcap&asc=0&node=${sectorCode}`
  try {
    const raw = await httpGet(url)
    const stocks = JSON.parse(raw)
    if (!Array.isArray(stocks) || stocks.length === 0) return []

    return stocks
      .filter(s => {
        // Filter out ST stocks, suspended stocks (0 volume), and micro-caps (<50亿)
        if (isSTStock(s.name)) return false
        if (s.volume === 0 || s.trade === '0.000') return false
        const capYi = (s.mktcap || 0) / 10000 // Sina returns 万元
        if (capYi < 50) return false
        return true
      })
      .slice(0, 25)
      .map(s => ({
        code: s.code,
        name: s.name,
        market: deriveMarket(s.code),
        marketCap: Math.round((s.mktcap || 0) / 10000 * 1e8), // Convert 万元 → 元
      }))
  } catch {
    return []
  }
}

// Fetch K-line data from Tencent and calculate technical indicators
export async function fetchStockData({ code, market, name, marketCap }) {
  const prefix = txPrefix(code)
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${prefix}${code},day,,,90,qfq`

  try {
    const raw = await httpsGet(url)
    const json = JSON.parse(raw)
    const dayData = json?.data?.[`${prefix}${code}`]
    const klines = dayData?.qfqday || dayData?.day
    if (!Array.isArray(klines) || klines.length < 60) {
      return { code, name, error: '历史数据不足' }
    }

    // Tencent format: [date, open, close, high, low, volume]
    const candles = klines.map(k => ({
      date:   k[0],
      open:   parseFloat(k[1]),
      close:  parseFloat(k[2]),
      high:   parseFloat(k[3]),
      low:    parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))

    const latest = candles[candles.length - 1]
    if (latest.volume === 0 || !isFinite(latest.volume) || !isFinite(latest.close)) {
      return { code, name, suspended: true }
    }

    // Reject stocks with stale data (restructured/delisted) — >30 days old
    const latestMs = new Date(latest.date).getTime()
    if (Date.now() - latestMs > 30 * 86400000) {
      return { code, name, error: '数据过期，该股票可能已重组或更名' }
    }

    // Calculate change percent from previous close
    const prevClose = candles.length >= 2 ? candles[candles.length - 2].close : latest.open
    const changePercent = prevClose > 0 ? round((latest.close - prevClose) / prevClose * 100, 2) : 0

    const closes  = candles.map(c => c.close)
    const volumes = candles.map(c => c.volume)
    const n       = closes.length

    const ma5  = avg(closes.slice(n - 5))
    const ma10 = avg(closes.slice(n - 10))
    const ma20 = avg(closes.slice(n - 20))

    // MA5/MA10 golden cross detection over last 3 days
    // A cross happens on day i if ma5[i-1] <= ma10[i-1] && ma5[i] > ma10[i]
    let maGoldenCrossRecent = false
    for (let d = 0; d < 3; d++) {
      const end = n - d
      if (end < 11) break
      const ma5Now   = avg(closes.slice(end - 5, end))
      const ma10Now  = avg(closes.slice(end - 10, end))
      const ma5Prev  = avg(closes.slice(end - 6, end - 1))
      const ma10Prev = avg(closes.slice(end - 11, end - 1))
      if (ma5Prev <= ma10Prev && ma5Now > ma10Now) {
        maGoldenCrossRecent = true
        break
      }
    }

    const ema12arr = calcEMA(closes, 12, 2 / 13, 11 / 13)
    const ema26arr = calcEMA(closes, 26, 2 / 27, 25 / 27)

    const difArr = []
    for (let i = 25; i < n; i++) {
      difArr.push(ema12arr[i] - ema26arr[i])
    }

    const deaArr = calcEMA(difArr, 9, 2 / 10, 8 / 10)

    const latestDea = deaArr[deaArr.length - 1]
    if (latestDea === null) {
      return { code, name, error: '历史数据不足以计算MACD' }
    }

    const dif  = difArr[difArr.length - 1]
    const dea  = latestDea
    const macd = (dif - dea) * 2

    const prevDif = difArr[difArr.length - 2]
    const prevDea = deaArr[deaArr.length - 2]
    let macdSignal
    if (prevDif < prevDea && dif >= dea) {
      macdSignal = 'golden_cross'
    } else if (prevDif >= prevDea && dif < dea) {
      macdSignal = 'dead_cross'
    } else if (dif > dea && dif > 0) {
      macdSignal = 'above_zero'
    } else {
      macdSignal = 'below_zero'
    }

    // MACD golden cross over last 3 days
    let macdGoldenCrossRecent = false
    const dLen = difArr.length
    for (let d = 0; d < 3; d++) {
      const i = dLen - 1 - d
      if (i < 1) break
      if (difArr[i - 1] < deaArr[i - 1] && difArr[i] >= deaArr[i]) {
        macdGoldenCrossRecent = true
        break
      }
    }
    const doubleGoldenCross = macdGoldenCrossRecent && maGoldenCrossRecent

    const recentVols = volumes.slice(n - 3)
    const baseVols   = volumes.slice(n - 13, n - 3)
    const baseAvg    = avg(baseVols)
    const volRatio   = baseAvg === 0 ? 1.0 : parseFloat((avg(recentVols) / baseAvg).toFixed(2))

    const close   = latest.close
    const aboveMA = close > ma10 && close > ma20

    return {
      code,
      name,
      market: market ?? deriveMarket(code),
      suspended:   false,
      latestDate:  latest.date,
      close,
      change:      changePercent,
      ma5:         round(ma5, 4),
      ma10:        round(ma10, 4),
      ma20:        round(ma20, 4),
      maGoldenCrossRecent,
      macdGoldenCrossRecent,
      doubleGoldenCross,
      dif:         round(dif, 4),
      dea:         round(dea, 4),
      macd:        round(macd, 4),
      macdSignal,
      volRatio:    round(volRatio, 2),
      aboveMA,
      marketCap:   marketCap ?? null,
    }
  } catch (err) {
    return { code, name, error: '获取数据失败' }
  }
}

// Fetch major A-share index data via Sina real-time API
// Returns array: [{ name, code, close, change, volume, amount }]
export async function fetchMarketIndices() {
  const INDEX_NAMES = ['上证指数', '深证成指', '创业板指']
  const symbols = 's_sh000001,s_sz399001,s_sz399006'
  const url = `http://hq.sinajs.cn/list=${symbols}`
  try {
    const raw = await httpGet(url)
    const lines = raw.split('\n').filter(l => l.includes('='))
    return lines.map((line, i) => {
      const parts = line.split('"')[1]?.split(',')
      if (!parts || parts.length < 6) return null
      return {
        name: INDEX_NAMES[i] || parts[0],
        close: parseFloat(parts[1]),
        change: parseFloat(parts[3]),
        volume: parseFloat(parts[4]),   // 万手
        amount: parseFloat(parts[5]),   // 亿元
      }
    }).filter(Boolean)
  } catch { return [] }
}

// Fetch sector-level overview: avg change, top gainer for each sector
export async function fetchSectorOverview() {
  const results = []
  for (const [name, code] of Object.entries(SECTOR_MAP)) {
    const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=10&sort=changepercent&asc=0&node=${code}`
    try {
      const raw = await httpGet(url, 5000)
      const stocks = JSON.parse(raw)
      if (!Array.isArray(stocks) || stocks.length === 0) continue
      const valid = stocks.filter(s => !isSTStock(s.name) && s.volume > 0)
      const avgChange = valid.length > 0
        ? round(valid.reduce((s, v) => s + parseFloat(v.changepercent || 0), 0) / valid.length, 2)
        : 0
      const top = valid[0]
      results.push({
        sector: name,
        avgChange,
        topStock: top ? { code: top.code, name: top.name, change: parseFloat(top.changepercent || 0) } : null,
        upCount: valid.filter(s => parseFloat(s.changepercent) > 0).length,
        totalCount: valid.length,
      })
    } catch { /* skip failed sector */ }
  }
  return results.sort((a, b) => b.avgChange - a.avgChange)
}

// --- Scoring System (100-point weighted) ---

// Calculate stock score for buy recommendation
// Returns { total, trend, momentum, volume, detail }
export function calcStockScore(stockData, hotSectors = []) {
  if (!stockData || stockData.error || stockData.suspended) {
    return { total: 0, trend: 0, momentum: 0, volume: 0, theme: 0, detail: {} }
  }

  // 1. Trend score (30 pts max) — MA position
  let trend = 0
  const aboveMA10 = stockData.close > stockData.ma10
  const aboveMA20 = stockData.close > stockData.ma20
  if (aboveMA10 && aboveMA20) {
    trend = 30  // Both above → full score
  } else if (aboveMA10) {
    trend = 15  // Only above MA10
  }

  // 2. Momentum score (30 pts max) — MACD
  let momentum = 0
  const { macdSignal, dif } = stockData
  if (macdSignal === 'golden_cross' && dif > 0) {
    momentum = 30  // Golden cross + above zero
  } else if (macdSignal === 'above_zero') {
    momentum = 20  // Above zero (strong pullback)
  } else if (macdSignal === 'golden_cross') {
    momentum = 10  // Golden cross below zero
  }
  // dead_cross or below_zero → 0

  // 3. Volume score (25 pts max) — volume ratio
  let volume = 0
  const vr = stockData.volRatio
  if (vr >= 1.5) {
    volume = 25  // 50%+ amplification
  } else if (vr >= 1.3) {
    volume = 20  // 30-50% amplification
  } else if (vr >= 1.0) {
    volume = 10  // 0-30% amplification
  }
  // shrinking → 0

  // 4. Theme score (15 pts max) — hot sector match
  let theme = 0
  // hotSectors is sorted by avgChange desc, top 3 are "hot"
  if (hotSectors.length > 0 && stockData.sectorMatch) {
    const idx = hotSectors.findIndex(s => s.sector === stockData.sectorMatch)
    if (idx >= 0 && idx < 3) {
      theme = 15  // Top 3 hot sector
    } else if (idx >= 0) {
      theme = 10  // Other hot sector
    }
  }

  const total = trend + momentum + volume + theme

  return {
    total,
    trend,
    momentum,
    volume,
    theme,
    detail: {
      aboveMA10,
      aboveMA20,
      macdSignal,
      volRatio: vr,
      sectorMatch: stockData.sectorMatch || null,
    },
  }
}

// Determine position size based on score
export function getPositionAdvice(score) {
  if (score >= 90) return { verdict: '可以买入', position: '20%-30%', level: 'strong' }
  if (score >= 70) return { verdict: '可以买入', position: '10%-15%', level: 'moderate' }
  return { verdict: '暂不建议买入', position: '0%', level: 'weak' }
}

// --- Helpers ---

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function round(val, decimals) {
  return parseFloat(val.toFixed(decimals))
}

function calcEMA(values, seedLen, k, mk) {
  const result = new Array(values.length).fill(null)
  if (values.length < seedLen) return result

  let ema = avg(values.slice(0, seedLen))
  result[seedLen - 1] = ema

  for (let i = seedLen; i < values.length; i++) {
    ema = values[i] * k + ema * mk
    result[i] = ema
  }
  return result
}
