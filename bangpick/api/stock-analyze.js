import pLimit from 'p-limit'
import { fetchStockData, fetchSectorStocks, SECTOR_MAP, isSTStock } from './_stockData.js'

const RISK_FOOTER = '⚠️ 股市有风险，短线交易波动大，建议仓位不超过总资金的30%，严格执行止损止盈纪律。本工具仅为个人辅助参考，不构成投资建议。'

const recommendSystemPrompt = `你是一位专业的A股短线交易助手，服务对象是炒股纯小白。

你的任务是根据我提供的技术指标数据，为用户推荐最多3只短线潜力股（持有周期1-5个交易日）。

硬性选股规则（已通过技术筛选的数据才会给你）：
- 日K站稳10日、20日均线上方（多头排列）
- MACD金叉或零轴上方运行
- 近3日成交量放大≥30%（有资金主动进场）
- 已剔除ST股、退市风险股、流通盘超500亿股票

输出要求：
1. 用markdown表格呈现，列：股票代码+名称 | 推荐逻辑 | 建议买入区间 | 止损点位 | 止盈目标 | 风险提示
2. 推荐逻辑要结合技术面+题材面，全部用大白话（例如"资金在大量买入，短期有上涨动能"），严禁直接输出指标数值
3. 买入区间、止损点、止盈目标基于当前收盘价给出明确价格区间
4. 每只股票必须标注1-2条核心风险（如题材退潮、大盘风险、解禁、减持等）
5. 结尾加：${RISK_FOOTER}

严禁事项：
- 严禁出现"保证盈利""100%赚钱""必涨"等承诺性表述
- 不推荐超过3只个股
- 不做长线价值分析，仅围绕1-5日短线
- 遇到不切实际盈利需求，明确拒绝并引导理性投资`

const holdingSystemPrompt = `你是一位专业的A股短线交易助手，服务对象是炒股纯小白。

你的任务是根据用户的持仓信息和最新技术指标，给出明确的操作建议。

输出要求：
1. 第一行必须给出明确的四选一建议（加粗）：**继续持有** / **加仓** / **减仓** / **清仓**
2. 用大白话解释判断理由，就像跟完全不懂股票的朋友聊天（例如"今天成交量缩了，说明主力在观望，建议先不动"）
3. 禁止输出原始指标数值，只能说信号含义
4. 如果建议减仓或清仓，给出建议的卖出价格区间
5. 结尾加：${RISK_FOOTER}

严禁事项：
- 不模棱两可，不模糊表述，必须给出明确操作结论
- 仅围绕1-5日短线分析，不扩展周期`

const newsSystemPrompt = `你是一位专业的A股短线交易助手，服务对象是炒股纯小白。

你的任务是判断用户提供的新闻/公告对相关股票的短线影响。

输出格式（严格按此格式）：
**判断：利好 / 利空 / 中性**
**影响程度：短期显著影响 / 短期轻微影响 / 无实质影响**

理由：（2-3句大白话解释，不做长线分析）

如果新闻涉及具体股票，指出受影响的股票代码和名称。

结尾加：${RISK_FOOTER}`

async function callMiniMax(systemPrompt, userContent) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const data = await response.json()
    return data.content?.[0]?.text || data.content || '分析失败，请稍后重试'
  } catch (err) {
    return '服务暂时不可用，请稍后重试'
  }
}

function buildStockDataStr(stocks) {
  return stocks.map(stock =>
    `${stock.name}(${stock.code})：收盘${stock.close}元，涨跌${stock.change}%，` +
    `均线位置${stock.aboveMA ? '价格在10日线和20日线上方（多头排列）' : '价格未能站上均线'}，` +
    `MACD信号${stock.macdSignal === 'golden_cross' ? '金叉（短期上涨动能增强）' : stock.macdSignal === 'above_zero' ? '零轴上方运行（持续多头）' : '信号偏弱'}，` +
    `成交量较近期${stock.volRatio > 1.3 ? `放大${((stock.volRatio - 1) * 100).toFixed(0)}%（有资金进场）` : '正常'}` +
    (stock.marketCap ? `，流通市值约${(stock.marketCap / 1e8).toFixed(0)}亿` : '')
  ).join('\n')
}

async function handleRecommend(req, res) {
  const { sector, query } = req.body

  const sectorCode = SECTOR_MAP[sector]
  if (!sectorCode) return res.status(400).json({ error: `未知板块：${sector}` })

  const sectorStocks = await fetchSectorStocks(sectorCode)

  const limit = pLimit(10)
  const allResults = await Promise.all(
    sectorStocks.map(stock => limit(() => fetchStockData(stock)))
  )

  const valid = allResults.filter(s => !s.error && !s.suspended)

  // 3-tier filtering: strict → medium → loose
  let filtered = valid.filter(s =>
    s.aboveMA &&
    s.volRatio > 1.3 &&
    (s.macdSignal === 'golden_cross' || s.macdSignal === 'above_zero')
  )

  if (filtered.length < 3) {
    filtered = valid.filter(s =>
      s.aboveMA &&
      (s.macdSignal === 'golden_cross' || s.macdSignal === 'above_zero')
    )
  }

  if (filtered.length < 3) {
    filtered = valid.filter(s => s.aboveMA === true)
  }

  if (filtered.length === 0) {
    return res.status(200).json({
      type: 'no_opportunity',
      message: `当前${sector}板块暂无符合条件的短线机会，建议观望等待更好时机。\n\n${RISK_FOOTER}`,
    })
  }

  const top3 = filtered.slice(0, 3)
  const stockDataStr = buildStockDataStr(top3)
  const userContent = `用户问题：${query}\n\n以下是${sector}板块筛选出的技术面较强股票数据：\n${stockDataStr}`

  const text = await callMiniMax(recommendSystemPrompt, userContent)
  return res.status(200).json({ text, stockData: top3, type: 'recommend' })
}

async function handleHolding(req, res) {
  const { code, market, name, costPrice } = req.body

  if (!costPrice || costPrice <= 0) {
    return res.status(400).json({ error: '成本价必须大于0' })
  }

  if (!code || market === undefined || market === null) {
    return res.status(400).json({ error: '缺少股票代码或市场参数' })
  }

  const stockData = await fetchStockData({ code, market, name: name || code })

  if (stockData.error) return res.status(200).json({ ...stockData, type: 'holding' })
  if (stockData.suspended) return res.status(200).json({ ...stockData, type: 'holding' })

  const profitPct = ((stockData.close - costPrice) / costPrice * 100).toFixed(2)

  const macdDesc =
    stockData.macdSignal === 'golden_cross' ? '金叉（短期上涨动能增强）' :
    stockData.macdSignal === 'above_zero'   ? '零轴上方运行（持续多头）' :
    stockData.macdSignal === 'dead_cross'   ? '死叉（短期下跌风险增加）' :
    '零轴下方运行（偏弱）'

  const volDesc = stockData.volRatio > 1.3
    ? `明显放量（较近期放大${((stockData.volRatio - 1) * 100).toFixed(0)}%）`
    : stockData.volRatio < 0.8
      ? '明显缩量（较近期萎缩）'
      : '成交量正常'

  const userContent =
    `股票：${name || code}(${code})\n` +
    `成本价：${costPrice}元\n` +
    `当前收盘：${stockData.close}元\n` +
    `浮盈浮亏：${profitPct}%\n\n` +
    `技术指标：\n` +
    `均线位置：${stockData.aboveMA ? '价格在10日线和20日线上方' : '价格低于均线，需谨慎'}\n` +
    `MACD信号：${macdDesc}\n` +
    `成交量：${volDesc}\n` +
    `数据截至：${stockData.latestDate}`

  const text = await callMiniMax(holdingSystemPrompt, userContent)
  return res.status(200).json({ text, stockData: { ...stockData, profitPct: Number(profitPct), costPrice }, type: 'holding' })
}

async function handleNews(req, res) {
  const { content } = req.body

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '新闻内容不能为空' })
  }

  const userContent = `请分析以下新闻/公告对A股短线走势的影响：\n\n${content}`
  const text = await callMiniMax(newsSystemPrompt, userContent)
  return res.status(200).json({ text, type: 'news' })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type } = req.body
  if (!type) return res.status(400).json({ error: '缺少分析类型' })

  try {
    if (type === 'recommend') return handleRecommend(req, res)
    else if (type === 'holding') return handleHolding(req, res)
    else if (type === 'news') return handleNews(req, res)
    else return res.status(400).json({ error: '不支持的分析类型' })
  } catch (err) {
    res.status(500).json({ error: '分析失败，请稍后重试' })
  }
}
