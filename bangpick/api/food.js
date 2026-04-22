// Unified food API — multiplexes search/detail/photo via `action` field
// to stay within Vercel Hobby plan's 12 function limit.

import { chatComplete } from './_aiProvider.js'
import { getRedis } from './_redis.js'
import { evaluateRestaurantDietaryFit, isProfileActive, buildDietaryPromptFragment } from '../src/lib/dietaryProfile.js'

const VOTE_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

function voteJsonResponse(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const FOURSQUARE_KEY = process.env.FOURSQUARE_API_KEY || ''
const PEXELS_KEY = process.env.PEXELS_API_KEY || ''

function isAssistantMetaQuestion(text) {
  const normalized = String(text || '').trim().toLowerCase()
  if (!normalized) return false
  return [
    /你是.{0,6}(模型|助手|ai|机器人)/,
    /你是什么/,
    /你是谁/,
    /你能干嘛/,
    /你会什么/,
    /介绍一下你自己/,
    /what are you/,
    /who are you/,
    /what model/,
    /what can you do/
  ].some(pattern => pattern.test(normalized))
}

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

function isPrivateHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' ||
    hostname.startsWith('10.') || hostname.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
}

function shouldUseLocalMockFallback(req) {
  const host = String(req?.headers?.host || '').split(':')[0]
  return isPrivateHost(host)
}

function offsetLatLng(lat, lon, distanceMeters, bearingDeg) {
  const earthRadius = 6378137
  const bearing = bearingDeg * Math.PI / 180
  const latRad = lat * Math.PI / 180
  const lonRad = lon * Math.PI / 180
  const nextLat = Math.asin(
    Math.sin(latRad) * Math.cos(distanceMeters / earthRadius) +
    Math.cos(latRad) * Math.sin(distanceMeters / earthRadius) * Math.cos(bearing)
  )
  const nextLon = lonRad + Math.atan2(
    Math.sin(bearing) * Math.sin(distanceMeters / earthRadius) * Math.cos(latRad),
    Math.cos(distanceMeters / earthRadius) - Math.sin(latRad) * Math.sin(nextLat)
  )
  return {
    lat: +(nextLat * 180 / Math.PI).toFixed(6),
    lng: +(nextLon * 180 / Math.PI).toFixed(6),
  }
}

const LOCAL_MOCK_RESTAURANTS = [
  { zhName: '绿碗纯素厨房', enName: 'Green Bowl Vegan Kitchen', cuisine: 'vegan;salad', types: ['restaurant', 'vegan_restaurant', 'salad'], vicinity: '创意园 A 座', distance: 220, bearing: 15, rating: 4.7, priceLevel: 2, openingHours: '10:00-21:30' },
  { zhName: '每日素食小馆', enName: 'Daily Veggie Bistro', cuisine: 'vegetarian;cafe', types: ['restaurant', 'vegetarian_restaurant', 'cafe'], vicinity: '北门街角', distance: 360, bearing: 68, rating: 4.5, priceLevel: 1, openingHours: '09:30-20:30' },
  { zhName: '清真兰州牛肉面', enName: 'Halal Lanzhou Noodles', cuisine: 'halal;noodle', types: ['restaurant', 'halal_restaurant', 'noodle'], vicinity: '地铁口旁', distance: 430, bearing: 120, rating: 4.6, priceLevel: 1, openingHours: '08:00-22:00' },
  { zhName: '轻食能量碗', enName: 'Power Bowl Lab', cuisine: 'gluten_free;healthy', types: ['restaurant', 'gluten_free_restaurant', 'healthy_food'], vicinity: '联合办公楼下', distance: 520, bearing: 200, rating: 4.4, priceLevel: 2, openingHours: '11:00-20:30' },
  { zhName: '平价饺子铺', enName: 'Budget Dumpling Corner', cuisine: 'dumpling;chinese', types: ['restaurant', 'dumpling', 'chinese_restaurant'], vicinity: '社区南门', distance: 610, bearing: 250, rating: 4.3, priceLevel: 0, openingHours: '10:30-21:00' },
  { zhName: '花园早午餐', enName: 'Garden Brunch Cafe', cuisine: 'brunch;cafe', types: ['restaurant', 'brunch_restaurant', 'cafe'], vicinity: '河边步道', distance: 760, bearing: 300, rating: 4.5, priceLevel: 2, openingHours: '08:30-18:00' },
  { zhName: '京都寿司吧', enName: 'Kyoto Sushi Bar', cuisine: 'sushi;japanese', types: ['restaurant', 'sushi_restaurant', 'japanese_restaurant'], vicinity: '广场东侧', distance: 920, bearing: 335, rating: 4.6, priceLevel: 3, openingHours: '11:00-22:00' },
  { zhName: '老街麻辣火锅', enName: 'Old Street Hotpot', cuisine: 'hotpot;sichuan', types: ['restaurant', 'hotpot', 'sichuan_restaurant'], vicinity: '商场 5 层', distance: 1080, bearing: 28, rating: 4.7, priceLevel: 3, openingHours: '11:00-23:00' },
  { zhName: '港湾海鲜烧烤', enName: 'Harbor Seafood Grill', cuisine: 'seafood;bbq', types: ['restaurant', 'seafood_restaurant', 'bbq'], vicinity: '湖景路 18 号', distance: 1280, bearing: 85, rating: 4.2, priceLevel: 3, openingHours: '17:00-23:30' },
  { zhName: '小麦工坊', enName: 'Wheat House Bakery', cuisine: 'bak;pastry', types: ['bakery', 'pastry_shop'], vicinity: '写字楼一层', distance: 1490, bearing: 145, rating: 4.1, priceLevel: 1, openingHours: '07:30-20:00' },
  { zhName: '意面实验室', enName: 'Pasta Atelier', cuisine: 'italian;pasta', types: ['restaurant', 'italian_restaurant', 'pasta_shop'], vicinity: '艺术区西门', distance: 1820, bearing: 210, rating: 4.4, priceLevel: 3, openingHours: '11:30-22:00' },
  { zhName: '湘辣食堂', enName: 'Spice Route Hunan', cuisine: 'hunan;spicy', types: ['restaurant', 'hunan_restaurant', 'spicy'], vicinity: '体育馆北侧', distance: 2240, bearing: 260, rating: 4.3, priceLevel: 2, openingHours: '11:00-21:30' },
  { zhName: '匠人牛排馆', enName: 'Craft Steakhouse', cuisine: 'steak;grill', types: ['restaurant', 'steakhouse', 'grill'], vicinity: '金融街中段', distance: 2680, bearing: 315, rating: 4.8, priceLevel: 4, openingHours: '17:30-22:30' },
  { zhName: '夜市烤串', enName: 'Night Market Yakitori', cuisine: 'bbq;yakitori', types: ['restaurant', 'bbq', 'yakitori'], vicinity: '夜市牌坊内', distance: 3120, bearing: 350, rating: 4.0, priceLevel: 1, openingHours: '18:00-01:00' },
]

function buildLocalMockSearchResults({ lat, lon, radius, keyword, type, language }) {
  const limitDistance = Math.max(Number(radius) || 1500, 300)
  const isZh = !language || language.startsWith('zh')
  const mapped = LOCAL_MOCK_RESTAURANTS.map((item, index) => {
    const location = offsetLatLng(lat, lon, item.distance, item.bearing)
    return {
      placeId: `osm_local_mock_${index + 1}`,
      name: isZh ? item.zhName : item.enName,
      rating: item.rating,
      userRatingsTotal: 40 + index * 17,
      priceLevel: item.priceLevel,
      types: item.types,
      location,
      vicinity: item.vicinity,
      phone: null,
      website: null,
      openingHours: item.openingHours,
      cuisine: item.cuisine,
      photos: [],
      distance: item.distance,
      source: 'osm',
    }
  })

  const query = String(keyword || type || '').trim().toLowerCase()
  const inRadius = mapped.filter(item => item.distance <= limitDistance)
  const base = inRadius.length > 0 ? inRadius : mapped
  if (!query) return base.slice(0, 20)

  const filtered = base.filter(item => {
    const haystack = [item.name, item.cuisine, item.vicinity, ...(item.types || [])].join(' | ').toLowerCase()
    return haystack.includes(query)
  })
  return (filtered.length > 0 ? filtered : base).slice(0, 20)
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
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
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

      if (action === 'test') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ ok: true, time: Date.now() }))
      }

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
      const { lat, lon, dietaryProfile } = params
      if (!lat || !lon) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'lat and lon required' })) }
      let results = []
      let anyBackendSucceeded = false
      // Priority: Google Places (New) → Overpass (free fallback)
      const backends = [
        GOOGLE_KEY && (() => searchGoogle(params)),
        FOURSQUARE_KEY && (() => searchFoursquare(params)),
        () => searchOverpass(params),
      ].filter(Boolean)
      for (const backend of backends) {
        try {
          results = await backend()
          anyBackendSucceeded = true
          if (results && results.length > 0) break
        } catch (err) {
          console.error('[food] search backend error:', err.message)
        }
      }
      if ((!anyBackendSucceeded || !results || results.length === 0) && shouldUseLocalMockFallback(req)) {
        console.warn('[food] using local mock fallback for search')
        results = buildLocalMockSearchResults(params)
        anyBackendSucceeded = true
      }
      if (!anyBackendSucceeded) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'all_backends_failed' })) }

      const useDietaryFilter = isProfileActive(dietaryProfile)
      const withDietaryFit = useDietaryFilter
        ? (results || []).map(r => ({ ...r, dietaryFit: evaluateRestaurantDietaryFit(dietaryProfile, r) }))
        : (results || [])
      const excluded = useDietaryFilter
        ? withDietaryFit.filter(r => r.dietaryFit?.status === 'exclude')
        : []
      const candidateResults = useDietaryFilter
        ? withDietaryFit.filter(r => r.dietaryFit?.status !== 'exclude')
        : withDietaryFit
      results = useDietaryFilter && candidateResults.length >= 5 ? candidateResults : withDietaryFit

      // Sort by composite score: distance (40%) + rating (35%) + popularity (25%) + dietary fit bonus
      if (results && results.length > 1) {
        results.sort((a, b) => {
          const ds = (d) => 1 - Math.min(d || 9999, 2000) / 2000
          const rs = (r) => (r || 3) / 5
          const ps = (p) => Math.min(p || 0, 500) / 500
          const dietaryScore = (item) => item.dietaryFit?.scoreDelta || 0
          const excludePenalty = (item) => item.dietaryFit?.status === 'exclude' && excluded.length >= withDietaryFit.length - 4 ? -1.2 : 0
          const scoreA = ds(a.distance) * 0.4 + rs(a.rating) * 0.35 + ps(a.userRatingsTotal) * 0.25 + dietaryScore(a) + excludePenalty(a)
          const scoreB = ds(b.distance) * 0.4 + rs(b.rating) * 0.35 + ps(b.userRatingsTotal) * 0.25 + dietaryScore(b) + excludePenalty(b)
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
      const { query, restaurants: rList, lang, country, currency, dietaryProfile } = params
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

      // Build dietary constraints if provided
      const dietaryConstraint = buildDietaryPromptFragment(dietaryProfile, lang)

      const basePrompt = isZh
        ? `从附近餐厅列表中选2-3家推荐。返回JSON数组：[{"placeId":"从列表选","name":"店名","reason":"推荐理由15字","dishes":[{"name":"菜名","price":价格,"desc":"15字推荐理由","emoji":"🍖"}],"estimatedTotal":人均,"highlights":["标签"],"matchScore":0-100${dietaryConstraint ? ',"dietaryMatch":"为什么符合用户饮食偏好，15字"' : ''}}]。价格${cur}。只返回JSON。`
        : `Pick 2-3 from the nearby list. Return JSON: [{"placeId":"from list","name":"","reason":"brief why","dishes":[{"name":"","price":num,"desc":"15 word reason","emoji":"🍖"}],"estimatedTotal":num,"highlights":["tag"],"matchScore":0-100${dietaryConstraint ? ',"dietaryMatch":"why this matches dietary preference, 15 words"' : ''}}]. Prices ${cur}. ${langName} only. JSON only.`

      const systemPrompt = dietaryConstraint
        ? basePrompt + '\n\n用户饮食约束：\n' + dietaryConstraint
        : basePrompt

      // Helper: enrich AI picks with data from restaurant list
      const enrichRecs = (parsed) => {
        for (const rec of parsed) {
          const orig = topR.find(r => r.placeId === rec.placeId)
          if (orig) { rec.location = orig.location; rec.distance = orig.distance; rec.rating = orig.rating; rec.photos = orig.photos; rec.source = orig.source }
        }
        return parsed
      }

      try {
        const result = await chatComplete({
          system: systemPrompt,
          messages: [{ role: 'user', content: `"${query}" | ${country || '?'}\n${rContext}` }],
          maxTokens: 800,
          timeoutMs: 15000, // 15s timeout for recommendations
        })
        let parsed
        try { parsed = JSON.parse(result.text) } catch {
          const m = result.text.match(/\[[\s\S]*\]/)
          if (m) try { parsed = JSON.parse(m[0]) } catch {}
        }
        if (!Array.isArray(parsed)) parsed = parsed ? [parsed] : []
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(enrichRecs(parsed)))
      } catch (err) {
        console.error('[food] recommend AI error, using score fallback:', err.message)
        // Fallback: pick top 3 by rating/distance when AI is slow/down
        const fallback = topR.slice(0, 3).map(r => ({
          placeId: r.placeId, name: r.name, reason: '',
          dishes: [], estimatedTotal: null, highlights: (r.cuisine || r.types?.slice(0,2).join(',') || '').split(/[;,]/).filter(Boolean).slice(0, 2),
          matchScore: r.rating ? Math.round(r.rating * 20) : 60,
          location: r.location, distance: r.distance, rating: r.rating, photos: r.photos, source: r.source,
        }))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(fallback))
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
          timeoutMs: 12000,
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
      const fallbackSuggestions = isZh
        ? ['想吃附近便宜点的拉面', '一个人晚饭吃什么，不要太辣', '附近有什么适合约会的餐厅']
        : ['Cheap ramen nearby', 'Dinner for one, not too spicy', 'Good nearby restaurant for a date']
      if (isAssistantMetaQuestion(text)) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({
          type: 'off_topic',
          keyword: text,
          cuisine: null,
          radius: null,
          reply: isZh
            ? '我是美食地图助手，主要帮你找餐厅、推荐吃什么，不负责介绍模型本身。'
            : 'I’m the food map assistant. I’m here to help with restaurants and what to eat, not model self-introduction.',
          suggestions: fallbackSuggestions,
        }))
      }
      const systemPrompt = isZh
        ? `你是美食地图页的意图分类器。判断用户输入是否与找餐厅、点餐、吃什么、菜系口味、预算、聚餐场景相关。
返回纯 JSON，格式为：{"type":"food_search|food_qa|off_topic","keyword":"搜索关键词，可为空","cuisine":"菜系类型，可为空","radius":半径米数，可为空,"reply":"给用户看的简短回复，off_topic 必填，其他可为空","suggestions":["建议问题1","建议问题2"]}
规则：
1. 与找餐厅/吃什么/点什么/场景推荐相关，返回 food_search 或 food_qa。
2. 明显与美食地图无关（如天气、写周报、代码、股票、泛闲聊），返回 off_topic。
3. 询问你是什么模型、你是谁、你能做什么这类“问助手本身”的问题，也一律返回 off_topic。
4. off_topic 时不要硬聊原话题，要温和说明你是美食地图助手，并给 2-4 条与找餐厅相关的建议。
5. food_search / food_qa 时，reply 留空即可；keyword 尽量提炼成适合搜餐厅的短语。
6. 只返回 JSON，不要 markdown。`
        : `You are the intent classifier for a food map page. Decide whether the user's message is about finding restaurants, ordering food, what to eat, cuisine preferences, budget, or dining scenarios.
Return pure JSON in this shape: {"type":"food_search|food_qa|off_topic","keyword":"short search phrase or empty","cuisine":"optional cuisine type","radius":number or null,"reply":"short user-facing reply, required for off_topic","suggestions":["suggestion 1","suggestion 2"]}
Rules:
1. Restaurant finding / what to eat / dining recommendation requests => food_search or food_qa.
2. Clearly unrelated topics (weather, work reports, coding, stocks, generic chat) => off_topic.
3. Questions about what model you are, who you are, or what you can do are also off_topic.
4. For off_topic, politely redirect to food-related help and provide 2-4 relevant suggestion prompts.
5. For food_search / food_qa, reply can be empty; keyword should be concise and search-friendly.
6. Return JSON only.`
      try {
        const result = await chatComplete({
          system: systemPrompt,
          messages: [{ role: 'user', content: `${country ? `Country: ${country}. ` : ''}Parse: "${text}"` }],
          maxTokens: 256,
          timeoutMs: 8000,
        })
        let parsed
        try { parsed = JSON.parse(result.text) } catch {
          const m = result.text.match(/\{[\s\S]*\}/)
          if (m) try { parsed = JSON.parse(m[0]) } catch {}
        }
        const normalized = {
          type: parsed?.type === 'off_topic' || parsed?.type === 'food_qa' ? parsed.type : 'food_search',
          keyword: typeof parsed?.keyword === 'string' && parsed.keyword.trim() ? parsed.keyword.trim() : text,
          cuisine: typeof parsed?.cuisine === 'string' && parsed.cuisine.trim() ? parsed.cuisine.trim() : null,
          radius: Number.isFinite(parsed?.radius) ? parsed.radius : null,
          reply: typeof parsed?.reply === 'string' ? parsed.reply.trim() : '',
          suggestions: Array.isArray(parsed?.suggestions)
            ? parsed.suggestions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 4)
            : [],
        }
        if (normalized.type === 'off_topic') {
          if (!normalized.reply) {
            normalized.reply = isZh
              ? '我这里更擅长帮你找餐厅、推荐吃什么，当前这个话题不太适合在美食地图里处理。'
              : 'I’m better at helping with restaurants and what to eat, so this topic does not fit the food map flow well.'
          }
          if (normalized.suggestions.length === 0) normalized.suggestions = fallbackSuggestions
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(normalized))
      } catch (err) {
        console.error('[food] parse-intent error:', err.message)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ type: 'food_search', keyword: text, cuisine: null, radius: null, reply: '', suggestions: [] }))
      }
    }



    if (action === 'vote') {
      const redis = getRedis()
      if (!redis) {
        return voteJsonResponse(res, 503, { error: 'vote_unavailable' })
      }
      const { voteAction, voteId, placeId, nickname, message } = params
      if (!voteId || typeof voteId !== 'string') {
        return voteJsonResponse(res, 400, { error: 'voteId_required' })
      }
      const key = `vote:${voteId}`

      if (voteAction === 'get') {
        try {
          const data = await redis.get(key)
          if (!data) return voteJsonResponse(res, 404, { error: 'vote_not_found' })
          return voteJsonResponse(res, 200, data)
        } catch (err) {
          return voteJsonResponse(res, 500, { error: 'vote_read_failed' })
        }
      }

      if (voteAction === 'cast') {
        if (!placeId || typeof placeId !== 'string') {
          return voteJsonResponse(res, 400, { error: 'placeId_required' })
        }
        try {
          let data = await redis.get(key)
          if (!data) {
            data = { restaurants: {}, messages: [], totalVotes: 0, createdAt: Date.now() }
          }
          data.restaurants[placeId] = (data.restaurants[placeId] || 0) + 1
          data.totalVotes = (data.totalVotes || 0) + 1
          if (message && typeof message === 'string') {
            data.messages.push({ nickname: nickname || 'Anonymous', placeId, message: message.slice(0, 200), ts: Date.now() })
            if (data.messages.length > 50) data.messages = data.messages.slice(-50)
          }
          await redis.set(key, data, { ex: VOTE_TTL_SEC })
          return voteJsonResponse(res, 200, { ok: true, currentTallies: data.restaurants, totalVotes: data.totalVotes })
        } catch (err) {
          return voteJsonResponse(res, 500, { error: 'vote_cast_failed' })
        }
      }

      return voteJsonResponse(res, 400, { error: 'invalid_voteAction' })
    }

    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unknown action. Use: search, detail, photo, parse-intent, vote' }))
  } catch (err) {
    console.error('[food]', err.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}
