// Food detail API — Google Places Details or OSM detail lookup.

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

async function detailGoogle(placeId, language) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,opening_hours,website,price_level,reviews,photos,geometry',
    key: GOOGLE_KEY,
    language: language || 'zh-CN',
  })
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
  const data = await r.json()
  if (data.status !== 'OK') throw new Error(`Google Places Detail: ${data.status}`)

  const p = data.result
  return {
    placeId,
    name: p.name,
    rating: p.rating || null,
    userRatingsTotal: p.user_ratings_total || 0,
    address: p.formatted_address || '',
    phone: p.formatted_phone_number || null,
    website: p.website || null,
    priceLevel: p.price_level ?? null,
    openingHours: p.opening_hours?.weekday_text || null,
    isOpen: p.opening_hours?.open_now ?? null,
    reviews: (p.reviews || []).slice(0, 5).map(rv => ({
      author: rv.author_name,
      rating: rv.rating,
      text: rv.text,
      time: rv.relative_time_description,
    })),
    photos: (p.photos || []).slice(0, 5).map(ph => ph.photo_reference),
    location: p.geometry?.location || null,
    source: 'google',
  }
}

async function detailOSM(placeId) {
  // placeId format: osm_node_12345 or osm_way_12345
  const parts = placeId.split('_')
  if (parts.length < 3) throw new Error('Invalid OSM placeId')
  const [, type, id] = parts

  const query = `[out:json][timeout:10];${type}(${id});out body;`
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!r.ok) throw new Error(`Overpass: ${r.status}`)
  const data = await r.json()
  const el = data.elements?.[0]
  if (!el) throw new Error('Not found')

  const tags = el.tags || {}
  return {
    placeId,
    name: tags.name || tags['name:en'] || 'Unknown',
    rating: null,
    userRatingsTotal: 0,
    address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city'], tags['addr:country']].filter(Boolean).join(', ') || '',
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    priceLevel: null,
    openingHours: tags.opening_hours ? [tags.opening_hours] : null,
    isOpen: null,
    reviews: [],
    photos: [],
    cuisine: tags.cuisine || null,
    location: el.lat && el.lon ? { lat: el.lat, lng: el.lon } : null,
    source: 'osm',
  }
}

export default async function handler(req, res) {
  try {
    const { placeId, language } = req.body || {}
    if (!placeId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'placeId required' }))
    }

    let result
    if (placeId.startsWith('osm_')) {
      result = await detailOSM(placeId)
    } else if (GOOGLE_KEY) {
      result = await detailGoogle(placeId, language)
    } else {
      throw new Error('No Google key and not an OSM place')
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result))
  } catch (err) {
    console.error('[food-detail]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
