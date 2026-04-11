import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import StockSearch from './StockSearch'
import AlertSetup from './AlertSetup'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/watchlist'
import { evaluateAlerts, markTriggered } from '../lib/alerts'

const REFRESH_INTERVAL_MS = 30 * 1000

function isTradingHours() {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  return (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) ||
         (minutes >= 13 * 60 && minutes <= 15 * 60)
}

function fmt(n, digits = 2) {
  if (n == null || !isFinite(n)) return '—'
  return Number(n).toFixed(digits)
}

function changeColor(pct) {
  if (pct == null || !isFinite(pct)) return '#72757d'
  if (pct > 0) return '#ef4444'
  if (pct < 0) return '#22c55e'
  return '#72757d'
}

export default function WatchlistWidget({ onAnalyze }) {
  const { t } = useTranslation()
  const [items, setItems] = useState(() => getWatchlist())
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [alertTarget, setAlertTarget] = useState(null)
  const [toasts, setToasts] = useState([])
  const refreshTimer = useRef(null)

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const fireHit = useCallback((hit) => {
    const id = `${hit.alert.id}_${Date.now()}`
    setToasts(prev => [...prev, { id, message: hit.message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 8000)

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(t('watchlist.alert_title'), {
          body: hit.message,
          tag: hit.alert.id,
          icon: '/favicon.svg',
        })
      } catch { /* some browsers throw */ }
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

      const hits = evaluateAlerts(next)
      hits.forEach(fireHit)
    } catch {
      // Keep previous quotes on failure
    } finally {
      setLoading(false)
    }
  }, [fireHit])

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
    if (!confirm(t('watchlist.remove_confirm'))) return
    const updated = removeFromWatchlist(code)
    setItems(updated)
    setQuotes(prev => {
      const next = { ...prev }
      delete next[code]
      return next
    })
  }

  function handleAnalyze(item) {
    if (onAnalyze) {
      onAnalyze(item.code, item.name)
    }
  }

  return (
    <>
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ color: '#72757d', fontVariationSettings: "'FILL' 1" }}>bookmark_star</span>
            <span className="text-xs font-semibold" style={{ color: '#72757d' }}>{t('watchlist.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: '#52555c' }}>
              {t('watchlist.count', { count: items.length })} · {isTradingHours() ? t('watchlist.auto_refresh') : t('watchlist.not_trading')}
              {lastRefresh ? ` · ${lastRefresh.toLocaleTimeString([], { hour12: false })}` : ''}
            </span>
            <button
              onClick={() => fetchQuotes(items)}
              disabled={loading || items.length === 0}
              className="w-6 h-6 rounded-full grid place-items-center text-[var(--muted)] hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
            <button
              onClick={() => setShowAdd(s => !s)}
              className="w-6 h-6 rounded-full grid place-items-center text-[var(--muted)] hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">{showAdd ? 'close' : 'add'}</span>
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="mb-3 p-3 rounded-xl glass-card">
            <StockSearch onSubmit={handleAdd} />
            <p className="text-[10px] mt-1.5" style={{ color: '#52555c' }}>{t('watchlist.search_hint')}</p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-3xl mb-2" style={{ color: '#3a3d44' }}>bookmark_add</span>
            <p className="text-xs" style={{ color: '#72757d' }}>{t('watchlist.empty')}</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 px-4 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)', color: '#fff' }}
            >
              {t('watchlist.add_stock')}
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map(item => {
              const q = quotes[item.code]
              const price = q?.close
              const pct = q?.changePercent
              const volRatio = q?.volRatio
              const errored = q?.error || q?.suspended
              return (
                <li
                  key={item.code}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors active:scale-[0.99]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <button
                    onClick={() => handleAnalyze(item)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate" style={{ color: '#f1f3fc' }}>{item.name}</span>
                        <span className="text-[9px] font-mono" style={{ color: '#72757d' }}>{item.code}</span>
                      </div>
                      {errored ? (
                        <div className="text-[10px] mt-0.5" style={{ color: '#f8a171' }}>
                          {q?.suspended ? t('watchlist.suspended') : (q?.error || t('watchlist.load_failed'))}
                        </div>
                      ) : volRatio != null ? (
                        <div className="text-[10px] mt-0.5" style={{ color: '#72757d' }}>
                          {t('stock.vol_ratio')} {fmt(volRatio)} {q?.macdSignal === 'golden_cross' ? ` · ${t('stock.macd_golden')}` : ''}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-mono font-semibold tabular-nums" style={{ color: changeColor(pct) }}>
                        {fmt(price)}
                      </div>
                      <div className="text-[10px] font-mono tabular-nums" style={{ color: changeColor(pct) }}>
                        {pct == null || !isFinite(pct) ? '—' : `${pct > 0 ? '+' : ''}${fmt(pct)}%`}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setAlertTarget(item)}
                    className="w-7 h-7 rounded-full grid place-items-center flex-shrink-0 hover:bg-white/10 transition-colors"
                    style={{ color: '#a0a3aa' }}
                    title={t('watchlist.set_alert')}
                  >
                    <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                  </button>
                  <button
                    onClick={() => handleRemove(item.code)}
                    className="w-7 h-7 rounded-full grid place-items-center flex-shrink-0 hover:bg-white/10 transition-colors"
                    style={{ color: '#52555c' }}
                    title={t('watchlist.remove')}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-center text-[9px] mt-3" style={{ color: '#52555c' }}>
          {t('watchlist.disclaimer')}
        </p>
      </section>

      {alertTarget && (
        <AlertSetup
          stock={alertTarget}
          onClose={() => setAlertTarget(null)}
        />
      )}

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-80 pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl flex items-start gap-2 animate-[slideInRight_0.3s_ease-out]"
              style={{
                background: 'linear-gradient(135deg, rgba(91,140,255,0.95), rgba(122,124,255,0.95))',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">notifications_active</span>
              <div className="flex-1 text-sm leading-snug">{toast.message}</div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== toast.id))}
                className="text-white/70 hover:text-white flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
