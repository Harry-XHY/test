// Food search API — proxies Google Places Nearby Search or falls back to
// Overpass API (free OSM data) when no Google key is configured.

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Google Places Nearby Search ──
async function searchGoogle({ lat, lon, radius, keyword, type, language }) {
  const params = new URLSearchParams({
    location: `${lat},${lon}`,
    radius: String(radius || 1500),
    type: type || 'restaurant',
    key: GOOGLE_KEY,
    language: language || 'zh-CN',
  })
  if (keyword) params.set('keyword', keyword)

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  const r = await fetch(url)
  const data = await r.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places: ${data.status} — ${data.error_message || ''}`)
  }

  return (data.results || []).map((p) => ({
    placeId: p.place_id,
    name: p.name,
    rating: p.rating || null,
    userRatingsTotal: p.user_ratings_total || 0,
    priceLevel: p.price_level ?? null,
    types: p.types || [],
    location: p.geometry?.location || null,
    vicinity: p.vicinity || '',
    photos: (p.photos || []).slice(0, 1).map((ph) => ph.photo_reference),
    distance: Math.round(haversine(lat, lon, p.geometry?.location?.lat, p.geometry?.location?.lng)),
    source: 'google',
  }))
}

// ── Overpass API (free, global OSM data) ──
async function searchOverpass({ lat, lon, radius, keyword }) {
  const r = radius || 1500
  // Search for restaurants, cafes, fast_food within radius
  const amenities = 'restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|bakery'
  let nameFilter = ''
  if (keyword) {
    nameFilter = `["name"~"${keyword}",i]`
  }

  const query = `
[out:json][timeout:15];
(
  node["amenity"~"${amenities}"]${nameFilter}(around:${r},${lat},${lon});
  way["amenity"~"${amenities}"]${nameFilter}(around:${r},${lat},${lon});
);
out center body 60;
`
  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!resp.ok) throw new Error(`Overpass API: ${resp.status}`)
  const data = await resp.json()

  return (data.elements || [])
    .map((el) => {
      const elLat = el.lat || el.center?.lat
      const elLon = el.lon || el.center?.lon
      if (!elLat || !elLon) return null

      const tags = el.tags || {}
      return {
        placeId: `osm_${el.type}_${el.id}`,
        name: tags.name || tags['name:en'] || tags['name:zh'] || 'Unknown',
        rating: null,
        userRatingsTotal: 0,
        priceLevel: null,
        types: [tags.amenity, tags.cuisine].filter(Boolean),
        location: { lat: elLat, lng: elLon },
        vicinity: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(' ') || '',
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        openingHours: tags.opening_hours || null,
        cuisine: tags.cuisine || null,
        photos: [],
        distance: Math.round(haversine(lat, lon, elLat, elLon)),
        source: 'osm',
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 60)
}

export default async function handler(req, res) {
  try {
    const { lat, lon, radius, keyword, type, language } = req.body || {}
    if (!lat || !lon) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'lat and lon required' }))
    }

    let results
    if (GOOGLE_KEY) {
      results = await searchGoogle({ lat, lon, radius, keyword, type, language })
    } else {
      results = await searchOverpass({ lat, lon, radius, keyword })
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(results))
  } catch (err) {
    console.error('[food-search]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
