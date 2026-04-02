import { useState, useRef, useEffect } from 'react'
import ChatInput from '../components/ChatInput'
import StockMessageBubble from '../components/StockChat'
import StockSearch from '../components/StockSearch'
import SectorChips from '../components/SectorChips'
import BottomNav from '../components/BottomNav'
import { analyzeStock, searchStock } from '../lib/stockApi'
import { getHoldings, addHolding } from '../lib/stockStorage'
import { STOCK_FEATURES, STOCK_EXAMPLES, SECTORS, detectIntent } from '../lib/stockPrompts'
import { getStockChat, saveStockChat, clearStockChat } from '../lib/stockStorage'

const FEATURE_COLORS = {
  recommend: 'var(--primary)',
  holding: 'var(--secondary)',
  news: 'var(--green)',
}

/* ===== Landing View ===== */
function StockLandingView({ onFill, onStartHolding, onStartNews }) {
  const holdings = getHoldings()

  return (
    <div>
      {/* Hero */}
      <section className="mb-10">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
          短线炒股，<br />
          <span className="text-gradient">问我就对了 📈</span>
        </h2>
        <p className="text-[var(--text-secondary)] text-base font-medium max-w-lg opacity-80">
          基于真实行情数据，为纯小白提供短线选股、持仓诊断、消息解读。
        </p>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mt-3"
          style={{ background: 'rgba(248,161,113,0.1)', border: '1px solid rgba(248,161,113,0.25)', color: '#f8a171' }}
        >
          <span>⚠️</span>
          <span>数据仅供参考，不构成投资建议</span>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 px-1">Core Features</h4>
          <div className="h-[1px] flex-grow mx-4 bg-[var(--muted-2)]/30" />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {STOCK_FEATURES.map(f => {
            const color = FEATURE_COLORS[f.key] || 'var(--primary)'
            return (
              <button
                key={f.key}
                onClick={() => {
                  if (f.key === 'holding') onStartHolding()
                  else if (f.key === 'news') onStartNews()
                  else if (f.fill) onFill(f.fill)
                }}
                className="glass-card p-5 rounded-2xl text-left cursor-pointer active:scale-[0.98] transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-15 -translate-y-1/2 translate-x-1/3 transition-opacity group-hover:opacity-30" style={{ background: color }} />
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <span className="material-symbols-outlined text-2xl" style={{ color }}>{f.icon}</span>
                  </div>
                  <div>
                    <h5 className="text-[15px] font-bold text-[var(--text)] mb-0.5">{f.title}</h5>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* My Holdings */}
      {holdings.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 px-1">My Holdings</h4>
            <div className="h-[1px] flex-grow mx-4 bg-[var(--muted-2)]/30" />
          </div>
          <div className="flex flex-wrap gap-2">
            {holdings.map(h => (
              <button
                key={h.code}
                onClick={() => onFill(`帮我看看${h.code} ${h.name}，成本${h.costPrice}元`)}
                className="glass-card px-3 py-2 rounded-xl text-sm active:scale-[0.96] transition-all flex items-center gap-2"
              >
                <span className="font-medium" style={{ color: '#f1f3fc' }}>{h.name}</span>
                <span className="text-xs" style={{ color: '#b6a0ff' }}>{h.code}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Try asking me */}
      <section className="mb-20">
        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]/60 mb-5 px-1">Try asking me</h4>
        <div className="space-y-3">
          {STOCK_EXAMPLES.map(ex => (
            <button key={ex.text} onClick={() => onFill(ex.text)}
              className="w-full text-left p-4 bg-[#0f141a] hover:bg-[#1b2028] rounded-2xl flex items-center justify-between group transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--muted-2)]">{ex.icon}</span>
                <span className="text-[var(--text)] font-medium text-sm">"{ex.text}"</span>
              </div>
              <span className="material-symbols-outlined text-[var(--muted-2)] group-hover:text-[var(--primary)] transition-colors">arrow_outward</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ===== Chat View ===== */
function StockChatView({ messages, loading, onRetry, onSend, bottomRef }) {
  return (
    <div className="space-y-4 pt-1">
      {messages.map((msg, i) => (
        <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
          {msg.role === 'user' && (
            <div className="max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 text-white"
              style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)' }}>
              <p className="m-0 text-sm">{msg.content}</p>
            </div>
          )}
          {msg.role === 'assistant' && msg.error && (
            <div className="max-w-[85%] glass-card rounded-[20px] rounded-bl-md px-4 py-3">
              <p className="text-red-400 text-sm">{msg.content}</p>
              <button onClick={() => onRetry(msg)} className="mt-2 text-xs text-[var(--primary)] font-medium">
                🔄 重新发送
              </button>
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && msg.showSearch && (
            <div className="max-w-[90%]">
              <div className="glass-card rounded-[20px] rounded-bl-md p-4">
                <p className="text-sm mb-3" style={{ color: '#a8abb3' }}>{msg.content}</p>
                <StockSearch compact onSend={onSend} />
              </div>
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && !msg.showSearch && msg.showSectorPicker && (
            <div className="max-w-[90%]">
              <div className="glass-card rounded-[20px] rounded-bl-md p-4">
                <p className="text-sm mb-3" style={{ color: '#a8abb3' }}>{msg.content}</p>
                <SectorChips selected={null} onSelect={(sector) => onSend(`${sector}板块有什么短线机会？`)} />
              </div>
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && !msg.showSearch && !msg.showSectorPicker && msg.apiResponse && (
            <div className="max-w-[90%]">
              <StockMessageBubble message={msg.apiResponse} />
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && !msg.showSearch && !msg.showSectorPicker && !msg.apiResponse && msg.content && (
            <div className="max-w-[85%] glass-card rounded-[20px] rounded-bl-md px-4 py-3">
              <p className="text-sm" style={{ color: '#f1f3fc' }}>{msg.content}</p>
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="glass-card rounded-[20px] rounded-bl-md px-4 py-3 flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="text-[var(--muted)] text-sm">分析中</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

/* ===== Main Page ===== */
export default function StockPage() {
  const [messages, setMessages] = useState(() => getStockChat())
  const [loading, setLoading] = useState(false)
  const [appHeight, setAppHeight] = useState('100%')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Persist chat
  useEffect(() => {
    if (messages.length > 0) {
      // Filter out messages with function references before saving
      const serializable = messages.map(m => {
        const { onSend, ...rest } = m
        return rest
      })
      saveStockChat(serializable)
    }
  }, [messages])

  // Visual viewport for mobile keyboard
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function updateHeight() {
      setAppHeight(`${vv.height}px`)
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
    }
    updateHeight()
    vv.addEventListener('resize', updateHeight)
    return () => vv.removeEventListener('resize', updateHeight)
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const intent = detectIntent(trimmed)

    try {
      if (intent.type === 'holding_need_cost') {
        // Need cost price — show inline StockSearch
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `检测到股票代码 ${intent.code}，请搜索确认并输入你的成本价：`,
          showSearch: true,
          // onSend now passed directly via StockChatView prop
        }])
        setLoading(false)
        return
      }

      if (intent.type === 'recommend' && !intent.sector) {
        // No sector specified — show sector picker then proceed with query
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '请选择你想分析的板块：',
          showSectorPicker: true,
          // onSend now passed directly via StockChatView prop
        }])
        setLoading(false)
        return
      }

      let payload
      if (intent.type === 'holding') {
        let { code, name, costPrice } = intent
        let market = code ? (code.startsWith('6') ? 1 : 0) : 0

        // If we have name but no code, search for it
        if (!code && name) {
          const results = await searchStock(name)
          if (results.length > 0) {
            const match = results[0]
            code = match.code
            name = match.name
            market = match.market
          }
        }

        if (!code) {
          // Still no code — pass the raw text to AI for best-effort analysis
          payload = { type: 'holding', code: name || trimmed, market: 0, name: name || trimmed, costPrice }
        } else {
          payload = { type: 'holding', code, market, name: name || code, costPrice }
          addHolding({ code, name: name || code, market, costPrice })
        }
      } else if (intent.type === 'news') {
        payload = { type: 'news', content: intent.content || trimmed }
      } else {
        // recommend
        payload = { type: 'recommend', sector: intent.sector || 'AI算力', query: intent.query || trimmed }
      }

      const result = await analyzeStock(payload)

      setMessages(prev => [...prev, {
        role: 'assistant',
        apiResponse: result,
        content: result.text || result.message || '',
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message || '分析失败，请稍后重试',
        error: true,
        _retryText: trimmed,
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleRetry(errorMsg) {
    setMessages(prev => prev.filter(m => m !== errorMsg))
    handleSend(errorMsg._retryText)
  }

  function handleFill(text) {
    inputRef.current?.fill(text)
  }

  function handleClear() {
    setMessages([])
    clearStockChat()
  }

  function handleStartHolding() {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '请搜索你持有的股票，输入成本价后我来帮你诊断：',
      showSearch: true,
      // onSend now passed directly via StockChatView prop
    }])
  }

  function handleStartNews() {
    inputRef.current?.fill('')
    // Focus input with placeholder hint
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '请在下方输入框粘贴新闻或公告内容，我来帮你判断利好利空。',
    }])
  }

  const inChat = messages.length > 0

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14] pb-20" style={{ height: appHeight }}>
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>candlestick_chart</span>
            <h1 className="text-xl font-black tracking-tighter text-[var(--primary)]" style={{ filter: 'drop-shadow(0 0 15px rgba(182,160,255,0.3))' }}>炒股助手</h1>
          </div>
          <div className="flex items-center gap-3">
            {inChat && (
              <button
                onClick={handleClear}
                className="w-8 h-8 rounded-full grid place-items-center text-[var(--muted)] text-sm hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto max-w-xl mx-auto w-full px-6 pt-8 pb-4">
        {!inChat ? (
          <StockLandingView onFill={handleFill} onStartHolding={handleStartHolding} onStartNews={handleStartNews} />
        ) : (
          <StockChatView messages={messages} loading={loading} onRetry={handleRetry} onSend={handleSend} bottomRef={bottomRef} />
        )}
      </main>

      {/* Input */}
      <ChatInput ref={inputRef} onSend={handleSend} disabled={loading} />

      {/* Decorative blur orbs */}
      {!inChat && (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--secondary)]/10 rounded-full blur-[150px] pointer-events-none -z-10" />
        </>
      )}

      <BottomNav />
    </div>
  )
}
