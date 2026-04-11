import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ChatInput from '../components/ChatInput'
import StockMessageBubble from '../components/StockChat'
import StockSearch from '../components/StockSearch'
import SectorChips from '../components/SectorChips'
import BottomNav from '../components/BottomNav'
import LanguageSwitcher from '../components/LanguageSwitcher'
import PnLChart from '../components/PnLChart'
import WatchlistWidget from '../components/WatchlistWidget'
import { analyzeStockStream, searchStock } from '../lib/stockApi'
import { getHoldings, addHolding, removeHolding } from '../lib/stockStorage'
import { STOCK_FEATURES, STOCK_EXAMPLES, SECTORS, detectIntent } from '../lib/stockPrompts'
import { getStockChat, saveStockChat, clearStockChat } from '../lib/stockStorage'

const FEATURE_COLORS = {
  recommend: 'var(--primary)',
  holding: 'var(--secondary)',
  double_golden: 'var(--green)',
}

/* ===== Landing View ===== */
// Hot sectors cache — survives remounts (tab switch) so users don't see the
// "快捷入口 → 今日热门板块" flicker every time they come back to this page.
const HOT_SECTORS_CACHE_KEY = 'bangpick_hot_sectors_v1'
let hotSectorsMemCache = null
function readHotSectorsCache() {
  if (hotSectorsMemCache) return hotSectorsMemCache
  try {
    const raw = sessionStorage.getItem(HOT_SECTORS_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) { hotSectorsMemCache = parsed; return parsed }
    }
  } catch { /* ignore */ }
  return []
}

function StockLandingView({ onFill, onStartHolding, onStartRecommend, onStartDoubleGolden, holdings, setHoldings, onAnalyzeStock }) {
  const { t } = useTranslation()
  const [hotSectors, setHotSectors] = useState(() => readHotSectorsCache())
  const [marketIndices, setMarketIndices] = useState([])

  useEffect(() => {
    // Fetch market indices + auto-refresh every 30s
    function fetchIndices() {
      fetch('/api/stock-indices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setMarketIndices(data) })
        .catch(() => {})
    }
    fetchIndices()
    const timer = setInterval(fetchIndices, 30000)

    // Always fetch latest data on mount; cached data shown as placeholder to avoid blank flash
    fetch('/api/stock-hot-sectors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          hotSectorsMemCache = data
          try { sessionStorage.setItem(HOT_SECTORS_CACHE_KEY, JSON.stringify(data)) } catch { /* quota */ }
          setHotSectors(data)
        }
      })
      .catch(() => {})

    return () => clearInterval(timer)
  }, [])

  // Build dynamic examples from hot sectors
  const dynamicExamples = hotSectors.length > 0
    ? hotSectors.slice(0, 6).map(s => ({
        text: `${s.sector}${t('stock.sector_chance')}`,
        sectorName: s.sector,
        icon: 'local_fire_department',
        tag: `${s.avgChange > 0 ? '+' : ''}${s.avgChange}%`,
        hot: s.avgChange >= 2,
      }))
    : STOCK_EXAMPLES.map(ex => ({
        text: t(`stock.${ex.key}`),
        sectorName: null,
        icon: ex.icon,
        tag: null,
        hot: false,
      }))

  return (
    <div>
      {/* Hero — compact, centered feel */}
      <section className="mb-8 text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium mb-4"
          style={{ background: 'rgba(182,160,255,0.08)', border: '1px solid rgba(182,160,255,0.15)', color: '#b6a0ff' }}>
          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          {t('stock.badge')}
        </div>
        <h2 className="text-[28px] font-extrabold tracking-tight mb-2 leading-[1.2]">
          {t('stock.hero_title_1')}<span className="text-gradient">{t('stock.hero_title_2')}</span>
        </h2>
        <p className="text-[13px] leading-relaxed max-w-xs mx-auto" style={{ color: '#72757d' }}>
          {t('stock.hero_desc')}<br />
          <span style={{ color: '#f8a171', fontSize: '11px' }}>{t('stock.hero_warn')}</span>
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
                  else if (f.key === 'recommend') onStartRecommend()
                  else if (f.key === 'double_golden') onStartDoubleGolden()
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
                  <div className="text-xs font-bold" style={{ color: '#f1f3fc' }}>{t(`stock.${f.key}`)}</div>
                  <div className="text-[10px] mt-0.5 leading-snug" style={{ color: '#72757d' }}>{t(`stock.${f.key}_desc`)}</div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Market Indices */}
      {marketIndices.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-sm" style={{ color: '#72757d', fontVariationSettings: "'FILL' 1" }}>monitoring</span>
            <span className="text-xs font-semibold" style={{ color: '#72757d' }}>{t('stock.market_indices')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {marketIndices.map(idx => {
              const up = idx.change >= 0
              return (
                <button key={idx.name}
                  onClick={() => onFill(t('stock.analyze_market', { name: idx.name }))}
                  className="p-3 rounded-xl text-center active:scale-[0.97] transition-all"
                  style={{ background: up ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)', border: `1px solid ${up ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'}` }}
                >
                  <div className="text-[11px] font-medium mb-1" style={{ color: '#a8abb3' }}>{idx.name}</div>
                  <div className="text-sm font-bold font-mono" style={{ color: '#f1f3fc' }}>{idx.close.toFixed(2)}</div>
                  <div className="text-xs font-bold font-mono mt-0.5" style={{ color: up ? '#ef4444' : '#22c55e' }}>
                    {up ? '+' : ''}{idx.change.toFixed(2)}%
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Today's Hot — sector cards with fire */}
      <section className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm" style={{ color: hotSectors.length > 0 ? '#f87171' : '#72757d', fontVariationSettings: "'FILL' 1" }}>
            {hotSectors.length > 0 ? 'local_fire_department' : 'explore'}
          </span>
          <span className="text-xs font-semibold" style={{ color: '#72757d' }}>
            {hotSectors.length > 0 ? t('stock.hot_sectors') : t('stock.quick_entry')}
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
                  {ex.sectorName || ex.text}
                </span>
                {ex.tag && (
                  <span className="text-[11px] font-bold font-mono"
                    style={{ color: ex.hot ? '#f87171' : '#a8abb3' }}>
                    {ex.tag}
                  </span>
                )}
              </div>
              <div className="text-[10px]" style={{ color: '#72757d' }}>
                {t('stock.click_chance')}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Watchlist Widget — full self-contained watchlist with live quotes */}
      <WatchlistWidget onAnalyze={(code, name) => onAnalyzeStock(code, name)} />
    </div>
  )
}

/* ===== Chat View ===== */
function StockChatView({ messages, loading, onRetry, onSend, bottomRef, t }) {
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
                {t('stock.retry')}
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
                <SectorChips selected={null} onSelect={(sector) => onSend(`${sector}${t('stock.sector_chance')}`)} />
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
            <span className="text-[var(--muted)] text-sm">{t('stock.thinking')}</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

/* ===== Main Page ===== */
export default function StockPage() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState(() => getStockChat())
  const [loading, setLoading] = useState(false)
  const [holdings, setHoldings] = useState(() => getHoldings())
  const [appHeight, setAppHeight] = useState('100%')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const initialQueryHandled = useRef(false)
  // Ref to latest handleSend so the URL-param effect below doesn't depend on
  // the callback identity. Declared up here (before any effect) so it is in
  // scope and initialised by the time effects run on first render.
  const handleSendRef = useRef(null)

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

  // Visual viewport for mobile keyboard. When the iOS keyboard opens,
  // visualViewport.height shrinks but window.innerHeight stays the same. Use
  // the gap to detect keyboard-open state so we can collapse the BottomNav
  // slot (otherwise pb-20 leaves an 80px black gap above the keyboard).
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const initH = vv.height
    function updateHeight() {
      setAppHeight(`${vv.height}px`)
      setKeyboardOpen(initH - vv.height > 100)
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

  // NOTE: Do NOT abort the in-flight stream on effect cleanup. React 19
  // StrictMode runs `doubleInvokeEffectsOnFiber` which fires passive-effect
  // cleanups during normal commits (not just on unmount) to verify
  // idempotency. A `return () => abortRef.current?.()` here would kill the
  // stock-ai request 0ms after handleSend dispatches it, the moment the
  // conditional render swaps StockLandingView → StockChatView. The handleSend
  // function already aborts any previous request before starting a new one.

  // Auto-send when navigated with ?q=... (e.g. from watchlist)
  useEffect(() => {
    if (initialQueryHandled.current) return
    const q = searchParams.get('q')
    if (!q) return
    initialQueryHandled.current = true
    // Strip the param so refresh doesn't re-trigger
    setSearchParams({}, { replace: true })
    handleSendRef.current?.(q)
  }, [searchParams, setSearchParams])

  const handleSend = useCallback(async (text, options = {}) => {
    const trimmed = typeof text === 'string' ? text.trim() : ''
    console.log('[handleSend] called', { text: trimmed, loading, options })
    if (!trimmed || loading) {
      console.log('[handleSend] EARLY RETURN', { trimmed: !!trimmed, loading })
      return
    }

    // Abort any still-streaming previous request. `loading` flips false on the
    // first meta event, so the user can fire a new question while the old
    // stream is still flowing — without this, two SSE connections compete on
    // the same dev middleware and the second one stalls.
    abortRef.current?.()
    abortRef.current = null

    const userMsg = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Bypass intent detection when an override payload is supplied (e.g. 双金叉)
    if (options.overridePayload) {
      const overridePayload = options.overridePayload
      const assistantMsgIdx = { current: -1 }
      const abort = analyzeStockStream(overridePayload, {
        onMeta(meta) {
          // Backend sends meta TWICE: early skeleton then full payload. Branch
          // OUTSIDE the updater — React StrictMode runs updaters twice, so any
          // ref mutation inside leads the second pass down the wrong branch.
          if (assistantMsgIdx.current < 0) {
            setMessages(prev => {
              assistantMsgIdx.current = prev.length
              return [...prev, {
                role: 'assistant',
                apiResponse: { ...meta, text: '' },
                content: '',
                _streaming: true,
              }]
            })
          } else {
            setMessages(prev => {
              const updated = [...prev]
              const msg = { ...updated[assistantMsgIdx.current] }
              msg.apiResponse = { ...msg.apiResponse, ...meta, text: msg.apiResponse?.text || '' }
              updated[assistantMsgIdx.current] = msg
              return updated
            })
          }
          setLoading(false)
        },
        onDelta(chunk) {
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
            if (assistantMsgIdx.current >= 0) return prev
            return [...prev, {
              role: 'assistant',
              content: err.message || t('stock.analyze_fail'),
              error: true,
              _retryText: trimmed,
            }]
          })
        },
      })
      abortRef.current = abort
      return
    }

    let intent
    try {
      intent = detectIntent(trimmed)
      console.log('[handleSend] intent:', intent)
    } catch (e) {
      console.error('[handleSend] detectIntent threw:', e)
      setLoading(false)
      return
    }

    // ── 前置拦截：不合理需求 / 超范围 / 无关话题 ──
    if (intent.type === 'reject_unrealistic') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('stock.reject_unrealistic'),
      }])
      setLoading(false)
      return
    }

    if (intent.type === 'out_of_scope') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('stock.out_of_scope'),
      }])
      setLoading(false)
      return
    }

    if (intent.type === 'off_topic') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('stock.off_topic'),
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
          content: t('stock.stock_not_found', { name: intent.name || intent.code }),
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

    console.log('[handleSend] payload built, calling analyzeStockStream', payload)

    // Create a placeholder assistant message that will be updated via streaming
    const assistantMsgIdx = { current: -1 }

    const abort = analyzeStockStream(payload, {
      onMeta(meta) {
        console.log('[handleSend] onMeta', meta)
        // Backend sends meta TWICE: early skeleton (so the loading bubble can
        // flip to streaming) then full stockData. Branch OUTSIDE the updater
        // — React StrictMode runs updaters twice, and a ref mutation inside
        // would lead the second pass into the wrong branch on first meta.
        if (assistantMsgIdx.current < 0) {
          setMessages(prev => {
            assistantMsgIdx.current = prev.length
            return [...prev, {
              role: 'assistant',
              apiResponse: { ...meta, text: '' },
              content: '',
              _streaming: true,
            }]
          })
        } else {
          setMessages(prev => {
            const updated = [...prev]
            const msg = { ...updated[assistantMsgIdx.current] }
            msg.apiResponse = { ...msg.apiResponse, ...meta, text: msg.apiResponse?.text || '' }
            updated[assistantMsgIdx.current] = msg
            return updated
          })
        }
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
            content: err.message || t('stock.analyze_fail'),
            error: true,
            _retryText: trimmed,
          }]
        })
      },
    })

    abortRef.current = abort
  }, [loading])

  // Keep ref in sync so the URL-param effect can call latest handleSend.
  // Sync assignment during render (not in useEffect) so the ref is populated
  // before any effect runs on first render.
  handleSendRef.current = handleSend

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
      content: t('stock.holding_prompt'),
      showSearch: true,
    }])
  }

  function handleStartRecommend() {
    handleSend(t('stock.recommend_prompt'))
  }

  function handleStartDoubleGolden() {
    handleSend(t('stock.double_golden_prompt'), {
      overridePayload: {
        type: 'recommend',
        filter: 'double_golden_cross',
        sector: null,
        query: '推荐今日双金叉短线机会',
      },
    })
  }


  const inChat = messages.length > 0

  return (
    <div className={`flex flex-col bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14] `} style={{ height: appHeight }}>
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>candlestick_chart</span>
            <h1 className="text-xl font-black tracking-tighter text-[var(--primary)]" style={{ filter: 'drop-shadow(0 0 15px rgba(182,160,255,0.3))' }}>{t('stock.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
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
          <StockLandingView onFill={handleFill} onStartHolding={handleStartHolding} onStartRecommend={handleStartRecommend} onStartDoubleGolden={handleStartDoubleGolden} holdings={holdings} setHoldings={setHoldings} onAnalyzeStock={(code, name) => handleSend(`${t('stock.analyze_prefix')} ${code} ${name}`)} />
        ) : (
          <StockChatView messages={messages} loading={loading} onRetry={handleRetry} onSend={handleSend} bottomRef={bottomRef} t={t} />
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

      {!keyboardOpen && <div className="flex-shrink-0 h-16" />}
      {!keyboardOpen && <BottomNav />}
    </div>
  )
}
