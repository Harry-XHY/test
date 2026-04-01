// Shared A-share stock data module — NOT an HTTP endpoint
// Imported by other API files for sector/stock data fetching and indicator calculation

// Sector code map: display name → Eastmoney BK code
export const SECTOR_MAP = {
  'AI算力':   'BK1050',
  '消费复苏': 'BK0997',
  '新能源':   'BK0493',
  '军工':     'BK0428',
  '半导体':   'BK0447',
  '医药生物': 'BK0465',
}

// Returns true if the stock name contains "ST" or "*ST" (suspended/warning stocks)
export function isSTStock(name) {
  return name.includes('ST') || name.includes('*ST')
}

// Fetch top 20 stocks in a sector by sector code, filtered to remove ST stocks
// Returns [{ code, name, market }] or [] on error
export async function fetchSectorStocks(sectorCode) {
  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&ut=bd1d9428fb35a36319c4a494aac219b6&fltt=2&invt=2&fid=f3&fs=b:${sectorCode}+f:!50&fields=f2,f3,f4,f12,f14,f100`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return []

    const json = await res.json()
    const items = json?.data?.diff
    if (!Array.isArray(items) || items.length === 0) return []

    return items
      .map(item => ({
        code:   String(item.f12),
        name:   String(item.f14),
        market: Number(item.f100), // 0=SZ, 1=SH
      }))
      .filter(stock => !isSTStock(stock.name))
  } catch {
    clearTimeout(timer)
    return []
  }
}

// Fetch K-line data for a stock and calculate technical indicators
// Returns full indicator object, or { code, name, error } / { code, name, suspended: true } on issues
export async function fetchStockData({ code, market, name }) {
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${market}.${code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&lmt=90`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return { code, name, error: '获取数据失败' }

    const json = await res.json()
    const klines = json?.data?.klines
    if (!Array.isArray(klines) || klines.length < 30) {
      return { code, name, error: '历史数据不足' }
    }

    // Parse each kline string: date,open,close,high,low,volume,...,changePercent,...,turnover
    const candles = klines.map(line => {
      const parts = line.split(',')
      return {
        date:          parts[0],
        open:          parseFloat(parts[1]),
        close:         parseFloat(parts[2]),
        high:          parseFloat(parts[3]),
        low:           parseFloat(parts[4]),
        volume:        parseFloat(parts[5]),
        changePercent: parseFloat(parts[8]),
        turnover:      parseFloat(parts[10]),
      }
    })

    // Guard: if the most recent candle has volume = 0, the stock is suspended
    const latest = candles[candles.length - 1]
    if (latest.volume === 0) {
      return { code, name, suspended: true }
    }

    const closes  = candles.map(c => c.close)
    const volumes = candles.map(c => c.volume)
    const n       = closes.length

    // --- Moving Averages ---
    const ma10 = avg(closes.slice(n - 10))
    const ma20 = avg(closes.slice(n - 20))

    // --- EMA / MACD ---
    // EMA12: seed from first 12 closes, then apply multiplier
    const ema12arr = calcEMA(closes, 12, 2 / 13, 11 / 13)
    // EMA26: seed from first 26 closes, then apply multiplier
    const ema26arr = calcEMA(closes, 26, 2 / 27, 25 / 27)

    // DIF series starts at index 25 (first valid EMA26 value)
    const difArr = []
    for (let i = 25; i < n; i++) {
      difArr.push(ema12arr[i] - ema26arr[i])
    }

    // DEA: seed from first 9 DIF values, then apply multiplier
    const deaArr = calcEMA(difArr, 9, 2 / 10, 8 / 10)

    const dif  = difArr[difArr.length - 1]
    const dea  = deaArr[deaArr.length - 1]
    const macd = (dif - dea) * 2

    // MACD signal based on the last two DIF/DEA values
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

    // Volume ratio: avg of last 3 volumes / avg of 10 days before recent 3
    const recentVols = volumes.slice(n - 3)
    const baseVols   = volumes.slice(n - 13, n - 3)
    const volRatio   = avg(recentVols) / avg(baseVols)

    const close  = latest.close
    const aboveMA = close > ma10 && close > ma20

    return {
      code,
      name,
      market,
      suspended:   false,
      latestDate:  latest.date,
      close,
      change:      latest.changePercent,
      ma10:        round(ma10, 4),
      ma20:        round(ma20, 4),
      dif:         round(dif, 4),
      dea:         round(dea, 4),
      macd:        round(macd, 4),
      macdSignal,
      volRatio:    round(volRatio, 2),
      aboveMA,
    }
  } catch {
    clearTimeout(timer)
    return { code, name, error: '获取数据失败' }
  }
}

// --- Helpers ---

// Simple average of an array of numbers
function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

// Round to N decimal places
function round(val, decimals) {
  return parseFloat(val.toFixed(decimals))
}

// Generic EMA calculation using SMA seed.
// seedLen: number of values to average for the seed
// k: fast multiplier (e.g. 2/13)
// mk: slow multiplier (e.g. 11/13 = 1 - k)
// Returns an array of length equal to values.length, with nulls before the seed.
function calcEMA(values, seedLen, k, mk) {
  const result = new Array(values.length).fill(null)
  if (values.length < seedLen) return result

  // Seed value is the simple average of the first seedLen elements
  let ema = avg(values.slice(0, seedLen))
  result[seedLen - 1] = ema

  for (let i = seedLen; i < values.length; i++) {
    ema = values[i] * k + ema * mk
    result[i] = ema
  }
  return result
}
