import { useState } from 'react'
import { ALERT_TYPES, addAlert } from '../lib/alerts'

// 提醒设置 Modal — opens from a watchlist row or AI analysis card.
// Caller passes the target stock; user picks the alert type and threshold.

export default function AlertSetup({ stock, onClose, onCreated }) {
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
        setError('请输入有效数字')
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
      setError(err?.message || '添加失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-8"
        style={{ background: '#15191f', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">设置提醒</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{stock.name}</span>
            <span className="text-[11px] font-mono text-slate-400">{stock.code}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">提醒类型</label>
            <select
              value={type}
              onChange={e => { setType(e.target.value); setError(null) }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
            >
              {ALERT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {needsThreshold && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                阈值 {selected?.unit ? `(${selected.unit})` : ''}
              </label>
              <input
                type="number"
                step="0.01"
                value={threshold}
                onChange={e => { setThreshold(e.target.value); setError(null) }}
                placeholder={
                  selected?.value === 'change_pct_above' || selected?.value === 'change_pct_below'
                    ? '例如 5'
                    : selected?.value === 'vol_ratio_above'
                      ? '例如 2'
                      : '例如 1700'
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none font-mono"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {selected?.value === 'change_pct_below' && '填正数即可，例如填 5 表示当日跌幅达到 5%'}
                {selected?.value === 'change_pct_above' && '当日涨幅达到此百分比时提醒'}
                {(selected?.value === 'price_above' || selected?.value === 'price_below') && '收盘价/最新价触达此价位时提醒'}
                {selected?.value === 'vol_ratio_above' && '量比达到此倍数时提醒（资金活跃度）'}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <p className="text-[11px] text-slate-500">
            提醒会在 A 股交易时段每 5 分钟检查一次，触发后自动停用并出现在通知栏。
          </p>

          <button
            type="submit"
            disabled={busy}
            className="w-full text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium"
          >
            {busy ? '添加中…' : '添加提醒'}
          </button>
        </form>
      </div>
    </div>
  )
}
