import StockDataCard from './StockDataCard'

const RISK_FOOTER = '⚠️ 股市有风险，短线交易波动大，建议仓位不超过总资金的30%，严格执行止损止盈纪律。'

// Parse holding verdict from AI text: first bold word
function parseVerdict(text) {
  const m = text.match(/\*\*(继续持有|加仓|减仓|清仓)\*\*/)
  return m ? m[1] : null
}

// Parse news verdict from AI text
function parseNewsVerdict(text) {
  const judgmentMatch = text.match(/判断[：:]\s*(利好|利空|中性)/)
  const impactMatch = text.match(/影响程度[：:]\s*(短期显著影响|短期轻微影响|无实质影响)/)
  return {
    judgment: judgmentMatch?.[1] || null,
    impact: impactMatch?.[1] || null,
  }
}

const VERDICT_STYLES = {
  '继续持有': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
  '加仓':     { bg: 'rgba(124,152,255,0.15)', border: 'rgba(124,152,255,0.3)', color: '#7c98ff' },
  '减仓':     { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
  '清仓':     { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
}

const NEWS_STYLES = {
  '利好': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
  '利空': { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
  '中性': { bg: 'rgba(168,171,179,0.15)', border: 'rgba(168,171,179,0.3)', color: '#a8abb3' },
}

function VerdictBadge({ text, styles }) {
  if (!text || !styles[text]) return null
  const s = styles[text]
  return (
    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
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

// Render holding analysis message
function HoldingMessage({ message }) {
  const verdict = parseVerdict(message.text || '')
  const stockData = message.stockData

  return (
    <div className="flex flex-col gap-3">
      {verdict && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#a8abb3' }}>操作建议</span>
          <VerdictBadge text={verdict} styles={VERDICT_STYLES} />
        </div>
      )}
      {stockData && !stockData.error && !stockData.suspended && (
        <StockDataCard data={stockData} compact />
      )}
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#f1f3fc' }}>
        {message.text}
      </div>
      <RiskFooter />
    </div>
  )
}

// Render recommend message
function RecommendMessage({ message }) {
  const stockData = message.stockData // array of top stocks

  return (
    <div className="flex flex-col gap-3">
      {Array.isArray(stockData) && stockData.length > 0 && (
        <div className="flex flex-col gap-2">
          {stockData.map(s => (
            <StockDataCard key={s.code} data={s} compact />
          ))}
        </div>
      )}
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#f1f3fc' }}>
        {message.text}
      </div>
      <RiskFooter />
    </div>
  )
}

// Render news verdict message
function NewsMessage({ message }) {
  const { judgment, impact } = parseNewsVerdict(message.text || '')

  return (
    <div className="flex flex-col gap-3">
      {(judgment || impact) && (
        <div className="flex items-center gap-2 flex-wrap">
          {judgment && <VerdictBadge text={judgment} styles={NEWS_STYLES} />}
          {impact && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#a8abb3' }}>
              {impact}
            </span>
          )}
        </div>
      )}
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#f1f3fc' }}>
        {message.text}
      </div>
      <RiskFooter />
    </div>
  )
}

// Main message bubble component
export default function StockMessageBubble({ message }) {
  if (!message) return null

  // No opportunity special case
  if (message.type === 'no_opportunity') {
    return (
      <div className="glass-card rounded-2xl p-4">
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
      <div className="glass-card rounded-2xl p-4">
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
      <div className="glass-card rounded-2xl p-4">
        <div className="text-sm" style={{ color: '#fbbf24' }}>
          <span className="material-symbols-outlined text-sm align-middle mr-1">pause_circle</span>
          {message.name || '该股票'}当前停牌中，暂无交易数据
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      {message.type === 'holding' && <HoldingMessage message={message} />}
      {message.type === 'recommend' && <RecommendMessage message={message} />}
      {message.type === 'news' && <NewsMessage message={message} />}
      {!message.type && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#f1f3fc' }}>
          {message.text}
        </div>
      )}
    </div>
  )
}
