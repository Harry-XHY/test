import { schedulePush } from './cloudSync.js'

// 提醒 (alerts) — user-defined price/technical triggers checked by the
// cron-check-alerts function. Each alert is local-first and synced to the
// cloud so the cron can read it.
//
// Shape:
//   {
//     id: 'alert_<rand>',
//     code: '600519',
//     name: '贵州茅台',
//     market: 1,                       // 0 = SZ, 1 = SH (matches stockData)
//     type: 'price_above' | 'price_below'
//         | 'change_pct_above' | 'change_pct_below'
//         | 'macd_golden' | 'macd_dead'
//         | 'vol_ratio_above',
//     threshold: 1700,                 // numeric — meaning depends on type
//     enabled: true,
//     triggered: false,
//     triggeredAt: null,
//     hitMessage: null,
//     createdAt: ISO,
//   }

const KEY = 'bangpick_alerts'
const MAX_ITEMS = 30

export const ALERT_TYPES = [
  { value: 'price_above',      label: '价格突破', unit: '元' },
  { value: 'price_below',      label: '价格跌破', unit: '元' },
  { value: 'change_pct_above', label: '涨幅超过', unit: '%' },
  { value: 'change_pct_below', label: '跌幅超过', unit: '%' },
  { value: 'macd_golden',      label: 'MACD金叉', unit: null },
  { value: 'macd_dead',        label: 'MACD死叉', unit: null },
  { value: 'vol_ratio_above',  label: '量比超过', unit: '' },
]

export function getAlerts() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    schedulePush('alerts', () => getAlerts())
  } catch { /* quota */ }
}

function makeId() {
  return 'alert_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function addAlert({ code, name, market, type, threshold }) {
  const list = getAlerts()
  if (list.length >= MAX_ITEMS) list.shift()
  const item = {
    id: makeId(),
    code,
    name,
    market,
    type,
    threshold: typeof threshold === 'number' ? threshold : null,
    enabled: true,
    triggered: false,
    triggeredAt: null,
    hitMessage: null,
    createdAt: new Date().toISOString(),
  }
  list.push(item)
  save(list)
  return item
}

export function removeAlert(id) {
  const list = getAlerts().filter(a => a.id !== id)
  save(list)
  return list
}

export function toggleAlert(id) {
  const list = getAlerts().map(a =>
    a.id === id ? { ...a, enabled: !a.enabled, triggered: false, hitMessage: null } : a
  )
  save(list)
  return list
}

export function describeAlert(a) {
  const t = ALERT_TYPES.find(x => x.value === a.type)
  if (!t) return a.type
  if (t.unit === null) return t.label
  return `${t.label} ${a.threshold}${t.unit}`
}

// Mark an alert as fired so we don't re-notify on every refresh.
// Re-arms when user toggles the alert off/on.
export function markTriggered(id, hitMessage) {
  const list = getAlerts().map(a =>
    a.id === id
      ? { ...a, triggered: true, triggeredAt: new Date().toISOString(), hitMessage }
      : a
  )
  save(list)
}

// Evaluate all enabled, untriggered alerts against fresh quotes.
// `quotesByCode` is { code: { close, changePercent, volRatio, macdSignal } }
// Returns an array of hits: [{ alert, message }]
//
// Supported types (client-side):
//   price_above / price_below       → uses quote.close
//   change_pct_above / below        → uses quote.changePercent
//   vol_ratio_above                 → uses quote.volRatio
//   macd_golden / macd_dead         → uses quote.macdSignal (server-computed)
export function evaluateAlerts(quotesByCode, alerts = getAlerts()) {
  const hits = []
  for (const a of alerts) {
    if (!a.enabled || a.triggered) continue
    const q = quotesByCode[a.code]
    if (!q || q.error || q.suspended) continue

    let hit = false
    let msg = ''
    const name = a.name || a.code

    switch (a.type) {
      case 'price_above':
        if (q.close != null && q.close >= a.threshold) {
          hit = true
          msg = `${name} 现价 ${q.close.toFixed(2)} 元，已突破 ${a.threshold} 元`
        }
        break
      case 'price_below':
        if (q.close != null && q.close <= a.threshold) {
          hit = true
          msg = `${name} 现价 ${q.close.toFixed(2)} 元，已跌破 ${a.threshold} 元`
        }
        break
      case 'change_pct_above':
        if (q.changePercent != null && q.changePercent >= a.threshold) {
          hit = true
          msg = `${name} 涨幅 ${q.changePercent.toFixed(2)}%，已超过 ${a.threshold}%`
        }
        break
      case 'change_pct_below':
        if (q.changePercent != null && q.changePercent <= -Math.abs(a.threshold)) {
          hit = true
          msg = `${name} 跌幅 ${Math.abs(q.changePercent).toFixed(2)}%，已超过 ${a.threshold}%`
        }
        break
      case 'vol_ratio_above':
        if (q.volRatio != null && q.volRatio >= a.threshold) {
          hit = true
          msg = `${name} 量比 ${q.volRatio.toFixed(2)}，已超过 ${a.threshold}`
        }
        break
      case 'macd_golden':
        if (q.macdSignal === 'golden_cross') {
          hit = true
          msg = `${name} MACD 金叉信号已出现`
        }
        break
      case 'macd_dead':
        if (q.macdSignal === 'death_cross') {
          hit = true
          msg = `${name} MACD 死叉信号已出现`
        }
        break
    }

    if (hit) hits.push({ alert: a, message: msg })
  }
  return hits
}
