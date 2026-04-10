export async function searchNearbyFood({ lat, lon, radius, keyword, type, language }) {
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search', lat, lon, radius: radius || 1500, keyword, type, language }),
  })
  if (!r.ok) throw new Error(`Search failed: ${r.status}`)
  return r.json()
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
