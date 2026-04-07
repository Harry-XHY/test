import { useEffect, useState } from 'react'
import { fetchSnapshots, computeStats } from '../lib/pnl'

// Lightweight inline-SVG sparkline of持仓 daily avg P&L (%) plus stat cards.
// Reads snapshots from /api/sync?key=snapshots (written by api/cron-snapshot.js).
// No external chart lib — keeps the bundle small.

const W = 320
const H = 80
const PAD = 4

function fmtPct(v, digits = 2) {
  if (v == null || !isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${Number(v).toFixed(digits)}%`
}

function colorFor(v) {
  if (v == null || !isFinite(v)) return '#72757d'
  if (v > 0) return '#ef4444' // 红涨
  if (v < 0) return '#22c55e' // 绿跌
  return '#72757d'
}

function buildPath(series, width, height, pad) {
  if (!series || series.length === 0) return ''
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0
  return series
    .map((v, i) => {
      const x = pad + i * stepX
      const y = pad + innerH - ((v - min) / range) * innerH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export default function PnLChart() {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchSnapshots().then(list => {
      if (cancelled) return
      setSnapshots(list)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [])

  const stats = computeStats(snapshots)

  if (loading) {
    return (
      <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[11px]" style={{ color: '#72757d' }}>加载持仓收益数据…</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[16px]" style={{ color: '#72757d' }}>show_chart</span>
          <span className="text-xs font-semibold" style={{ color: '#a8abb3' }}>收益曲线</span>
        </div>
        <p className="text-[11px] mt-1" style={{ color: '#72757d' }}>
          还没有持仓快照。每个交易日收盘后系统会自动记录一次。
        </p>
      </div>
    )
  }

  const path = buildPath(stats.series, W, H, PAD)
  const lineColor = colorFor(stats.latest)

  return (
    <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]" style={{ color: '#b6a0ff' }}>show_chart</span>
          <span className="text-xs font-semibold" style={{ color: '#a8abb3' }}>持仓收益曲线</span>
        </div>
        <span className="text-[10px]" style={{ color: '#52555c' }}>{stats.days} 天</span>
      </div>

      {/* Sparkline */}
      <div className="relative mb-3">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 80 }}>
          <defs>
            <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* zero baseline if range crosses zero */}
          {(() => {
            const min = Math.min(...stats.series)
            const max = Math.max(...stats.series)
            if (min >= 0 || max <= 0) return null
            const range = max - min || 1
            const innerH = H - PAD * 2
            const y = PAD + innerH - ((0 - min) / range) * innerH
            return (
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#52555c" strokeWidth="0.5" strokeDasharray="2 3" />
            )
          })()}
          {/* fill area */}
          <path d={`${path} L ${W - PAD} ${H - PAD} L ${PAD} ${H - PAD} Z`} fill="url(#pnl-fill)" />
          {/* line */}
          <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          {/* last point */}
          {stats.series.length > 0 && (() => {
            const min = Math.min(...stats.series)
            const max = Math.max(...stats.series)
            const range = max - min || 1
            const innerW = W - PAD * 2
            const innerH = H - PAD * 2
            const i = stats.series.length - 1
            const stepX = stats.series.length > 1 ? innerW / (stats.series.length - 1) : 0
            const x = PAD + i * stepX
            const y = PAD + innerH - ((stats.series[i] - min) / range) * innerH
            return <circle cx={x} cy={y} r="2.5" fill={lineColor} />
          })()}
        </svg>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="今日" value={fmtPct(stats.latest)} color={colorFor(stats.latest)} />
        <Stat label="累计" value={fmtPct(stats.cumulative)} color={colorFor(stats.cumulative)} />
        <Stat label="胜率" value={`${stats.winRate}%`} color="#a8abb3" />
        <Stat label="回撤" value={fmtPct(stats.maxDrawdown)} color="#22c55e" />
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="flex flex-col items-center text-center py-1.5 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <span className="text-[9px]" style={{ color: '#72757d' }}>{label}</span>
      <span className="text-[12px] font-mono font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
