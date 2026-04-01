export async function searchStock(keyword) {
  if (!keyword || keyword.trim().length < 1) return []
  const res = await fetch('/api/stock-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: keyword.trim() })
  })
  if (!res.ok) return []
  return res.json()
}

export async function analyzeStock(payload) {
  // payload: { type, ...fields }
  const res = await fetch('/api/stock-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '请求失败')
  }
  return res.json()
}

export async function getStockData(code, market, name) {
  const res = await fetch('/api/stock-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, market, name })
  })
  if (!res.ok) throw new Error('获取行情失败')
  return res.json()
}
