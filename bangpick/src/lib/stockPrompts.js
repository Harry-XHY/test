// Stock assistant frontend config: features, examples, intent detection

export const SECTORS = ['AI算力', '消费复苏', '新能源', '军工', '半导体', '医药生物']

export const STOCK_FEATURES = [
  {
    key: 'recommend',
    title: '选股推荐',
    desc: '技术面+基本面筛选短线机会',
    icon: 'trending_up',
    color: 'var(--primary)',
    fill: '推荐今日短线机会',
  },
  {
    key: 'holding',
    title: '持仓诊断',
    desc: '输入持仓代码+成本，获取操作建议',
    icon: 'monitoring',
    color: 'var(--secondary)',
    fill: null,
  },
  {
    key: 'news',
    title: '消息解读',
    desc: '粘贴新闻，判断利好利空',
    icon: 'newspaper',
    color: 'var(--green)',
    fill: null,
  },
]

export const STOCK_EXAMPLES = [
  { text: 'AI算力板块有什么短线机会？', icon: 'bolt' },
  { text: '帮我看看000001，成本15.5元', icon: 'search' },
  { text: '央行降准对A股有什么影响？', icon: 'article' },
  { text: '半导体板块今天值得关注吗？', icon: 'memory' },
]

// Detect user intent from free text input
export function detectIntent(text) {
  const t = text.trim()

  // 1. Check for holding pattern: code or name + price
  const holdingMatch = parseHoldingFromText(t)
  if ((holdingMatch.code || holdingMatch.name) && holdingMatch.costPrice) {
    return { type: 'holding', ...holdingMatch }
  }

  // 2. Check for sector mention → recommend
  for (const sector of SECTORS) {
    if (t.includes(sector)) {
      return { type: 'recommend', sector, query: t }
    }
  }

  // 3. Check for recommend keywords
  const recommendKeywords = ['推荐', '选股', '潜力', '机会', '热点', '板块', '龙头', '短线']
  if (recommendKeywords.some(kw => t.includes(kw))) {
    return { type: 'recommend', sector: null, query: t }
  }

  // 4. Check for news pattern: long text or news keywords
  const newsKeywords = ['新闻', '公告', '消息', '政策', '央行', '降准', '降息', '利好', '利空', '减持', '增持', '解禁', '财报', '业绩']
  if (t.length > 50 || newsKeywords.some(kw => t.includes(kw))) {
    return { type: 'news', content: t }
  }

  // 5. If contains a stock code but no cost → ask for cost
  if (holdingMatch.code) {
    return { type: 'holding_need_cost', ...holdingMatch }
  }

  // 6. Default: recommend with the text as query
  return { type: 'recommend', sector: null, query: t }
}

// Parse stock code and cost price from natural language
export function parseHoldingFromText(text) {
  const result = { code: null, name: null, costPrice: null }

  // Match 6-digit stock code
  const codeMatch = text.match(/\b(\d{6})\b/)
  if (codeMatch) {
    result.code = codeMatch[1]
  }

  // Match stock name: 2-4 Chinese chars followed by common suffixes
  if (!result.code) {
    const nameMatch = text.match(/([\u4e00-\u9fff]{2,6}(?:股份|集团|科技|电子|医药|能源|银行|证券|保险|汽车|电力|通信|光电|材料|化工|环保|生物|机械|航天|航空|软件|信息|智能|半导|新材))/)
    if (nameMatch) {
      result.name = nameMatch[1]
    }
    // Also match "看看XXX" pattern where XXX is 2-4 Chinese chars
    if (!result.name) {
      const lookMatch = text.match(/看[看]?\s*([\u4e00-\u9fff]{2,6})[，,\s]/)
      if (lookMatch) {
        result.name = lookMatch[1]
      }
    }
  }

  const costPatterns = [
    /成本[价]?\s*(\d+\.?\d*)/,
    /买入[价]?\s*(\d+\.?\d*)/,
    /均价\s*(\d+\.?\d*)/,
    /(\d+\.?\d*)\s*元/,
  ]

  for (const pattern of costPatterns) {
    const m = text.match(pattern)
    if (m) {
      const price = parseFloat(m[1])
      if (price > 0 && price < 10000) {
        result.costPrice = price
        break
      }
    }
  }

  return result
}
