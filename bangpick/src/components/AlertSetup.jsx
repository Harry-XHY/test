import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ALERT_TYPES, addAlert } from '../lib/alerts'

// 提醒设置 Modal — opens from a watchlist row or AI analysis card.
// Caller passes the target stock; user picks the alert type and threshold.

export default function AlertSetup({ stock, onClose, onCreated }) {
  const { t } = useTranslation()
  const [type, setType] = useState('price_above')
  const [threshold, setThreshold] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const selected = ALERT_TYPES.find(t => t.value === type)
  const needsThreshold = selected?.unit !== null

  function handleSubmit(e) {
    e?.preventDefault?.()
    if (busy) return
    let value = null
    if (needsThreshold) {
      value = parseFloat(threshold)
      if (!isFinite(value) || value <= 0) {
        setError(t('alert.invalid_number'))
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      const created = addAlert({
        code: stock.code,
        name: stock.name,
        market: stock.market,
        type,
        threshold: value,
      })
      onCreated?.(created)
      onClose?.()
    } catch (err) {
      setError(err?.message || t('alert.add_failed'))
    } finally {
      setBusy(false)
    }
  }

  // Group types so the picker reads as 价格 / 涨跌幅 / 技术 — easier to scan
  // than a single 7-row dropdown.
  const groups = [
    { label: t('alert.price'), items: ALERT_TYPES.filter(a => a.value.startsWith('price_')) },
    { label: t('alert.change_pct'), items: ALERT_TYPES.filter(a => a.value.startsWith('change_pct_')) },
    { label: t('alert.technical'), items: ALERT_TYPES.filter(a => a.value.startsWith('macd_') || a.value.startsWith('vol_')) },
  ]

  const placeholder =
    selected?.value === 'change_pct_above' || selected?.value === 'change_pct_below'
      ? t('alert.eg_pct')
      : selected?.value === 'vol_ratio_above'
        ? t('alert.eg_vol')
        : t('alert.eg_price')

  const helper =
    selected?.value === 'change_pct_below' ? t('alert.helper_drop_pct')
    : selected?.value === 'change_pct_above' ? t('alert.helper_rise_pct')
    : (selected?.value === 'price_above' || selected?.value === 'price_below') ? t('alert.helper_price')
    : selected?.value === 'vol_ratio_above' ? t('alert.helper_vol')
    : ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_.18s_ease-out]"
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-[slideUp_.22s_ease-out]"
        style={{
          background: 'linear-gradient(180deg, #1a1f29 0%, #12161d 100%)',
          border: '1px solid rgba(167,139,250,0.18)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(167,139,250,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="px-5 pt-3 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <h3 className="text-base font-bold text-white tracking-wide">{t('alert.setup_title')}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full grid place-items-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t('common.close')}
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          {/* Stock chip */}
          <div
            className="mb-5 px-4 py-3 rounded-2xl flex items-center justify-between"
            style={{
              background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.15)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl grid place-items-center text-xs font-bold text-purple-200" style={{ background: 'rgba(167,139,250,0.18)' }}>
                {stock.name?.[0] || '股'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white leading-tight">{stock.name}</span>
                <span className="text-[11px] font-mono text-slate-400 leading-tight">{stock.code}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type picker — grouped pill grid */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 mb-2.5">{t('alert.type_label')}</label>
              <div className="space-y-3">
                {groups.map(g => (
                  <div key={g.label}>
                    <div className="text-[10px] text-slate-500 mb-1.5 px-1">{g.label}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {g.items.map(t => {
                        const active = type === t.value
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => { setType(t.value); setError(null) }}
                            className={`text-xs font-medium py-2 rounded-xl transition-all duration-150 active:scale-[0.97] ${
                              active
                                ? 'text-white shadow-[0_4px_14px_rgba(167,139,250,0.35)]'
                                : 'text-slate-300 hover:text-white'
                            }`}
                            style={{
                              background: active
                                ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                                : 'rgba(255,255,255,0.04)',
                              border: active
                                ? '1px solid rgba(167,139,250,0.5)'
                                : '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Threshold input */}
            {needsThreshold && (
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 mb-2.5">
                  {t('alert.threshold')} {selected?.unit ? <span className="text-slate-400 normal-case">（{selected.unit}）</span> : ''}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={threshold}
                    onChange={e => { setThreshold(e.target.value); setError(null) }}
                    placeholder={placeholder}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-base focus:border-purple-500/60 focus:bg-black/50 outline-none font-mono tabular-nums transition-colors"
                    autoFocus
                  />
                  {selected?.unit && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono pointer-events-none">
                      {selected.unit}
                    </span>
                  )}
                </div>
                {helper && <p className="text-[11px] text-slate-500 mt-2 px-1">{helper}</p>}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
              <span className="mt-0.5">ⓘ</span>
              <span>{t('alert.check_note')}</span>
            </p>

            <button
              type="submit"
              disabled={busy}
              className="w-full text-sm font-bold text-white rounded-2xl py-3.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                boxShadow: '0 8px 24px rgba(139,92,246,0.35)',
              }}
            >
              {busy ? t('alert.adding') : t('alert.add_alert')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
