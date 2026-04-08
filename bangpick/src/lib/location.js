let cachedLocation = null
let fetchingPromise = null

export function getLocation() {
  return cachedLocation
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

async function reverseGeocode(lat, lon) {
  // Use Vite proxy in dev, direct in prod (Netlify function would handle CORS)
  const url = `/api/geocode/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh&zoom=16`
  const res = await fetchWithTimeout(url, 8000)
  if (!res.ok) return null
  const data = await res.json()
  const addr = data.address || {}
  return {
    city: addr.city || addr.town || addr.county || addr.state || '',
    district: addr.suburb || addr.district || addr.borough || addr.neighbourhood || addr.quarter || '',
    province: addr.state || addr.province || '',
    lat,
    lon,
  }
}

async function ipGeolocate() {
  const res = await fetchWithTimeout('/api/ip-location', 8000)
  if (!res.ok) return null
  const data = await res.json()
  const [lat, lon] = (data.loc || '').split(',').map(Number)

  const result = {
    city: data.city || '',
    district: '',
    province: data.region || '',
    lat: lat || 0,
    lon: lon || 0,
  }

  // Enhance with reverse geocode for district-level detail
  if (lat && lon) {
    try {
      const detailed = await reverseGeocode(lat, lon)
      if (detailed?.city) return detailed
    } catch { /* use IP-level data */ }
  }

  return result
}

async function browserGeolocate() {
  if (!navigator.geolocation) throw new Error('no geolocation')

  // Don't pre-flight gate on isSecure — some mobile browsers (iOS Safari)
  // still show the permission prompt on HTTP LAN. Let the browser decide;
  // if it denies, we catch and fall through to IP geolocate.
  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000, // 5 min cache
    })
  })

  const { latitude, longitude } = pos.coords

  try {
    const result = await reverseGeocode(latitude, longitude)
    if (result?.city) return result
  } catch { /* fallback */ }

  return { city: '', district: '', province: '', lat: latitude, lon: longitude }
}

export async function requestLocation() {
  // Return cache if available
  if (cachedLocation?.city) return cachedLocation

  // Prevent concurrent fetches
  if (fetchingPromise) return fetchingPromise

  fetchingPromise = (async () => {
    // Strategy 1: Browser GPS (only on HTTPS/localhost)
    try {
      const loc = await browserGeolocate()
      if (loc?.city) {
        cachedLocation = loc
        return loc
      }
    } catch { /* expected on HTTP, try IP */ }

    // Strategy 2: IP geolocation + reverse geocode
    try {
      const loc = await ipGeolocate()
      if (loc?.city) {
        cachedLocation = loc
        return loc
      }
    } catch { /* all failed */ }

    return null
  })()

  try {
    const result = await fetchingPromise
    return result
  } finally {
    fetchingPromise = null
  }
}

export function formatLocation(loc) {
  if (!loc || !loc.city) return ''
  const parts = [loc.province, loc.city, loc.district].filter(Boolean)
  // Deduplicate (e.g., "北京市 北京市" → "北京市")
  const unique = parts.filter((p, i) => parts.indexOf(p) === i)
  return unique.join(' ')
}
