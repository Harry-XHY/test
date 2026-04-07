import { schedulePush } from './cloudSync.js'

const HISTORY_KEY = 'bangpick_history'

export function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function getHistory() {
  return safeGet(HISTORY_KEY, [])
}

export function saveDecision(decision) {
  const history = getHistory()
  history.unshift(decision)
  if (history.length > 100) history.pop()
  safeSet(HISTORY_KEY, history)
  schedulePush('history', () => safeGet(HISTORY_KEY, []))
}

export function clearHistory() {
  safeSet(HISTORY_KEY, [])
  schedulePush('history', () => [])
}
