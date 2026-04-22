// Country-specific configuration for global food map

const COUNTRY_CONFIGS = {
  CN: {
    currency: '¥',
    distanceUnit: 'km',
    defaultLang: 'zh',
    navProvider: 'amap',
    cuisines: ['chinese', 'japanese', 'korean', 'western', 'fast_food', 'cafe', 'dessert', 'bar', 'hotpot', 'noodle'],
    defaultLocation: { lat: 39.9075, lng: 116.3972 }, // Beijing
  },
  JP: {
    currency: '¥',
    distanceUnit: 'km',
    defaultLang: 'ja',
    navProvider: 'google',
    cuisines: ['ramen', 'sushi', 'izakaya', 'udon', 'tempura', 'yakitori', 'cafe', 'convenience', 'curry'],
    defaultLocation: { lat: 35.6762, lng: 139.6503 }, // Tokyo
  },
  FR: {
    currency: '€',
    distanceUnit: 'km',
    defaultLang: 'fr',
    navProvider: 'google',
    cuisines: ['french', 'bistro', 'boulangerie', 'patisserie', 'italian', 'cafe', 'wine_bar', 'brasserie'],
    defaultLocation: { lat: 48.8566, lng: 2.3522 }, // Paris
  },
  ES: {
    currency: '€',
    distanceUnit: 'km',
    defaultLang: 'es',
    navProvider: 'google',
    cuisines: ['tapas', 'paella', 'churros', 'pintxos', 'seafood', 'cafe', 'wine_bar', 'bocadillo'],
    defaultLocation: { lat: 40.4168, lng: -3.7038 }, // Madrid
  },
  US: {
    currency: '$',
    distanceUnit: 'mi',
    defaultLang: 'en',
    navProvider: 'google',
    cuisines: ['burger', 'pizza', 'mexican', 'chinese', 'sushi', 'bbq', 'cafe', 'steak', 'brunch'],
    defaultLocation: { lat: 40.7128, lng: -74.006 }, // New York
  },
}

// Rough bounding-box detection
export function detectCountry(lat, lng) {
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) return 'CN'
  if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 154) return 'JP'
  if (lat >= 41 && lat <= 51.5 && lng >= -5.5 && lng <= 10) return 'FR'
  if (lat >= 27 && lat <= 44 && lng >= -19 && lng <= 5) return 'ES'
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) return 'US'
  // Fallback: guess from language
  return null
}

export function detectCountryFromLang(lang) {
  const base = (lang || '').split('-')[0]
  const map = { zh: 'CN', ja: 'JP', fr: 'FR', es: 'ES', en: 'US' }
  return map[base] || 'US'
}

export function getCountryConfig(countryCode) {
  return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS.US
}

export function formatDistance(meters, distanceUnit) {
  if (distanceUnit === 'mi') {
    const mi = meters / 1609.344
    return mi < 0.1 ? `${Math.round(meters * 3.281)}ft` : `${mi.toFixed(1)}mi`
  }
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}

export function formatPrice(priceLevel, currency) {
  if (priceLevel == null || priceLevel < 1) return null
  return currency.repeat(priceLevel)
}

export function getNavUrl(lat, lng, placeId, navProvider) {
  if (navProvider === 'amap') {
    return `https://uri.amap.com/marker?position=${lng},${lat}&callnative=1`
  }
  // Google Maps
  const base = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  return placeId && !placeId.startsWith('osm_') ? `${base}&destination_place_id=${placeId}` : base
}
