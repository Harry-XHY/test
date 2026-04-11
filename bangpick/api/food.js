// Unified food API — multiplexes search/detail/photo via `action` field
// to stay within Vercel Hobby plan's 12 function limit.

import { chatComplete } from './_aiProvider.js'

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const FOURSQUARE_KEY = process.env.FOURSQUARE_API_KEY || ''
const PEXELS_KEY = process.env.PEXELS_API_KEY || ''

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

// ── Search: Google Places (New) ──
async function searchGoogle({ lat, lon, radius, keyword, type, language }) {
  const body = {
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lon }, radius: radius || 1500 },
    },
    includedTypes: [type || 'restaurant'],
    maxResultCount: 20,
    languageCode: language || 'zh-CN',
  }
  if (keyword) body.textQuery = keyword
  const fields = 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.types,places.location,places.shortFormattedAddress,places.photos'
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': fields,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  const data = await r.json()
  if (data.error) throw new Error(`Google Places: ${data.error.message}`)
  return (data.places || []).map((p) => ({
    placeId: p.id, name: p.displayName?.text || '', rating: p.rating || null,
    userRatingsTotal: p.userRatingCount || 0,
    priceLevel: p.priceLevel ? ['FREE','INEXPENSIVE','MODERATE','EXPENSIVE','VERY_EXPENSIVE'].indexOf(p.priceLevel) : null,
    types: p.types || [], location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
    vicinity: p.shortFormattedAddress || '',
    photos: (p.photos || []).slice(0, 1).map((ph) => ph.name),
    distance: p.location ? Math.round(haversine(lat, lon, p.location.latitude, p.location.longitude)) : 0,
    source: 'google',
  }))
}

// ── Search: Overpass (free OSM) with caching + mirror fallback ──
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const searchCache = new Map()
const SEARCH_CACHE_TTL = 5 * 60 * 1000 // 5 min
let lastOverpassCall = 0
const OVERPASS_MIN_GAP = 2000 // min 2s between calls to avoid 429

function searchCacheKey(lat, lon, radius, keyword) {
  return `${(lat * 100 | 0)}_${(lon * 100 | 0)}_${radius}_${keyword || ''}`
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchOverpass(query) {
  // Rate-limit: wait if last call was too recent
  const gap = Date.now() - lastOverpassCall
  if (gap < OVERPASS_MIN_GAP) await sleep(OVERPASS_MIN_GAP - gap)

  for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
    try {
      lastOverpassCall = Date.now()
      const resp = await fetch(OVERPASS_MIRRORS[i], {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12000),
      })
      if (resp.ok) {
        console.log(`[food] Overpass mirror ${i} ok`)
        return await resp.json()
      }
      console.log(`[food] Overpass mirror ${i}: ${resp.status}`)
      if (resp.status === 429) await sleep(3000) // back off on rate limit
    } catch (err) {
      console.log(`[food] Overpass mirror ${i} failed: ${err.message}`)
    }
  }
  return null // return null instead of throwing — caller handles gracefully
}

// Map filter keys to OSM cuisine/amenity values for Overpass queries
const CUISINE_MAP = {
  chinese: 'chinese', japanese: 'japanese;sushi;ramen', korean: 'korean',
  western: 'western;american;european', fast_food: '__amenity:fast_food',
  cafe: '__amenity:cafe', dessert: 'cake;ice_cream;dessert;pastry',
  bar: '__amenity:bar;pub', hotpot: 'hotpot', noodle: 'noodles;ramen;udon',
  ramen: 'ramen', sushi: 'sushi', izakaya: 'izakaya',
  udon: 'udon', tempura: 'tempura', yakitori: 'yakitori',
  convenience: '__amenity:convenience', curry: 'curry',
  french: 'french', bistro: 'bistro;french', boulangerie: '__amenity:bakery',
  patisserie: 'pastry;cake', italian: 'italian;pizza;pasta',
  wine_bar: 'wine_bar', brasserie: 'brasserie;french',
  tapas: 'tapas;spanish', paella: 'spanish;paella', churros: 'churros;spanish',
  pintxos: 'pintxos;spanish', seafood: 'seafood;fish',
  bocadillo: 'sandwich', burger: 'burger', pizza: 'pizza',
  mexican: 'mexican', bbq: 'barbecue;bbq', steak: 'steak',
  brunch: 'breakfast;brunch',
}

async function searchOverpass({ lat, lon, radius, keyword, language }) {
  const r = radius || 1500
  const cKey = searchCacheKey(lat, lon, r, keyword)
  const cached = searchCache.get(cKey)
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) {
    console.log('[food] search cache hit')
    return cached.data
  }

  const amenities = 'restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|bakery'
  let extraFilter = ''
  if (keyword) {
    const mapped = CUISINE_MAP[keyword]
    if (mapped) {
      // Check if it's an amenity-type filter (e.g. cafe, fast_food)
      const amenityVals = []
      const cuisineVals = []
      for (const v of mapped.split(';')) {
        if (v.startsWith('__amenity:')) amenityVals.push(v.replace('__amenity:', ''))
        else cuisineVals.push(v)
      }
      if (amenityVals.length && !cuisineVals.length) {
        extraFilter = `["amenity"~"${amenityVals.join('|')}"]`
      } else if (cuisineVals.length) {
        extraFilter = `["cuisine"~"${cuisineVals.join('|')}",i]`
      }
    } else {
      // Free-text: search by name or cuisine
      extraFilter = `["name"~"${keyword}",i]`
    }
  }
  const query = keyword && extraFilter.includes('"amenity"')
    ? `[out:json][timeout:15];(node${extraFilter}(around:${r},${lat},${lon});way${extraFilter}(around:${r},${lat},${lon}););out center body 60;`
    : `[out:json][timeout:15];(node["amenity"~"${amenities}"]${extraFilter}(around:${r},${lat},${lon});way["amenity"~"${amenities}"]${extraFilter}(around:${r},${lat},${lon}););out center body 60;`

  const data = await fetchOverpass(query)
  if (!data) return [] // all mirrors failed — return empty gracefully
  const langCode = (language || '').split('-')[0]
  const results = (data.elements || []).map((el) => {
    const elLat = el.lat || el.center?.lat; const elLon = el.lon || el.center?.lon
    if (!elLat || !elLon) return null
    const tags = el.tags || {}
    const localName = langCode ? tags[`name:${langCode}`] : null
    return {
      placeId: `osm_${el.type}_${el.id}`, name: localName || tags.name || tags['name:en'] || tags['name:zh'] || 'Unknown',
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

  searchCache.set(cKey, { data: results, ts: Date.now() })
  if (searchCache.size > 50) { const first = searchCache.keys().next().value; searchCache.delete(first) }
  return results
}

// ── Search: Foursquare Places v3 (free 100K calls/month) ──
async function searchFoursquare({ lat, lon, radius, keyword }) {
  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    radius: String(Math.min(radius || 1500, 100000)),
    limit: '50',
    sort: 'DISTANCE',
    fields: 'fsq_id,name,geocodes,location,categories,distance,rating,price,photos,tel,website',
  })
  if (keyword) params.set('query', keyword)
  const resp = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
    headers: { Authorization: FOURSQUARE_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!resp.ok) throw new Error(`Foursquare: ${resp.status}`)
  const data = await resp.json()
  return (data.results || []).map(p => {
    const loc = p.geocodes?.main
    return {
      placeId: `fsq_${p.fsq_id}`,
      name: p.name,
      rating: p.rating ? +(p.rating / 2).toFixed(1) : null, // FSQ 0-10 → 0-5
      userRatingsTotal: 0,
      priceLevel: p.price ?? null,
      types: (p.categories || []).map(c => c.short_name),
      location: loc ? { lat: loc.latitude, lng: loc.longitude } : null,
      vicinity: p.location?.formatted_address || p.location?.address || '',
      phone: p.tel || null,
      website: p.website || null,
      cuisine: (p.categories || []).map(c => c.short_name).join(';'),
      photos: (p.photos || []).slice(0, 3).map(ph => `${ph.prefix}original${ph.suffix}`),
      distance: p.distance || (loc ? Math.round(haversine(lat, lon, loc.latitude, loc.longitude)) : 0),
      source: 'foursquare',
    }
  })
}

// ── Detail: Foursquare ──
async function detailFoursquare(fsqId) {
  const fields = 'fsq_id,name,geocodes,location,categories,rating,price,tel,website,hours,photos,tips,description'
  const resp = await fetch(`https://api.foursquare.com/v3/places/${fsqId}?fields=${fields}`, {
    headers: { Authorization: FOURSQUARE_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!resp.ok) throw new Error(`Foursquare detail: ${resp.status}`)
  const p = await resp.json()
  const loc = p.geocodes?.main
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return {
    placeId: `fsq_${p.fsq_id}`,
    name: p.name,
    rating: p.rating ? +(p.rating / 2).toFixed(1) : null,
    userRatingsTotal: 0,
    address: p.location?.formatted_address || '',
    phone: p.tel || null,
    website: p.website || null,
    priceLevel: p.price ?? null,
    openingHours: p.hours?.display ? [p.hours.display] : (p.hours?.regular || []).map(h =>
      `${days[h.day - 1] || ''}: ${h.open || ''}-${h.close || ''}`
    ).filter(Boolean),
    isOpen: p.hours?.open_now ?? null,
    reviews: (p.tips || []).slice(0, 5).map(tip => ({
      author: 'Visitor',
      rating: null,
      text: tip.text,
      time: tip.created_at ? new Date(tip.created_at).toLocaleDateString() : null,
    })),
    photos: (p.photos || []).slice(0, 5).map(ph => `${ph.prefix}original${ph.suffix}`),
    location: loc ? { lat: loc.latitude, lng: loc.longitude } : null,
    cuisine: (p.categories || []).map(c => c.short_name).join(';'),
    source: 'foursquare',
  }
}

// ── Detail: Google (New) ──
async function detailGoogle(placeId, language) {
  const fields = 'id,displayName,types,rating,userRatingCount,formattedAddress,nationalPhoneNumber,currentOpeningHours,websiteUri,priceLevel,reviews,photos,location'
  const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${language || 'zh-CN'}`, {
    headers: { 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': fields },
    signal: AbortSignal.timeout(10000),
  })
  const data = await r.json()
  if (data.error) throw new Error(`Google Places Detail: ${data.error.message}`)
  const p = data
  return {
    placeId, name: p.displayName?.text || '', rating: p.rating || null, userRatingsTotal: p.userRatingCount || 0,
    address: p.formattedAddress || '', phone: p.nationalPhoneNumber || null,
    website: p.websiteUri || null,
    priceLevel: p.priceLevel ? ['FREE','INEXPENSIVE','MODERATE','EXPENSIVE','VERY_EXPENSIVE'].indexOf(p.priceLevel) : null,
    openingHours: p.currentOpeningHours?.weekdayDescriptions || null,
    isOpen: p.currentOpeningHours?.openNow ?? null,
    reviews: (p.reviews || []).slice(0, 5).map(rv => ({ author: rv.authorAttribution?.displayName || '', rating: rv.rating, text: rv.text?.text || '', time: rv.relativePublishTimeDescription || '' })),
    photos: (p.photos || []).slice(0, 5).map(ph => ph.name),
    types: p.types || [],
    cuisine: (p.types || [])
      .filter(t => !['point_of_interest','establishment','food','store','meal_takeaway','meal_delivery'].includes(t))
      .map(t => t.replace(/_restaurant$/, '').replace(/_store$/, '').replace(/_shop$/, '').replace(/_house$/, ''))
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 3)
      .join(';') || null,
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null, source: 'google',
  }
}

// ── Detail: OSM (with in-memory cache) ──
const osmDetailCache = new Map()

async function detailOSM(placeId) {
  if (osmDetailCache.has(placeId)) return osmDetailCache.get(placeId)

  const parts = placeId.split('_')
  if (parts.length < 3) throw new Error('Invalid OSM placeId')
  const [, type, id] = parts
  const query = `[out:json][timeout:10];${type}(${id});out body;`
  const data = await fetchOverpass(query)
  if (!data) throw new Error('Overpass unavailable')
  const el = data.elements?.[0]
  if (!el) throw new Error('Not found')
  const tags = el.tags || {}
  const result = {
    placeId, name: tags.name || tags['name:en'] || 'Unknown', rating: null, userRatingsTotal: 0,
    address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city'], tags['addr:country']].filter(Boolean).join(', ') || '',
    phone: tags.phone || tags['contact:phone'] || null, website: tags.website || tags['contact:website'] || null,
    priceLevel: null, openingHours: tags.opening_hours ? [tags.opening_hours] : null, isOpen: null,
    reviews: [], photos: [], cuisine: tags.cuisine || null,
    location: el.lat && el.lon ? { lat: el.lat, lng: el.lon } : null, source: 'osm',
  }
  osmDetailCache.set(placeId, result)
  if (osmDetailCache.size > 200) { const first = osmDetailCache.keys().next().value; osmDetailCache.delete(first) }
  return result
}

// ── TheMealDB (free dish database with photos) ──
const MEALDB_AREA = { CN: 'Chinese', JP: 'Japanese', FR: 'French', ES: 'Spanish', US: 'American' }
const mealDbCache = new Map()

async function fetchMealDbDishes(country) {
  const area = MEALDB_AREA[country]
  if (!area) return []
  if (mealDbCache.has(area)) return mealDbCache.get(area)
  try {
    const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return []
    const data = await resp.json()
    const meals = (data.meals || []).map(m => ({
      name: m.strMeal,
      image: m.strMealThumb ? `${m.strMealThumb}/preview` : null, // /preview = 250x250
      id: m.idMeal,
    }))
    mealDbCache.set(area, meals)
    if (mealDbCache.size > 10) { const first = mealDbCache.keys().next().value; mealDbCache.delete(first) }
    return meals
  } catch { return [] }
}

export default async function handler(req, res) {
  try {
    // GET handler: photo proxy + image search
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const action = url.searchParams.get('action')

      // Google Places (New) photo proxy — ref is "places/xxx/photos/yyy"
      if (action === 'photo') {
        const ref = url.searchParams.get('ref')
        const maxwidth = url.searchParams.get('maxwidth') || '400'
        if (!ref || !GOOGLE_KEY) { res.writeHead(404); return res.end() }
        try {
          const photoUrl = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxwidth}&key=${GOOGLE_KEY}`
          const r = await fetch(photoUrl, { redirect: 'follow', signal: AbortSignal.timeout(10000) })
          if (!r.ok) { res.writeHead(r.status); return res.end() }
          const buffer = Buffer.from(await r.arrayBuffer())
          res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' })
          return res.end(buffer)
        } catch { res.writeHead(502); return res.end() }
      }

      // Pexels food image search (fallback for dishes without real photos)
      if (action === 'food-image') {
        const q = url.searchParams.get('q')
        if (!q || !PEXELS_KEY) { res.writeHead(404); return res.end() }
        try {
          const resp = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q + ' food dish')}&per_page=1&size=small`, {
            headers: { Authorization: PEXELS_KEY },
            signal: AbortSignal.timeout(8000),
          })
          if (!resp.ok) { res.writeHead(resp.status); return res.end() }
          const data = await resp.json()
          const imgUrl = data.photos?.[0]?.src?.medium
          if (!imgUrl) { res.writeHead(404); return res.end() }
          const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) })
          if (!imgResp.ok) { res.writeHead(imgResp.status); return res.end() }
          const buffer = Buffer.from(await imgResp.arrayBuffer())
          res.writeHead(200, { 'Content-Type': imgResp.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=604800' })
          return res.end(buffer)
        } catch { res.writeHead(502); return res.end() }
      }

      res.writeHead(400); return res.end('Unknown GET action')
    }

    const { action, ...params } = req.body || {}

    if (action === 'search') {
      const { lat, lon } = params
      if (!lat || !lon) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'lat and lon required' })) }
      let results = []
      // Priority: Google Places (New) → Overpass (free fallback)
      const backends = [
        GOOGLE_KEY && (() => searchGoogle(params)),
        () => searchOverpass(params),
      ].filter(Boolean)
      for (const backend of backends) {
        try {
          results = await backend()
          if (results && results.length > 0) break
        } catch (err) {
          console.error('[food] search backend error:', err.message)
        }
      }
      // Sort by composite score: distance (40%) + rating (35%) + popularity (25%)
      if (results && results.length > 1) {
        results.sort((a, b) => {
          const ds = (d) => 1 - Math.min(d || 9999, 2000) / 2000
          const rs = (r) => (r || 3) / 5
          const ps = (p) => Math.min(p || 0, 500) / 500
          const scoreA = ds(a.distance) * 0.4 + rs(a.rating) * 0.35 + ps(a.userRatingsTotal) * 0.25
          const scoreB = ds(b.distance) * 0.4 + rs(b.rating) * 0.35 + ps(b.userRatingsTotal) * 0.25
          return scoreB - scoreA
        })
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(results || []))
    }

    if (action === 'detail') {
      const { placeId, language } = params
      if (!placeId) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'placeId required' })) }
      let result
      if (placeId.startsWith('osm_')) {
        result = await detailOSM(placeId)
      } else {
        result = GOOGLE_KEY ? await detailGoogle(placeId, language) : (() => { throw new Error('No Google key') })()
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(result))
    }

    if (action === 'recommend') {
      const { query, restaurants: rList, lang, country, currency } = params
      if (!query) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'query required' })) }

      // Build restaurant context (compact, top 10 by distance)
      const topR = (rList || []).slice(0, 10)
      const rContext = topR.map((r, i) =>
        `${i + 1}. ${r.name}|${(r.cuisine || r.types?.slice(0,2).join(',') || '?')}|${r.distance}m|${r.rating || '?'}|${r.placeId}`
      ).join('\n')

      const isZh = !lang || lang.startsWith('zh')
      const langNames = { en: 'English', ja: '日本語', es: 'español', fr: 'français' }
      const langName = langNames[lang?.split('-')[0]] || lang || '中文'
      const cur = currency || '¥'

      const systemPrompt = isZh
        ? `从附近餐厅列表中选2-3家推荐。返回JSON数组：[{"placeId":"从列表选","name":"店名","reason":"推荐理由15字","dishes":[{"name":"菜名","price":价格,"desc":"15字推荐理由","emoji":"🍖"}],"estimatedTotal":人均,"highlights":["标签"],"matchScore":0-100}]。价格${cur}。只返回JSON。`
        : `Pick 2-3 from the nearby list. Return JSON: [{"placeId":"from list","name":"","reason":"brief why","dishes":[{"name":"","price":num,"desc":"15 word reason","emoji":"🍖"}],"estimatedTotal":num,"highlights":["tag"],"matchScore":0-100}]. Prices ${cur}. ${langName} only. JSON only.`

      try {
        const result = await chatComplete({
          system: systemPrompt,
          messages: [{ role: 'user', content: `"${query}" | ${country || '?'}\n${rContext}` }],
          maxTokens: 800,
        })
        let parsed
        try { parsed = JSON.parse(result.text) } catch {
          const m = result.text.match(/\[[\s\S]*\]/)
          if (m) try { parsed = JSON.parse(m[0]) } catch {}
        }
        if (!Array.isArray(parsed)) parsed = parsed ? [parsed] : []
        // Enrich with location/distance from original restaurant list
        for (const rec of parsed) {
          const orig = topR.find(r => r.placeId === rec.placeId)
          if (orig) {
            rec.location = orig.location
            rec.distance = orig.distance
            rec.rating = orig.rating
            rec.photos = orig.photos
            rec.source = orig.source
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(parsed))
      } catch (err) {
        console.error('[food] recommend error:', err.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: err.message }))
      }
    }

    if (action === 'dish-suggest') {
      const { name, cuisine, lang, country, currency } = params
      if (!name) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'name required' })) }
      const isZh = !lang || lang.startsWith('zh')
      const cur = currency || '¥'
      const langNames = { en: 'English', ja: '日本語', es: 'español', fr: 'français' }
      const langName = langNames[lang?.split('-')[0]] || lang || '中文'

      const systemPrompt = isZh
        ? `推荐餐厅招牌菜4道。返回JSON数组：[{"name":"菜名","price":价格数字,"desc":"15-20字推荐理由，写口感食材做法亮点"}]。价格${cur}，参考${country || '中国'}物价。只返回JSON。`
        : `Suggest 4 signature dishes. Return JSON: [{"name":"dish","price":number,"desc":"15-20 words: texture, ingredients, technique"}]. Prices in ${cur} for ${country || 'the region'}. ${langName} only. JSON only.`
      try {
        const aiResult = await chatComplete({
          system: systemPrompt,
          messages: [{ role: 'user', content: `${name} | ${cuisine || '?'}` }],
          maxTokens: 512,
        })
        let parsed
        try { parsed = JSON.parse(aiResult.text) } catch {
          const m = aiResult.text.match(/\[[\s\S]*\]/)
          if (m) try { parsed = JSON.parse(m[0]) } catch {}
        }
        if (!Array.isArray(parsed)) parsed = []
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(parsed.slice(0, 4)))
      } catch (err) {
        console.error('[food] dish-suggest error:', err.message)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify([]))
      }
    }

    if (action === 'parse-intent') {
      const { text, lang, country } = params
      if (!text) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'text required' })) }
      const isZh = !lang || lang.startsWith('zh')
      const systemPrompt = isZh
        ? `你是美食搜索意图解析器。用户会用自然语言描述想吃什么，你需要提取搜索参数。
返回纯JSON：{"keyword":"搜索关键词","cuisine":"菜系类型(如ramen/sushi/tapas/burger等，可选)","radius":搜索半径米数(默认1500)}
只返回JSON，不要其他内容。如果无法解析，返回 {"keyword":"原始文本"}`
        : `You are a food search intent parser. Extract search parameters from the user's natural language input.
Return pure JSON: {"keyword":"search keyword","cuisine":"cuisine type (e.g. ramen/sushi/tapas/burger, optional)","radius":search radius in meters (default 1500)}
Return ONLY JSON. If you cannot parse, return {"keyword":"original text"}`
      try {
        const result = await chatComplete({
          system: systemPrompt,
          messages: [{ role: 'user', content: `${country ? `Country: ${country}. ` : ''}Parse: "${text}"` }],
          maxTokens: 256,
        })
        let parsed
        try { parsed = JSON.parse(result.text) } catch {
          const m = result.text.match(/\{[\s\S]*\}/)
          if (m) try { parsed = JSON.parse(m[0]) } catch {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(parsed || { keyword: text }))
      } catch (err) {
        console.error('[food] parse-intent error:', err.message)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ keyword: text }))
      }
    }

    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unknown action. Use: search, detail, photo, parse-intent' }))
  } catch (err) {
    console.error('[food]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
