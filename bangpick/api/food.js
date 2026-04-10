// Unified food API — multiplexes search/detail/photo via `action` field
// to stay within Vercel Hobby plan's 12 function limit.

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

// ── Search: Google Places ──
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
    placeId: p.place_id, name: p.name, rating: p.rating || null,
    userRatingsTotal: p.user_ratings_total || 0, priceLevel: p.price_level ?? null,
    types: p.types || [], location: p.geometry?.location || null,
    vicinity: p.vicinity || '',
    photos: (p.photos || []).slice(0, 1).map((ph) => ph.photo_reference),
    distance: Math.round(haversine(lat, lon, p.geometry?.location?.lat, p.geometry?.location?.lng)),
    source: 'google',
  }))
}

// ── Search: Overpass (free OSM) ──
async function searchOverpass({ lat, lon, radius, keyword }) {
  const r = radius || 1500
  const amenities = 'restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|bakery'
  let nameFilter = ''
  if (keyword) nameFilter = `["name"~"${keyword}",i]`
  const query = `[out:json][timeout:15];(node["amenity"~"${amenities}"]${nameFilter}(around:${r},${lat},${lon});way["amenity"~"${amenities}"]${nameFilter}(around:${r},${lat},${lon}););out center body 60;`
  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!resp.ok) throw new Error(`Overpass API: ${resp.status}`)
  const data = await resp.json()
  return (data.elements || []).map((el) => {
    const elLat = el.lat || el.center?.lat; const elLon = el.lon || el.center?.lon
    if (!elLat || !elLon) return null
    const tags = el.tags || {}
    return {
      placeId: `osm_${el.type}_${el.id}`, name: tags.name || tags['name:en'] || tags['name:zh'] || 'Unknown',
      rating: null, userRatingsTotal: 0, priceLevel: null,
      types: [tags.amenity, tags.cuisine].filter(Boolean),
      location: { lat: elLat, lng: elLon },
      vicinity: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(' ') || '',
      phone: tags.phone || tags['contact:phone'] || null,
      website: tags.website || tags['contact:website'] || null,
      openingHours: tags.opening_hours || null, cuisine: tags.cuisine || null,
      photos: [], distance: Math.round(haversine(lat, lon, elLat, elLon)), source: 'osm',
    }
  }).filter(Boolean).sort((a, b) => a.distance - b.distance).slice(0, 60)
}

// ── Detail: Google ──
async function detailGoogle(placeId, language) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,opening_hours,website,price_level,reviews,photos,geometry',
    key: GOOGLE_KEY, language: language || 'zh-CN',
  })
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
  const data = await r.json()
  if (data.status !== 'OK') throw new Error(`Google Places Detail: ${data.status}`)
  const p = data.result
  return {
    placeId, name: p.name, rating: p.rating || null, userRatingsTotal: p.user_ratings_total || 0,
    address: p.formatted_address || '', phone: p.formatted_phone_number || null,
    website: p.website || null, priceLevel: p.price_level ?? null,
    openingHours: p.opening_hours?.weekday_text || null, isOpen: p.opening_hours?.open_now ?? null,
    reviews: (p.reviews || []).slice(0, 5).map(rv => ({ author: rv.author_name, rating: rv.rating, text: rv.text, time: rv.relative_time_description })),
    photos: (p.photos || []).slice(0, 5).map(ph => ph.photo_reference),
    location: p.geometry?.location || null, source: 'google',
  }
}

// ── Detail: OSM ──
async function detailOSM(placeId) {
  const parts = placeId.split('_')
  if (parts.length < 3) throw new Error('Invalid OSM placeId')
  const [, type, id] = parts
  const query = `[out:json][timeout:10];${type}(${id});out body;`
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!r.ok) throw new Error(`Overpass: ${r.status}`)
  const data = await r.json()
  const el = data.elements?.[0]
  if (!el) throw new Error('Not found')
  const tags = el.tags || {}
  return {
    placeId, name: tags.name || tags['name:en'] || 'Unknown', rating: null, userRatingsTotal: 0,
    address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city'], tags['addr:country']].filter(Boolean).join(', ') || '',
    phone: tags.phone || tags['contact:phone'] || null, website: tags.website || tags['contact:website'] || null,
    priceLevel: null, openingHours: tags.opening_hours ? [tags.opening_hours] : null, isOpen: null,
    reviews: [], photos: [], cuisine: tags.cuisine || null,
    location: el.lat && el.lon ? { lat: el.lat, lng: el.lon } : null, source: 'osm',
  }
}

export default async function handler(req, res) {
  try {
    const { action, ...params } = req.body || {}

    if (action === 'search') {
      const { lat, lon } = params
      if (!lat || !lon) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'lat and lon required' })) }
      const results = GOOGLE_KEY ? await searchGoogle(params) : await searchOverpass(params)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(results))
    }

    if (action === 'detail') {
      const { placeId, language } = params
      if (!placeId) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'placeId required' })) }
      const result = placeId.startsWith('osm_') ? await detailOSM(placeId) : GOOGLE_KEY ? await detailGoogle(placeId, language) : (() => { throw new Error('No Google key and not an OSM place') })()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(result))
    }

    if (action === 'photo') {
      const { ref, maxwidth } = params
      if (!ref || !GOOGLE_KEY) { res.writeHead(501, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Photo not available' })) }
      const url = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${ref}&maxwidth=${maxwidth || 400}&key=${GOOGLE_KEY}`
      const r = await fetch(url, { redirect: 'follow' })
      if (!r.ok) { res.writeHead(r.status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: `Photo fetch failed: ${r.status}` })) }
      const buffer = Buffer.from(await r.arrayBuffer())
      res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' })
      return res.end(buffer)
    }

    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unknown action. Use: search, detail, photo' }))
  } catch (err) {
    console.error('[food]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
