import { schedulePush } from './cloudSync.js'

const STORAGE_KEY = 'bangpick_holdings'

export function getHoldings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addHolding({ code, name, market, costPrice }) {
  const holdings = getHoldings()
  // Avoid duplicates by code
  const existing = holdings.findIndex(h => h.code === code)
  const entry = { code, name, market, costPrice: parseFloat(costPrice), addedAt: new Date().toISOString() }
  if (existing >= 0) {
    holdings[existing] = entry
  } else {
    holdings.push(entry)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  schedulePush('holdings', () => getHoldings())
  return holdings
}

export function removeHolding(code) {
  const holdings = getHoldings().filter(h => h.code !== code)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  schedulePush('holdings', () => getHoldings())
  return holdings
}

// Stock chat history
const CHAT_KEY = 'bangpick_stock_chat'

export function getStockChat() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveStockChat(messages) {
  try {
    // Keep last 50 messages max
    const trimmed = messages.slice(-50)
    localStorage.setItem(CHAT_KEY, JSON.stringify(trimmed))
    schedulePush('stockChat', () => getStockChat())
  } catch { /* quota exceeded */ }
}

export function clearStockChat() {
  localStorage.removeItem(CHAT_KEY)
  schedulePush('stockChat', () => [])
}
