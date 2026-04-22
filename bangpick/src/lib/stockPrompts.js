// Stock assistant frontend config: features, examples, intent detection

export const SECTORS = ['AI算力', '消费复苏', '新能源', '军工', '半导体', '医药生物']

export const SECTOR_I18N_MAP = {
  'AI算力': 'sectors.ai',
  '消费复苏': 'sectors.consumer',
  '新能源': 'sectors.energy',
  '军工': 'sectors.military',
  '半导体': 'sectors.semiconductor',
  '医药生物': 'sectors.pharma',
}

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
    key: 'double_golden',
    title: '推荐双金叉',
    desc: 'MACD金叉+均线金叉短线机会',
    icon: 'auto_graph',
    color: 'var(--green)',
    fill: null,
  },
]

export const STOCK_EXAMPLES = [
  { key: 'example_0', icon: 'bolt' },
  { key: 'example_1', icon: 'search' },
  { key: 'example_2', icon: 'speed' },
  { key: 'example_3', icon: 'memory' },
]

// Detect user intent from free text input
export function detectIntent(text) {
  const t = text.trim()

  // 0. Reject unrealistic demands
  const unrealisticKeywords = ['保证赚', '100%', '稳赚', '必涨', '帮我满仓', '全仓买入', '加杠杆', '融资融券']
  if (unrealisticKeywords.some(kw => t.includes(kw))) {
    return { type: 'reject_unrealistic' }
  }

  // 0.5. Reject out-of-scope requests
  const outOfScopeKeywords = ['港股', '美股', '期货', '外汇', '比特币', '加密货币', '基金定投', '长线', '价值投资', '十年']
  if (outOfScopeKeywords.some(kw => t.includes(kw))) {
    return { type: 'out_of_scope' }
  }

  // 1. Check for holding pattern: code or name + price
  const holdingMatch = parseHoldingFromText(t)
  if ((holdingMatch.code || holdingMatch.name) && holdingMatch.costPrice) {
    return { type: 'holding', ...holdingMatch }
  }

  // 2. Check for news/announcement interpretation (long text or news keywords)
  const newsKeywords = ['公告', '新闻', '消息', '政策', '利好', '利空', '解禁', '减持', '增持', '回购', '重组', '并购', '中标', '财报', '业绩预告', '监管']
  const isLongText = t.length > 50
  const hasNewsKeyword = newsKeywords.some(kw => t.includes(kw))
  if (isLongText && hasNewsKeyword) {
    return { type: 'news', content: t }
  }

  // 3. Check for market diagnosis pattern
  const marketKeywords = ['大盘', '市场', '行情', '今天怎么样', '适合交易', '能不能买', '今日走势', '整体', '指数']
  if (marketKeywords.some(kw => t.includes(kw))) {
    return { type: 'market' }
  }

  // 4. Check for sector mention → recommend
  for (const sector of SECTORS) {
    if (t.includes(sector)) {
      return { type: 'recommend', sector, query: t }
    }
  }

  // 5. Check for recommend keywords
  const recommendKeywords = ['推荐', '选股', '潜力', '机会', '热点', '龙头', '短线', '板块']
  if (recommendKeywords.some(kw => t.includes(kw))) {
    return { type: 'recommend', sector: null, query: t }
  }

  // 6. If contains a stock code or name but no cost → auto-analyze
  if (holdingMatch.code || holdingMatch.name) {
    return { type: 'holding_need_cost', ...holdingMatch }
  }

  // 7. Check if stock-related at all → route to QA
  const stockRelated = ['股', '涨', '跌', '买', '卖', '仓', '选', '盘', '板块', '概念', '题材', '龙头', '热点', '机会', '趋势', '均线', 'MACD', 'K线', '止损', '止盈', '开盘', '收盘', '交易', '炒股']
  if (stockRelated.some(kw => t.includes(kw))) {
    return { type: 'qa', query: t }
  }

  // 8. News-like content (long text without specific keywords)
  if (isLongText) {
    return { type: 'news', content: t }
  }

  // 9. Off-topic
  return { type: 'off_topic' }
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
    // First strip common verb prefixes, then extract the stock name
    const prefixes = /^(?:帮我|帮忙|请|麻烦)?(?:看一?下?|看看|分析一?下?|查一?下?|查查|了解一?下?|搜一?下?|搜搜|问一?下?|说一?下?|讲一?下?)\s*/
    const stripped = text.replace(prefixes, '')
    const lookPatterns = [
      // After prefix stripping: "复星医药" or "复星医药怎么样"
      new RegExp(`^([\\u4e00-\\u9fff]{2,8})(?:怎么样|如何|好不好|能买吗|可以买吗|走势|行情|$)`),
    ]
    // Also try on original text for "XXX怎么样" without prefix
    lookPatterns.push(/^([\u4e00-\u9fff]{2,8})(?:怎么样|如何|好不好|能买吗|可以买吗|走势|行情)/)
    // Common non-stock words that should not be treated as stock names
    const nonStockWords = ['今天', '明天', '昨天', '天气', '什么', '为什么', '哪里', '哪个', '这个', '那个', '现在', '以后', '最近', '大家', '我们', '你们', '怎样', '如何', '可以', '能不能', '应该', '需要']
    // Try stripped text first
    for (const p of lookPatterns) {
      const m = stripped.match(p)
      if (m && m[1].length >= 2) {
        // Reject if matched name contains common non-stock words
        if (nonStockWords.some(w => m[1].includes(w))) continue
        result.name = m[1]
        break
      }
    }
    // Fallback: match suffix-based stock names (避免吃掉前缀动词)
    if (!result.name) {
      const nameMatch = text.match(/(?:^|[^\u4e00-\u9fff])([\u4e00-\u9fff]{2,4}(?:股份|集团|科技|电子|医药|能源|银行|证券|保险|汽车|电力|通信|光电|材料|化工|环保|生物|机械|航天|航空|软件|信息|智能|半导|新材))/)
      if (nameMatch) {
        result.name = nameMatch[1]
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
