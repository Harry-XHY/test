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
