import https from 'node:https'
import pLimit from 'p-limit'
import { fetchStockData, fetchSectorStocks, fetchMarketIndices, fetchSectorOverview, SECTOR_MAP, isSTStock, calcStockScore, getPositionAdvice } from './_stockData.js'
import {
  RISK_FOOTER,
  recommendSystemPrompt,
  doubleGoldenSystemPrompt,
  holdingSystemPrompt,
  marketSystemPrompt,
  newsSystemPrompt,
  qaSystemPrompt,
} from './_prompts.js'

// ── Prompts moved to ./_prompts.js (Sprint 1, module 5a refactor) ──


// Stream MiniMax response via SSE — calls onChunk(text) for each text delta
function streamMiniMax(systemPrompt, userContent, onChunk) {
  const body = JSON.stringify({
    model: 'MiniMax-M2.7',
    max_tokens: 2048,
    stream: true,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let buf = ''
      res.on('data', chunk => {
        buf += chunk.toString()
        // Parse SSE lines
        const lines = buf.split('\n')
        buf = lines.pop() // keep incomplete line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            // Anthropic streaming: content_block_delta with type text_delta
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              onChunk(evt.delta.text)
            }
          } catch {}
        }
      })
      res.on('end', () => resolve())
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

// SSE helper: write an event to the raw response
function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function buildStockDataStr(stocks) {
  return stocks.map(stock =>
    `${stock.name}(${stock.code})：收盘${stock.close}元，涨跌${stock.change}%，` +
    `均线位置${stock.aboveMA ? '价格在10日线和20日线上方（多头排列）' : '价格未能站上均线'}，` +
    `MACD信号${stock.macdSignal === 'golden_cross' ? '金叉（短期上涨动能增强）' : stock.macdSignal === 'above_zero' ? '零轴上方运行（持续多头）' : '信号偏弱'}，` +
    `成交量较近期${stock.volRatio > 1.3 ? `放大${((stock.volRatio - 1) * 100).toFixed(0)}%（有资金进场）` : '正常'}` +
    (stock.doubleGoldenCross ? `，**双金叉形态**（MACD金叉+MA5上穿MA10，最近3日内发生）` : '') +
    (stock.marketCap ? `，流通市值约${(stock.marketCap / 1e8).toFixed(0)}亿` : '')
  ).join('\n')
}

async function handleRecommend(req, res) {
  const { sector, query, filter } = req.body
  const isDoubleGolden = filter === 'double_golden_cross'

  const sectorsToScan = sector && SECTOR_MAP[sector]
    ? [{ name: sector, code: SECTOR_MAP[sector] }]
    : Object.entries(SECTOR_MAP).map(([name, code]) => ({ name, code }))

  const limit = pLimit(10)
  let allValid = []

  for (const s of sectorsToScan) {
    const sectorStocks = await fetchSectorStocks(s.code)
    const results = await Promise.all(
      sectorStocks.map(stock => limit(() => fetchStockData(stock)))
    )
    const valid = results.filter(r =>
      !r.error && !r.suspended &&
      // 剔除流通市值超500亿的大盘股（PRD要求）
      (!r.marketCap || r.marketCap < 500e8)
    )
    allValid.push(...valid)
  }

  let filtered
  if (isDoubleGolden) {
    // 双金叉专属筛选
    filtered = allValid.filter(s => s.doubleGoldenCross === true && s.volRatio > 1.2)
    if (filtered.length < 3) {
      filtered = allValid.filter(s => s.doubleGoldenCross === true)
    }
    if (filtered.length < 3) {
      filtered = allValid.filter(s => s.macdGoldenCrossRecent && s.maGoldenCrossRecent)
    }
    // 按成交量活跃度排序
    filtered = filtered.sort((a, b) => (b.volRatio || 0) - (a.volRatio || 0))
  } else {
    // 默认 4-tier 筛选
    filtered = allValid.filter(s =>
      s.aboveMA && s.volRatio > 1.3 &&
      (s.macdSignal === 'golden_cross' || s.macdSignal === 'above_zero')
    )
    if (filtered.length < 3) {
      filtered = allValid.filter(s =>
        s.aboveMA && (s.macdSignal === 'golden_cross' || s.macdSignal === 'above_zero')
      )
    }
    if (filtered.length < 3) {
      filtered = allValid.filter(s => s.aboveMA === true)
    }
    if (filtered.length < 3) {
      filtered = allValid.filter(s => s.volRatio > 0).sort((a, b) => b.volRatio - a.volRatio)
    }
  }

  if (filtered.length === 0) {
    // Non-streaming fallback for no-opportunity
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      type: 'no_opportunity',
      message: isDoubleGolden
        ? `当前市场暂时没有同时出现"MACD金叉+均线金叉"的双金叉机会，这种形态本身就稀缺，建议耐心观望等待更明确的信号。\n\n${RISK_FOOTER}`
        : `当前暂无符合条件的短线机会，建议观望等待更好时机。\n\n${RISK_FOOTER}`,
    }))
  }

  const top3 = filtered.slice(0, 3)
  const sectorLabel = sector || '全市场'
  const stockDataStr = buildStockDataStr(top3)
  const userContent = isDoubleGolden
    ? `用户问题：${query || '推荐今日双金叉短线机会'}\n\n以下是${sectorLabel}筛选出的【双金叉形态】潜力股数据：\n${stockDataStr}`
    : `用户问题：${query || '推荐今日短线机会'}\n\n以下是${sectorLabel}筛选出的技术面较强股票数据：\n${stockDataStr}`

  // Start SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // Send stock data immediately
  sseWrite(res, 'meta', { type: isDoubleGolden ? 'recommend_double_golden' : 'recommend', stockData: top3 })

  try {
    const prompt = isDoubleGolden ? doubleGoldenSystemPrompt : recommendSystemPrompt
    await streamMiniMax(prompt, userContent, (chunk) => {
      sseWrite(res, 'delta', { text: chunk })
    })
  } catch {
    sseWrite(res, 'delta', { text: '分析服务暂时不可用' })
  }

  sseWrite(res, 'done', {})
  res.end()
}

async function handleHolding(req, res) {
  const { code, market, name, costPrice } = req.body
  const hasCost = costPrice && costPrice > 0

  if (!code || market === undefined || market === null) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '缺少股票代码或市场参数' }))
  }

  // Fetch stock data and hot sectors in parallel
  const [stockData, hotSectors] = await Promise.all([
    fetchStockData({ code, market, name: name || code }),
    fetchSectorOverview(),
  ])

  if (stockData.error) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ...stockData, type: 'holding' }))
  }
  if (stockData.suspended) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ...stockData, type: 'holding' }))
  }

  // Calculate weighted score (100-point system)
  const score = calcStockScore(stockData, hotSectors)
  const posAdvice = hasCost ? null : getPositionAdvice(score.total)
  const profitPct = hasCost ? ((stockData.close - costPrice) / costPrice * 100).toFixed(2) : null

  const macdDesc =
    stockData.macdSignal === 'golden_cross' ? '金叉（短期上涨动能增强）' :
    stockData.macdSignal === 'above_zero'   ? '零轴上方运行（持续多头）' :
    stockData.macdSignal === 'dead_cross'   ? '死叉（短期下跌风险增加）' :
    '零轴下方运行（偏弱）'

  const volDesc = stockData.volRatio >= 1.5
    ? `大幅放量（较近期放大${((stockData.volRatio - 1) * 100).toFixed(0)}%，有大资金进场）`
    : stockData.volRatio >= 1.3
      ? `明显放量（较近期放大${((stockData.volRatio - 1) * 100).toFixed(0)}%）`
      : stockData.volRatio < 0.8
        ? '明显缩量（较近期萎缩）'
        : '成交量正常'

  let userContent =
    `股票：${name || code}(${code})\n` +
    `当前收盘：${stockData.close}元\n` +
    `10日均线：${stockData.ma10}元\n` +
    `20日均线：${stockData.ma20}元\n`

  if (hasCost) {
    userContent += `成本价：${costPrice}元\n浮盈浮亏：${profitPct}%\n`
  } else {
    userContent +=
      `\n===== 加权评分结果（满分100分）=====\n` +
      `趋势得分（均线）：${score.trend}/30分${score.trend === 30 ? '（✅ 双线上方，趋势向好）' : score.trend === 15 ? '（⚠️ 仅10日线上方）' : '（❌ 双线下方，趋势偏弱）'}\n` +
      `动能得分（MACD）：${score.momentum}/30分${score.momentum >= 20 ? '（✅ 上涨动能充足）' : score.momentum === 10 ? '（⚠️ 弱势反弹信号）' : '（❌ 动能不足）'}\n` +
      `资金得分（成交量）：${score.volume}/25分${score.volume >= 20 ? '（✅ 资金积极进场）' : score.volume === 10 ? '（⚠️ 资金一般）' : '（❌ 缺乏资金推动）'}\n` +
      `题材得分（热点）：${score.theme}/15分${score.theme >= 10 ? '（✅ 热点板块）' : '（❌ 非当前热点）'}\n` +
      `总分：${score.total}/100分\n` +
      `\n评分判定：${score.total >= 90 ? '强满足（≥90分）→ 可以买入，建议仓位20%-30%' : score.total >= 70 ? '弱满足（70-89分）→ 可以买入，建议仓位10%-15%' : '不达标（<70分）→ 暂不建议买入'}\n`
  }

  userContent +=
    `\n技术指标详情：\n` +
    `均线位置：${stockData.aboveMA ? '价格在10日线和20日线上方（多头排列）' : stockData.close > stockData.ma10 ? '价格仅在10日线上方，尚未站上20日线' : '价格低于10日线和20日线，短期趋势偏弱'}\n` +
    `MACD信号：${macdDesc}\n` +
    `成交量：${volDesc}\n` +
    `数据截至：${stockData.latestDate}`

  // Start SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  sseWrite(res, 'meta', {
    type: 'holding',
    stockData: { ...stockData, ...(hasCost ? { profitPct: Number(profitPct), costPrice } : {}), score },
  })

  try {
    await streamMiniMax(holdingSystemPrompt, userContent, (chunk) => {
      sseWrite(res, 'delta', { text: chunk })
    })
  } catch {
    sseWrite(res, 'delta', { text: '分析服务暂时不可用' })
  }

  sseWrite(res, 'done', {})
  res.end()
}

async function handleNews(req, res) {
  const { content } = req.body

  if (!content) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '请提供需要解读的新闻内容' }))
  }

  const userContent = `请解读以下新闻/公告/政策对A股短线的影响：\n\n${content}`

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  sseWrite(res, 'meta', { type: 'news' })

  try {
    await streamMiniMax(newsSystemPrompt, userContent, (chunk) => {
      sseWrite(res, 'delta', { text: chunk })
    })
  } catch {
    sseWrite(res, 'delta', { text: '分析服务暂时不可用' })
  }

  sseWrite(res, 'done', {})
  res.end()
}

async function handleQA(req, res) {
  const { query } = req.body

  if (!query) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '请提供您的问题' }))
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  sseWrite(res, 'meta', { type: 'qa' })

  try {
    await streamMiniMax(qaSystemPrompt, query, (chunk) => {
      sseWrite(res, 'delta', { text: chunk })
    })
  } catch {
    sseWrite(res, 'delta', { text: '分析服务暂时不可用' })
  }

  sseWrite(res, 'done', {})
  res.end()
}

async function handleMarket(req, res) {
  // Fetch indices and sector overview in parallel
  const [indices, sectors] = await Promise.all([
    fetchMarketIndices(),
    fetchSectorOverview(),
  ])

  if (indices.length === 0 && sectors.length === 0) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ type: 'market', error: true, text: '获取大盘数据失败，请稍后重试' }))
  }

  // Build data string for AI
  const indexStr = indices.map(i =>
    `${i.name}：${i.close}点，涨跌${i.change > 0 ? '+' : ''}${i.change}%，成交${i.amount}亿元`
  ).join('\n')

  const sectorStr = sectors.map(s =>
    `${s.sector}：板块均涨${s.avgChange > 0 ? '+' : ''}${s.avgChange}%，上涨${s.upCount}/${s.totalCount}只` +
    (s.topStock ? `，龙头${s.topStock.name}(${s.topStock.code})涨${s.topStock.change > 0 ? '+' : ''}${s.topStock.change}%` : '')
  ).join('\n')

  const userContent = `今日三大指数实时数据：\n${indexStr}\n\n各板块表现：\n${sectorStr}`

  // Start SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  sseWrite(res, 'meta', { type: 'market', indices, sectors })

  try {
    await streamMiniMax(marketSystemPrompt, userContent, (chunk) => {
      sseWrite(res, 'delta', { text: chunk })
    })
  } catch {
    sseWrite(res, 'delta', { text: '分析服务暂时不可用' })
  }

  sseWrite(res, 'done', {})
  res.end()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  const { type } = req.body
  if (!type) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '缺少分析类型' }))
  }

  try {
    if (type === 'recommend') return handleRecommend(req, res)
    else if (type === 'holding') return handleHolding(req, res)
    else if (type === 'market') return handleMarket(req, res)
    else if (type === 'news') return handleNews(req, res)
    else if (type === 'qa') return handleQA(req, res)
    else {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '不支持的分析类型' }))
    }
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
    }
    res.end(JSON.stringify({ error: '分析失败，请稍后重试' }))
  }
}
