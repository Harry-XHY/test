import { schedulePush } from './cloudSync.js'

// 自选股 (watchlist) — list of stocks the user wants to keep an eye on.
// Shape: [{ code, name, market, addedAt }]

const KEY = 'bangpick_watchlist'
const MAX_ITEMS = 50

export function getWatchlist() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveWatchlist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    schedulePush('watchlist', () => getWatchlist())
  } catch { /* quota exceeded */ }
}

export function isWatched(code) {
  return getWatchlist().some(item => item.code === code)
}

export function addToWatchlist({ code, name, market }) {
  const list = getWatchlist()
  if (list.some(item => item.code === code)) return list
  if (list.length >= MAX_ITEMS) {
    list.shift() // drop oldest when at capacity
  }
  list.push({ code, name, market, addedAt: new Date().toISOString() })
  saveWatchlist(list)
  return list
}

export function removeFromWatchlist(code) {
  const list = getWatchlist().filter(item => item.code !== code)
  saveWatchlist(list)
  return list
}

export function reorderWatchlist(orderedCodes) {
  const list = getWatchlist()
  const byCode = new Map(list.map(item => [item.code, item]))
  const reordered = orderedCodes
    .map(c => byCode.get(c))
    .filter(Boolean)
  // Append any missing items at the end
  list.forEach(item => {
    if (!orderedCodes.includes(item.code)) reordered.push(item)
  })
  saveWatchlist(reordered)
  return reordered
}
