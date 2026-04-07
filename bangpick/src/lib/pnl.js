// P&L helpers — fetches snapshots written by api/cron-snapshot.js and
// computes summary stats (latest avg %, best/worst day, simple drawdown).

import { getDeviceId } from './cloudSync.js'

const LOCAL_KEY = 'bangpick_snapshots'

export async function fetchSnapshots({ refresh = true } = {}) {
  // Try local cache first for instant render.
  let local = []
  try { local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') } catch { local = [] }

  if (!refresh) return Array.isArray(local) ? local : []

  const deviceId = getDeviceId()
  if (!deviceId) return Array.isArray(local) ? local : []
  try {
    const r = await fetch(`/api/sync?deviceId=${deviceId}&key=snapshots`)
    if (!r.ok) return local
    const json = await r.json()
    const value = Array.isArray(json?.value) ? json.value : []
    if (value.length > 0) {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(value)) } catch { /* ignore */ }
      return value
    }
    return local
  } catch {
    return local
  }
}

// Computes summary stats from a sorted-ascending snapshot list.
//   latest:    most recent day's avgPct
//   cumulative: sum of daily changes (latest minus first), in pp
//   best/worst: highest / lowest avgPct day
//   winDays:   days with avgPct > 0 / total
//   maxDrawdown: largest peak-to-trough decline of avgPct series, in pp
export function computeStats(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return null
  }
  const sorted = [...snapshots]
    .filter(s => s?.date && s?.total)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  if (sorted.length === 0) return null

  const series = sorted.map(s => Number(s.total.avgPct) || 0)
  const latest = series[series.length - 1]
  const first = series[0]
  const cumulative = latest - first
  const best = Math.max(...series)
  const worst = Math.min(...series)
  const winDays = series.filter(v => v > 0).length

  let peak = -Infinity
  let maxDrawdown = 0
  for (const v of series) {
    if (v > peak) peak = v
    const dd = v - peak
    if (dd < maxDrawdown) maxDrawdown = dd
  }

  return {
    days: sorted.length,
    latest,
    cumulative,
    best,
    worst,
    winRate: Math.round((winDays / sorted.length) * 100),
    maxDrawdown,
    series,
    dates: sorted.map(s => s.date),
    latestSnapshot: sorted[sorted.length - 1],
  }
}
