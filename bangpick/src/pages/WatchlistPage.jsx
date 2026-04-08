import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import StockSearch from '../components/StockSearch'
import AlertSetup from '../components/AlertSetup'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/watchlist'
import { evaluateAlerts, markTriggered } from '../lib/alerts'

// 自选股 — overview page with live quotes refreshed during trading hours.

const REFRESH_INTERVAL_MS = 30 * 1000

function isTradingHours() {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  // 9:30-11:30 + 13:00-15:00 (Beijing time, browser local for personal use)
  return (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) ||
         (minutes >= 13 * 60 && minutes <= 15 * 60)
}

function fmt(n, digits = 2) {
  if (n == null || !isFinite(n)) return '—'
  return Number(n).toFixed(digits)
}

function changeColor(pct) {
  if (pct == null || !isFinite(pct)) return '#72757d'
  if (pct > 0) return '#ef4444' // 红涨 (China convention)
  if (pct < 0) return '#22c55e' // 绿跌
  return '#72757d'
}

export default function WatchlistPage() {
  const [items, setItems] = useState(() => getWatchlist())
  const [quotes, setQuotes] = useState({}) // code -> result
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [alertTarget, setAlertTarget] = useState(null) // stock obj when AlertSetup is open
  const [toasts, setToasts] = useState([]) // [{ id, message }]
  const navigate = useNavigate()
  const refreshTimer = useRef(null)

  // Request browser notification permission once on mount.
  // Only fires the prompt if not already decided (default state).
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // Pop a hit as both an in-page toast (always works) and a system
  // notification (works in background tabs / minimized window if granted).
  const fireHit = useCallback((hit) => {
    const id = `${hit.alert.id}_${Date.now()}`
    setToasts(prev => [...prev, { id, message: hit.message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 8000)

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('帮我选 · 自选股提醒', {
          body: hit.message,
          tag: hit.alert.id, // dedupe across tabs
          icon: '/favicon.svg',
        })
      } catch { /* some browsers throw on file:// or insecure contexts */ }
    }

    markTriggered(hit.alert.id, hit.message)
  }, [])

  const fetchQuotes = useCallback(async (list) => {
    if (!list || list.length === 0) {
      setQuotes({})
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/api/stock-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks: list.map(({ code, name, market }) => ({ code, name, market })) }),
      })
      const data = await r.json()
      const next = {}
      ;(data.results || []).forEach(res => { if (res?.code) next[res.code] = res })
      setQuotes(next)
      setLastRefresh(new Date())

      // Evaluate alerts against fresh quotes; fire any new hits.
      const hits = evaluateAlerts(next)
      hits.forEach(fireHit)
    } catch {
      // Keep previous quotes on failure
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + auto-refresh during trading hours
  useEffect(() => {
    fetchQuotes(items)
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    refreshTimer.current = setInterval(() => {
      if (isTradingHours()) fetchQuotes(items)
    }, REFRESH_INTERVAL_MS)
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current)
    }
  }, [items, fetchQuotes])

  function handleAdd(stock) {
    const updated = addToWatchlist({ code: stock.code, name: stock.name, market: stock.market })
    setItems(updated)
    setShowAdd(false)
  }

  function handleRemove(code) {
    if (!confirm('从自选股移除？')) return
    const updated = removeFromWatchlist(code)
    setItems(updated)
    setQuotes(prev => {
      const next = { ...prev }
      delete next[code]
      return next
    })
  }

  function handleAnalyze(item) {
    navigate(`/stock?q=${encodeURIComponent(`帮我看看${item.code} ${item.name}`)}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14] pb-20">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-40">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark_star</span>
            <h1 className="text-xl font-black tracking-tighter text-[var(--primary)]" style={{ filter: 'drop-shadow(0 0 15px rgba(182,160,255,0.3))' }}>自选股</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchQuotes(items)}
              disabled={loading || items.length === 0}
              className="w-8 h-8 rounded-full grid place-items-center text-[var(--muted)] hover:bg-white/10 transition-colors disabled:opacity-30"
              title="刷新行情"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
            <button
              onClick={() => setShowAdd(s => !s)}
              className="w-8 h-8 rounded-full grid place-items-center text-[var(--muted)] hover:bg-white/10 transition-colors"
              title="添加股票"
            >
              <span className="material-symbols-outlined text-[18px]">{showAdd ? 'close' : 'add'}</span>
            </button>
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 pt-4">
        {/* Status bar */}
        <div className="flex items-center justify-between text-xs px-2 mb-3" style={{ color: '#72757d' }}>
          <span>{items.length} 只 · {isTradingHours() ? '交易中 · 自动刷新 30s' : '非交易时段'}</span>
          {lastRefresh && (
            <span>更新于 {lastRefresh.toLocaleTimeString('zh-CN', { hour12: false })}</span>
          )}
        </div>

        {/* Add panel */}
        {showAdd && (
          <div className="mb-4 p-4 rounded-2xl glass-card">
            <StockSearch
              onSubmit={handleAdd}
            />
            <p className="text-[11px] mt-2" style={{ color: '#72757d' }}>选择股票后点「诊断」即可加入自选（成本价可空）</p>
          </div>
        )}

        {/* List */}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl mb-3" style={{ color: '#3a3d44' }}>bookmark_add</span>
            <p className="text-sm" style={{ color: '#72757d' }}>还没有自选股</p>
            <p className="text-xs mt-1" style={{ color: '#52555c' }}>点右上角 + 添加你关心的股票</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-5 px-5 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)', color: '#fff' }}
            >
              添加股票
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(item => {
              const q = quotes[item.code]
              const price = q?.close
              const pct = q?.changePercent
              const volRatio = q?.volRatio
              const errored = q?.error || q?.suspended
              return (
                <li
                  key={item.code}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors active:scale-[0.99]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <button
                    onClick={() => handleAnalyze(item)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    {/* Name + code */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate" style={{ color: '#f1f3fc' }}>{item.name}</span>
                        <span className="text-[10px] font-mono" style={{ color: '#72757d' }}>{item.code}</span>
                      </div>
                      {errored ? (
                        <div className="text-[11px] mt-0.5" style={{ color: '#f8a171' }}>
                          {q?.suspended ? '停牌' : (q?.error || '加载失败')}
                        </div>
                      ) : volRatio != null ? (
                        <div className="text-[11px] mt-0.5" style={{ color: '#72757d' }}>
                          量比 {fmt(volRatio)} {q?.macdSignal === 'golden_cross' ? ' · MACD金叉' : ''}
                        </div>
                      ) : null}
                    </div>
                    {/* Price + change */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-semibold tabular-nums" style={{ color: changeColor(pct) }}>
                        {fmt(price)}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums" style={{ color: changeColor(pct) }}>
                        {pct == null || !isFinite(pct) ? '—' : `${pct > 0 ? '+' : ''}${fmt(pct)}%`}
                      </div>
                    </div>
                  </button>
                  {/* Alert */}
                  <button
                    onClick={() => setAlertTarget(item)}
                    className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0 hover:bg-white/10 transition-colors"
                    style={{ color: '#a0a3aa' }}
                    title="设置提醒"
                  >
                    <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                  </button>
                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.code)}
                    className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0 hover:bg-white/10 transition-colors"
                    style={{ color: '#52555c' }}
                    title="移除"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-center text-[10px] mt-6 mb-4" style={{ color: '#52555c' }}>
          数据仅供参考，非交易时段不自动刷新
        </p>
      </main>

      <BottomNav />

      {alertTarget && (
        <AlertSetup
          stock={alertTarget}
          onClose={() => setAlertTarget(null)}
        />
      )}

      {/* In-page toast stack for alert hits — appears top-right, auto-dismiss in 8s */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-80 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl flex items-start gap-2 animate-[slideInRight_0.3s_ease-out]"
              style={{
                background: 'linear-gradient(135deg, rgba(91,140,255,0.95), rgba(122,124,255,0.95))',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">notifications_active</span>
              <div className="flex-1 text-sm leading-snug">{t.message}</div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-white/70 hover:text-white flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
