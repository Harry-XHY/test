import StockDataCard from './StockDataCard'

const RISK_FOOTER = '⚠️ 股市有风险，短线交易波动大，建议仓位不超过总资金的30%，严格执行止损止盈纪律。'

// Parse holding verdict from AI text: first bold word
function parseVerdict(text) {
  const m = text.match(/\*\*(继续持有|加仓|减仓|清仓|可以买入|暂不建议买入)\*\*/)
  return m ? m[1] : null
}

// Parse market verdict from AI text
function parseMarketVerdict(text) {
  const m = text.match(/\*\*(适合交易|谨慎交易|建议观望|远离市场)\*\*/)
  return m ? m[1] : null
}

const VERDICT_STYLES = {
  '继续持有':     { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', icon: 'check_circle' },
  '加仓':         { bg: 'rgba(124,152,255,0.15)', border: 'rgba(124,152,255,0.3)', color: '#7c98ff', icon: 'add_circle' },
  '减仓':         { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', icon: 'remove_circle' },
  '清仓':         { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171', icon: 'cancel' },
  '可以买入':     { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', icon: 'shopping_cart' },
  '暂不建议买入': { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171', icon: 'block' },
}

const MARKET_STYLES = {
  '适合交易': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', icon: 'rocket_launch' },
  '谨慎交易': { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', icon: 'warning' },
  '建议观望': { bg: 'rgba(168,171,179,0.15)', border: 'rgba(168,171,179,0.3)', color: '#a8abb3', icon: 'visibility' },
  '远离市场': { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171', icon: 'dangerous' },
}

function VerdictBadge({ text, styles }) {
  if (!text || !styles[text]) return null
  const s = styles[text]
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
      {text}
    </span>
  )
}

function RiskFooter() {
  return (
    <div className="mt-3 pt-2 text-xs leading-relaxed" style={{ color: '#72757d', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {RISK_FOOTER}
    </div>
  )
}

// Inline streaming indicator — shows between stock cards and AI text
function StreamingDots() {
  return (
    <div className="flex items-center gap-2 py-2 stock-fade-in">
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span className="text-xs" style={{ color: 'var(--primary)', opacity: 0.7 }}>AI 正在分析中…</span>
    </div>
  )
}

// Simple markdown-like rendering: **bold**, headers, tables
function RichText({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let tableRows = []
  let inTable = false

  function flushTable() {
    if (tableRows.length === 0) return
    const headerRow = tableRows[0]
    const dataRows = tableRows.slice(2) // skip separator row
    // Mobile-friendly: render each data row as a stacked card instead of horizontal table
    elements.push(
      <div key={`table-${elements.length}`} className="flex flex-col gap-3 my-2 stock-fade-in" style={{ animationDelay: '100ms' }}>
        {dataRows.map((row, i) => (
          <div key={i} className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {row.map((cell, j) => {
              if (!cell || !cell.trim()) return null
              const header = headerRow[j]
              // First column (stock name) renders as title
              if (j === 0) {
                return (
                  <div key={j} className="text-sm font-bold pb-1 mb-1" style={{ color: '#f1f3fc', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {renderInline(cell)}
                  </div>
                )
              }
              return (
                <div key={j} className="flex flex-col gap-0.5">
                  <div className="text-[10px] font-semibold" style={{ color: '#b6a0ff' }}>
                    {renderInline(header || '')}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>
                    {renderInline(cell)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
    tableRows = []
    inTable = false
  }

  function renderInline(str) {
    // Handle **bold**
    const parts = str.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#f1f3fc' }}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Table row detection
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean)
      // Separator row detection
      if (cells.every(c => /^[-:]+$/.test(c))) {
        tableRows.push(cells)
        inTable = true
        continue
      }
      tableRows.push(cells)
      inTable = true
      continue
    }

    if (inTable) flushTable()

    // Emoji section headers (📊, 🔥, 🎯, ⚠️, 💡, 📈, ❄️, 📰)
    const emojiHeaderMatch = line.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]+)\s*\*\*(.+?)\*\*/u)
    if (emojiHeaderMatch) {
      elements.push(
        <div key={i} className="flex items-center gap-1.5 mt-3 mb-1 stock-fade-in">
          <span className="text-sm">{emojiHeaderMatch[1]}</span>
          <span className="text-sm font-bold" style={{ color: '#f1f3fc' }}>{emojiHeaderMatch[2]}</span>
        </div>
      )
      // Render rest of line after the header if any
      const rest = line.replace(emojiHeaderMatch[0], '').trim()
      if (rest) {
        elements.push(<div key={`${i}-rest`} className="text-sm" style={{ color: '#d1d5db' }}>{renderInline(rest)}</div>)
      }
      continue
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-[13px] font-bold mt-4 mb-1 pt-2" style={{ color: '#b6a0ff', borderTop: '1px solid rgba(182,160,255,0.12)' }}>{renderInline(line.slice(4))}</h4>)
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-[15px] font-bold mt-3 mb-1" style={{ color: '#f1f3fc' }}>{renderInline(line.slice(3))}</h3>)
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-base font-bold mt-3 mb-1" style={{ color: '#f1f3fc' }}>{renderInline(line.slice(2))}</h2>)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="my-3" style={{ borderColor: 'rgba(182,160,255,0.1)' }} />)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 pl-1">
          <span style={{ color: 'var(--primary)' }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)[1]
      elements.push(
        <div key={i} className="flex gap-2 pl-1">
          <span className="font-semibold" style={{ color: 'var(--primary)', minWidth: '1.2em' }}>{num}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(<div key={i}>{renderInline(line)}</div>)
    }
  }

  if (inTable) flushTable()

  return <div className="flex flex-col gap-0.5">{elements}</div>
}

// Render holding analysis message
function HoldingMessage({ message, streaming }) {
  const verdict = parseVerdict(message.text || '')
  const stockData = message.stockData

  return (
    <div className="flex flex-col gap-3">
      {verdict && (
        <div className="flex items-center gap-2 stock-fade-in">
          <span className="text-xs" style={{ color: '#a8abb3' }}>操作建议</span>
          <VerdictBadge text={verdict} styles={VERDICT_STYLES} />
        </div>
      )}
      {stockData && !stockData.error && !stockData.suspended && (
        <div className="stock-fade-in">
          <StockDataCard data={stockData} compact />
        </div>
      )}
      {message.text && (
        <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
          <RichText text={message.text} />
        </div>
      )}
      {streaming && <StreamingDots />}
      {/* Risk footer now included in AI output */}
    </div>
  )
}

// Render recommend message
function RecommendMessage({ message, streaming }) {
  return (
    <div className="flex flex-col gap-3">
      {message.text && (
        <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
          <RichText text={message.text} />
        </div>
      )}
      {streaming && <StreamingDots />}
      {/* Risk footer now included in AI output */}
    </div>
  )
}

// Render market diagnosis message
function MarketMessage({ message, streaming }) {
  const verdict = parseMarketVerdict(message.text || '')
  const indices = message.indices
  const sectors = message.sectors

  return (
    <div className="flex flex-col gap-3">
      {verdict && (
        <div className="flex items-center gap-2 stock-fade-in">
          <span className="text-xs" style={{ color: '#a8abb3' }}>今日判断</span>
          <VerdictBadge text={verdict} styles={MARKET_STYLES} />
        </div>
      )}
      {/* Index cards */}
      {Array.isArray(indices) && indices.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar stock-fade-in">
          {indices.map((idx, i) => (
            <div key={i} className="flex-shrink-0 px-3 py-2 rounded-xl text-xs" style={{
              background: idx.change >= 0 ? 'rgba(248,113,113,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${idx.change >= 0 ? 'rgba(248,113,113,0.2)' : 'rgba(34,197,94,0.2)'}`,
            }}>
              <div className="font-medium mb-0.5" style={{ color: '#f1f3fc' }}>{idx.name}</div>
              <div style={{ color: idx.change >= 0 ? '#f87171' : '#22c55e' }}>
                {idx.close} <span className="ml-1">{idx.change > 0 ? '+' : ''}{idx.change}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Sector heat bar */}
      {Array.isArray(sectors) && sectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 stock-fade-in" style={{ animationDelay: '80ms' }}>
          {sectors.map(s => (
            <span key={s.sector} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{
                background: s.avgChange >= 1 ? 'rgba(248,113,113,0.12)' : s.avgChange <= -1 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                color: s.avgChange >= 1 ? '#f87171' : s.avgChange <= -1 ? '#22c55e' : '#a8abb3',
              }}>
              {s.sector}
              <span className="font-medium">{s.avgChange > 0 ? '+' : ''}{s.avgChange}%</span>
            </span>
          ))}
        </div>
      )}
      {message.text && (
        <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
          <RichText text={message.text} />
        </div>
      )}
      {streaming && <StreamingDots />}
      {/* Risk footer now included in AI output */}
    </div>
  )
}

// Parse news verdict from AI text
function parseNewsVerdict(text) {
  const m = text.match(/\*\*(利好|利空|中性)\*\*/)
  return m ? m[1] : null
}

// Parse news impact from AI text
function parseNewsImpact(text) {
  const m = text.match(/\*\*(短期有实质影响|无实质影响)\*\*/)
  return m ? m[1] : null
}

const NEWS_STYLES = {
  '利好': { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171', icon: 'trending_up' },
  '利空': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', icon: 'trending_down' },
  '中性': { bg: 'rgba(168,171,179,0.15)', border: 'rgba(168,171,179,0.3)', color: '#a8abb3', icon: 'horizontal_rule' },
}

const IMPACT_STYLES = {
  '短期有实质影响': { color: '#fbbf24', icon: 'priority_high' },
  '无实质影响': { color: '#72757d', icon: 'remove' },
}

// Render news interpretation message
function NewsMessage({ message, streaming }) {
  const verdict = parseNewsVerdict(message.text || '')
  const impact = parseNewsImpact(message.text || '')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap stock-fade-in">
        {verdict && (
          <>
            <span className="text-xs" style={{ color: '#a8abb3' }}>消息判断</span>
            <VerdictBadge text={verdict} styles={NEWS_STYLES} />
          </>
        )}
        {impact && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: IMPACT_STYLES[impact]?.color || '#a8abb3' }}>
            <span className="material-symbols-outlined text-xs">{IMPACT_STYLES[impact]?.icon || 'info'}</span>
            {impact}
          </span>
        )}
      </div>
      {message.text && (
        <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
          <RichText text={message.text} />
        </div>
      )}
      {streaming && <StreamingDots />}
      {/* Risk footer now included in AI output */}
    </div>
  )
}

// Render QA message
function QAMessage({ message, streaming }) {
  return (
    <div className="flex flex-col gap-3">
      {message.text && (
        <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
          <RichText text={message.text} />
        </div>
      )}
      {streaming && <StreamingDots />}
      {/* Risk footer now included in AI output */}
    </div>
  )
}

// Main message bubble component
export default function StockMessageBubble({ message, streaming }) {
  if (!message) return null

  // No opportunity special case
  if (message.type === 'no_opportunity') {
    return (
      <div className="glass-card rounded-2xl p-4 stock-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-base" style={{ color: '#fbbf24' }}>info</span>
          <span className="text-sm font-medium" style={{ color: '#fbbf24' }}>暂无机会</span>
        </div>
        <div className="text-sm leading-relaxed" style={{ color: '#a8abb3' }}>
          {message.text || message.message}
        </div>
      </div>
    )
  }

  // Error case
  if (message.error) {
    return (
      <div className="glass-card rounded-2xl p-4 stock-fade-in">
        <div className="text-sm" style={{ color: '#f87171' }}>
          <span className="material-symbols-outlined text-sm align-middle mr-1">error</span>
          {message.text || '分析失败，请稍后重试'}
        </div>
      </div>
    )
  }

  // Suspended stock
  if (message.suspended) {
    return (
      <div className="glass-card rounded-2xl p-4 stock-fade-in">
        <div className="text-sm" style={{ color: '#fbbf24' }}>
          <span className="material-symbols-outlined text-sm align-middle mr-1">pause_circle</span>
          {message.name || '该股票'}当前停牌中，暂无交易数据
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      {message.type === 'holding' && <HoldingMessage message={message} streaming={streaming} />}
      {message.type === 'recommend' && <RecommendMessage message={message} streaming={streaming} />}
      {message.type === 'market' && <MarketMessage message={message} streaming={streaming} />}
      {message.type === 'news' && <NewsMessage message={message} streaming={streaming} />}
      {message.type === 'qa' && <QAMessage message={message} streaming={streaming} />}
      {!message.type && (
        <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
          <RichText text={message.text} />
        </div>
      )}
    </div>
  )
}
