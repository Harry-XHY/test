export async function searchNearbyFood({ lat, lon, radius, keyword, type, language, dietaryProfile }) {
  // Retry once on failure (Overpass can be flaky)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', lat, lon, radius: radius || 1500, keyword, type, language, dietaryProfile }),
      })
      if (r.ok) return r.json()
      if (attempt === 0 && r.status >= 500) {
        await new Promise(ok => setTimeout(ok, 1500))
        continue
      }
      throw new Error(`Search failed: ${r.status}`)
    } catch (err) {
      if (attempt === 1) throw err
      await new Promise(ok => setTimeout(ok, 1500))
    }
  }
}

export async function getFoodDetail(placeId, language) {
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'detail', placeId, language }),
  })
  if (!r.ok) throw new Error(`Detail failed: ${r.status}`)
  return r.json()
}

export async function getRecommendations({ query, restaurants, lang, country, currency, dietaryProfile }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000) // 20s timeout
  try {
    const r = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recommend', query, restaurants, lang, country, currency, dietaryProfile }),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`Recommend failed: ${r.status}`)
    return r.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function getDishSuggestions({ name, cuisine, lang, country, currency }) {
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dish-suggest', name, cuisine, lang, country, currency }),
  })
  if (!r.ok) return []
  return r.json()
}

export async function parseIntent(text, lang, country) {
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'parse-intent', text, lang, country }),
  })
  if (!r.ok) return { type: 'food_search', keyword: text, cuisine: null, radius: null, reply: '', suggestions: [] }
  return r.json()
}
