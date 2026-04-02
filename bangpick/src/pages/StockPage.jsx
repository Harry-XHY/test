import { useState, useRef, useEffect, useCallback } from 'react'
import ChatInput from '../components/ChatInput'
import StockMessageBubble from '../components/StockChat'
import StockSearch from '../components/StockSearch'
import SectorChips from '../components/SectorChips'
import BottomNav from '../components/BottomNav'
import { analyzeStockStream, searchStock } from '../lib/stockApi'
import { getHoldings, addHolding, removeHolding } from '../lib/stockStorage'
import { STOCK_FEATURES, STOCK_EXAMPLES, SECTORS, detectIntent } from '../lib/stockPrompts'
import { getStockChat, saveStockChat, clearStockChat } from '../lib/stockStorage'

const FEATURE_COLORS = {
  recommend: 'var(--primary)',
  holding: 'var(--secondary)',
  market: 'var(--green)',
}

/* ===== Landing View ===== */
function StockLandingView({ onFill, onStartHolding, onStartRecommend, holdings, setHoldings }) {
  const [hotSectors, setHotSectors] = useState([])

  useEffect(() => {
    fetch('/api/stock-hot-sectors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHotSectors(data) })
      .catch(() => {})
  }, [])

  // Build dynamic examples from hot sectors
  const dynamicExamples = hotSectors.length > 0
    ? [
        ...hotSectors.slice(0, 4).map(s => ({
          text: `${s.sector}板块有什么短线机会？`,
          icon: 'local_fire_department',
          tag: `${s.avgChange > 0 ? '+' : ''}${s.avgChange}%`,
          hot: s.avgChange >= 2,
        })),
      ]
    : STOCK_EXAMPLES

  return (
    <div>
      {/* Hero — compact, centered feel */}
      <section className="mb-8 text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium mb-4"
          style={{ background: 'rgba(182,160,255,0.08)', border: '1px solid rgba(182,160,255,0.15)', color: '#b6a0ff' }}>
          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          基于实时行情数据
        </div>
        <h2 className="text-[28px] font-extrabold tracking-tight mb-2 leading-[1.2]">
          短线交易<span className="text-gradient">智能助手</span>
        </h2>
        <p className="text-[13px] leading-relaxed max-w-xs mx-auto" style={{ color: '#72757d' }}>
          选股推荐 · 持仓诊断 · 大盘风向<br />
          <span style={{ color: '#f8a171', fontSize: '11px' }}>数据仅供参考，不构成投资建议</span>
        </p>
      </section>

      {/* Feature Cards — horizontal scroll on mobile, grid on wider */}
      <section className="mb-8">
        <div className="grid grid-cols-3 gap-2">
          {STOCK_FEATURES.map(f => {
            const color = FEATURE_COLORS[f.key] || 'var(--primary)'
            return (
              <button
                key={f.key}
                onClick={() => {
                  if (f.key === 'holding') onStartHolding()
                  else if (f.key === 'market') onFill(f.fill)
                  else if (f.key === 'recommend') onStartRecommend()
                  else if (f.fill) onFill(f.fill)
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center active:scale-[0.96] transition-all duration-200 group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  <span className="material-symbols-outlined text-xl" style={{ color, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: '#f1f3fc' }}>{f.title}</div>
                  <div className="text-[10px] mt-0.5 leading-snug" style={{ color: '#72757d' }}>{f.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* My Holdings — pill style */}
      {holdings.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-sm" style={{ color: '#72757d' }}>account_balance_wallet</span>
            <span className="text-xs font-semibold" style={{ color: '#72757d' }}>我的持仓</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {holdings.map(h => (
              <div key={h.code} className="flex items-center rounded-full overflow-hidden"
                style={{ background: 'rgba(182,160,255,0.06)', border: '1px solid rgba(182,160,255,0.12)' }}>
                <button
                  onClick={() => onFill(`帮我看看${h.code} ${h.name}，成本${h.costPrice}元`)}
                  className="pl-3 pr-1 py-1.5 active:scale-[0.97] transition-all flex items-center gap-1.5"
                >
                  <span className="text-xs font-semibold" style={{ color: '#f1f3fc' }}>{h.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: '#b6a0ff' }}>{h.code}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setHoldings(removeHolding(h.code)) }}
                  className="pr-2 pl-0.5 py-1.5 transition-colors hover:text-white/60 active:scale-90"
                  style={{ color: '#44484f' }}
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today's Hot — sector cards with fire */}
      <section className="mb-20">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm" style={{ color: hotSectors.length > 0 ? '#f87171' : '#72757d', fontVariationSettings: "'FILL' 1" }}>
            {hotSectors.length > 0 ? 'local_fire_department' : 'explore'}
          </span>
          <span className="text-xs font-semibold" style={{ color: '#72757d' }}>
            {hotSectors.length > 0 ? '今日热门板块' : '快捷入口'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {dynamicExamples.map((ex, i) => (
            <button key={ex.text} onClick={() => onFill(ex.text)}
              className="text-left p-3 rounded-xl flex flex-col gap-1.5 group active:scale-[0.97] transition-all duration-200"
              style={{
                background: ex.hot ? 'rgba(248,113,113,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${ex.hot ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: '#f1f3fc' }}>
                  {ex.text.replace('板块有什么短线机会？', '')}
                </span>
                {ex.tag && (
                  <span className="text-[11px] font-bold font-mono"
                    style={{ color: ex.hot ? '#f87171' : '#a8abb3' }}>
                    {ex.tag}
                  </span>
                )}
              </div>
              <div className="text-[10px]" style={{ color: '#72757d' }}>
                点击查看短线机会
              </div>
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
            <div className="max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 text-white stock-fade-in"
              style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)' }}>
              <p className="m-0 text-sm">{msg.content}</p>
            </div>
          )}
          {msg.role === 'assistant' && msg.error && (
            <div className="max-w-[85%] glass-card rounded-[20px] rounded-bl-md px-4 py-3 stock-fade-in">
              <p className="text-red-400 text-sm">{msg.content}</p>
              <button onClick={() => onRetry(msg)} className="mt-2 text-xs text-[var(--primary)] font-medium">
                🔄 重新发送
              </button>
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && msg.showSearch && (
            <div className="max-w-[90%] stock-fade-in">
              <div className="glass-card rounded-[20px] rounded-bl-md p-4">
                <p className="text-sm mb-3" style={{ color: '#a8abb3' }}>{msg.content}</p>
                <StockSearch compact onSend={onSend} />
              </div>
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && !msg.showSearch && msg.showSectorPicker && (
            <div className="max-w-[90%] stock-fade-in">
              <div className="glass-card rounded-[20px] rounded-bl-md p-4">
                <p className="text-sm mb-3" style={{ color: '#a8abb3' }}>{msg.content}</p>
                <SectorChips selected={null} onSelect={(sector) => onSend(`${sector}板块有什么短线机会？`)} />
              </div>
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && !msg.showSearch && !msg.showSectorPicker && msg.apiResponse && (
            <div className="max-w-[90%]">
              <StockMessageBubble message={msg.apiResponse} streaming={!!msg._streaming} />
            </div>
          )}
          {msg.role === 'assistant' && !msg.error && !msg.showSearch && !msg.showSectorPicker && !msg.apiResponse && msg.content && (
            <div className="max-w-[85%] glass-card rounded-[20px] rounded-bl-md px-4 py-3 stock-fade-in">
              <p className="text-sm" style={{ color: '#f1f3fc' }}>{msg.content}</p>
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="flex justify-start stock-fade-in">
          <div className="glass-card rounded-[20px] rounded-bl-md px-4 py-3 flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="text-[var(--muted)] text-sm">获取行情数据中</span>
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
  const [holdings, setHoldings] = useState(() => getHoldings())
  const [appHeight, setAppHeight] = useState('100%')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  // Persist chat (debounced to avoid thrashing during streaming)
  const saveTimer = useRef(null)
  useEffect(() => {
    if (messages.length === 0) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const serializable = messages.map(({ onSend, ...rest }) => rest)
      saveStockChat(serializable)
    }, 500)
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

  // Cleanup abort on unmount
  useEffect(() => {
    return () => abortRef.current?.()
  }, [])

  const handleSend = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    let intent = detectIntent(trimmed)

    // ── 前置拦截：不合理需求 / 超范围 / 无关话题 ──
    if (intent.type === 'reject_unrealistic') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '我无法为您承诺任何盈利，股市不存在100%赚钱的交易，短线交易风险极高，请您理性投资。\n\n建议仓位不超过总资金的30%，严格执行止损止盈纪律。',
      }])
      setLoading(false)
      return
    }

    if (intent.type === 'out_of_scope') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '我仅为A股1-5个交易日短线交易的小白专属助手，无法为您提供港股、美股、期货、基金定投、长线投资等超出该范围的服务。\n\n你可以试试：\n• 输入板块名看短线机会\n• 输入股票名称或代码查诊断\n• 问问今天大盘怎么样',
      }])
      setLoading(false)
      return
    }

    if (intent.type === 'off_topic') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '我是A股短线交易小白专属助手，只能回答股票相关的问题哦～\n\n你可以试试：\n• 输入板块名看短线机会\n• 输入股票名称或代码查诊断\n• 问问今天大盘怎么样\n• 粘贴一条新闻帮你解读利好利空',
      }])
      setLoading(false)
      return
    }

    // Stock name/code without cost → auto-analyze directly
    if (intent.type === 'holding_need_cost') {
      let { code, name } = intent
      let market = code ? (code.startsWith('6') ? 1 : 0) : 0

      if (!code && name) {
        const results = await searchStock(name)
        if (results.length > 0) {
          const match = results[0]
          code = match.code
          name = match.name
          market = match.market
        }
      }

      if (code) {
        // Directly analyze without cost
        intent = { type: 'holding', code, name, costPrice: null }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `没有找到"${intent.name || intent.code}"对应的股票，请检查名称或代码。`,
          error: true,
        }])
        setLoading(false)
        return
      }
    }

    let payload
    if (intent.type === 'holding') {
      let { code, name, costPrice } = intent
      let market = code ? (code.startsWith('6') ? 1 : 0) : 0

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
        payload = { type: 'holding', code: name || trimmed, market: 0, name: name || trimmed, costPrice: costPrice || undefined }
      } else {
        payload = { type: 'holding', code, market, name: name || code, costPrice: costPrice || undefined }
        if (costPrice) setHoldings(addHolding({ code, name: name || code, market, costPrice }))
      }
    } else if (intent.type === 'market') {
      payload = { type: 'market' }
    } else if (intent.type === 'news') {
      payload = { type: 'news', content: intent.content || trimmed }
    } else if (intent.type === 'qa') {
      payload = { type: 'qa', query: intent.query || trimmed }
    } else {
      payload = { type: 'recommend', sector: intent.sector || null, query: intent.query || trimmed }
    }

    // Create a placeholder assistant message that will be updated via streaming
    const assistantMsgIdx = { current: -1 }

    const abort = analyzeStockStream(payload, {
      onMeta(meta) {
        // First event: create the assistant message with metadata + streaming flag
        setMessages(prev => {
          assistantMsgIdx.current = prev.length
          return [...prev, {
            role: 'assistant',
            apiResponse: { ...meta, text: '' },
            content: '',
            _streaming: true,
          }]
        })
        setLoading(false)
      },
      onDelta(chunk) {
        // Append text chunk to the assistant message
        setMessages(prev => {
          const idx = assistantMsgIdx.current
          if (idx < 0 || idx >= prev.length) return prev
          const updated = [...prev]
          const msg = { ...updated[idx] }
          const apiRes = { ...msg.apiResponse }
          apiRes.text = (apiRes.text || '') + chunk
          msg.apiResponse = apiRes
          msg.content = apiRes.text
          updated[idx] = msg
          return updated
        })
      },
      onDone() {
        setLoading(false)
        // Clear streaming flag on the message
        setMessages(prev => {
          const idx = assistantMsgIdx.current
          if (idx < 0 || idx >= prev.length) return prev
          const updated = [...prev]
          updated[idx] = { ...updated[idx], _streaming: false }
          return updated
        })
      },
      onError(err) {
        setLoading(false)
        setMessages(prev => {
          // If we already have a streaming message, don't add another
          if (assistantMsgIdx.current >= 0) return prev
          return [...prev, {
            role: 'assistant',
            content: err.message || '分析失败，请稍后重试',
            error: true,
            _retryText: trimmed,
          }]
        })
      },
    })

    abortRef.current = abort
  }, [loading])

  function handleRetry(errorMsg) {
    setMessages(prev => prev.filter(m => m !== errorMsg))
    handleSend(errorMsg._retryText)
  }

  function handleFill(text) {
    inputRef.current?.fill(text)
  }

  function handleClear() {
    abortRef.current?.()
    setMessages([])
    clearStockChat()
  }

  function handleStartHolding() {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '请搜索你持有的股票，输入成本价后我来帮你诊断：',
      showSearch: true,
    }])
  }

  function handleStartRecommend() {
    handleSend('推荐今日短线机会')
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
          <StockLandingView onFill={handleFill} onStartHolding={handleStartHolding} onStartRecommend={handleStartRecommend} holdings={holdings} setHoldings={setHoldings} />
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
