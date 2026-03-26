const HISTORY_KEY = 'bangpick_history'
const PREFS_KEY = 'bangpick_preferences'

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
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
}

export function updateDecision(id, updates) {
  const history = getHistory()
  const idx = history.findIndex((d) => d.id === id)
  if (idx !== -1) {
    history[idx] = { ...history[idx], ...updates }
    safeSet(HISTORY_KEY, history)
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

export function getPreferences() {
  return safeGet(PREFS_KEY, '')
}

export function setPreferences(prefs) {
  safeSet(PREFS_KEY, prefs)
}
