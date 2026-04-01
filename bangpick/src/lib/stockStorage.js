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
  return holdings
}

export function removeHolding(code) {
  const holdings = getHoldings().filter(h => h.code !== code)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  return holdings
}
