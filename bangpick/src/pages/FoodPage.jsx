import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BottomNav from '../components/BottomNav'
import LanguageSwitcher from '../components/LanguageSwitcher'
import RestaurantCard from '../components/RestaurantCard'
import RestaurantDetail from '../components/RestaurantDetail'
import { searchNearbyFood, getFoodDetail } from '../lib/foodApi'

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const restaurantIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#ef4444;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:14px">🍴</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 15, { duration: 0.8 })
  }, [center, zoom, map])
  return null
}

const CUISINE_FILTER_KEYS = [
  { key: 'filter_all', value: '' },
  { key: 'filter_chinese', value: 'chinese' },
  { key: 'filter_japanese', value: 'japanese' },
  { key: 'filter_korean', value: 'korean' },
  { key: 'filter_western', value: 'western' },
  { key: 'filter_fast_food', value: 'fast_food' },
  { key: 'filter_cafe', value: 'cafe' },
  { key: 'filter_dessert', value: 'dessert' },
  { key: 'filter_bar', value: 'bar' },
]

export default function FoodPage() {
  const { t } = useTranslation()
  const [userPos, setUserPos] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(t('food.browser_no_geo'))
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(loc)
        setFlyTarget(loc)
      },
      (err) => {
        console.error('[food] geolocation error:', err.message)
        fetch('/api/ip-location')
          .then(r => r.json())
          .then(data => {
            if (data.loc) {
              const [lat, lng] = data.loc.split(',').map(Number)
              setUserPos({ lat, lng })
              setFlyTarget({ lat, lng })
            } else {
              setError(t('food.no_location'))
              setLoading(false)
            }
          })
          .catch(() => {
            setError(t('food.no_location'))
            setLoading(false)
          })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const doSearch = useCallback(async (pos, keyword) => {
    if (!pos) return
    setLoading(true)
    setError(null)
    try {
      const results = await searchNearbyFood({
        lat: pos.lat,
        lon: pos.lng,
        radius: 1500,
        keyword: keyword || undefined,
      })
      setRestaurants(results)
    } catch (err) {
      console.error('[food] search error:', err)
      setError(t('food.search_fail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (userPos) doSearch(userPos, activeFilter)
  }, [userPos, activeFilter, doSearch])

  async function handleSelectRestaurant(r) {
    setSelectedId(r.placeId)
    if (r.location) {
      setFlyTarget({ lat: r.location.lat, lng: r.location.lng })
    }
    setDetailLoading(true)
    try {
      const d = await getFoodDetail(r.placeId)
      setDetail(d)
    } catch {
      setDetail({ ...r, reviews: [], openingHours: null })
    } finally {
      setDetailLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    const kw = searchKeyword.trim()
    if (kw && userPos) {
      doSearch(userPos, kw)
    }
  }

  const mapCenter = userPos || { lat: 39.9, lng: 116.4 }

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-[#0a0e14] pb-16">
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-[1000]">
        <div className="flex justify-between items-center px-5 h-14 w-full">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[var(--primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
            <h1 className="text-lg font-black tracking-tighter text-[var(--primary)]" style={{ filter: 'drop-shadow(0 0 15px rgba(182,160,255,0.3))' }}>{t('food.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {userPos && (
              <button
                onClick={() => { setFlyTarget({ ...userPos }); doSearch(userPos, activeFilter) }}
                className="w-8 h-8 rounded-full grid place-items-center text-[var(--muted)] hover:bg-white/10 transition-colors"
                title={t('food.my_location')}
              >
                <span className="material-symbols-outlined text-[18px]">my_location</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      </header>

      <form onSubmit={handleSearch} className="flex-shrink-0 px-4 py-2 z-[1000] relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t('food.search_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-[#52555c] outline-none focus:border-[var(--primary)]/40 transition-colors"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => { setSearchKeyword(''); doSearch(userPos, activeFilter) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52555c]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)', color: '#fff' }}
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
        </div>
      </form>

      <div className="flex-shrink-0 px-4 pb-2 z-[1000] relative">
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          {CUISINE_FILTER_KEYS.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: activeFilter === f.value ? 'linear-gradient(135deg, #5B8CFF, #7A7CFF)' : 'rgba(255,255,255,0.05)',
                color: activeFilter === f.value ? '#fff' : '#a8abb3',
                border: `1px solid ${activeFilter === f.value ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {t(`food.${f.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 h-[38vh] relative z-0">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyTo center={flyTarget ? [flyTarget.lat, flyTarget.lng] : null} zoom={15} />

          {userPos && (
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
              <Popup>{t('common.my_position')}</Popup>
            </Marker>
          )}

          {restaurants.map(r => r.location && (
            <Marker
              key={r.placeId}
              position={[r.location.lat, r.location.lng]}
              icon={restaurantIcon}
              eventHandlers={{ click: () => handleSelectRestaurant(r) }}
            >
              <Popup>
                <div style={{ color: '#333', fontSize: '13px', fontWeight: 600 }}>{r.name}</div>
                {r.rating && <div style={{ color: '#666', fontSize: '11px' }}>⭐ {r.rating}</div>}
                <div style={{ color: '#666', fontSize: '11px' }}>{r.distance}m</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-[500]">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm animate-spin text-white">refresh</span>
              <span className="text-xs text-white">{t('food.searching')}</span>
            </div>
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        {error && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-3xl mb-2" style={{ color: '#f87171' }}>error</span>
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            <button
              onClick={() => userPos && doSearch(userPos, activeFilter)}
              className="mt-3 px-4 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: 'linear-gradient(135deg, #5B8CFF, #7A7CFF)', color: '#fff' }}
            >
              {t('food.retry')}
            </button>
          </div>
        )}

        {!error && !loading && restaurants.length === 0 && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-3xl mb-2" style={{ color: '#3a3d44' }}>search_off</span>
            <p className="text-sm" style={{ color: '#72757d' }}>{t('food.no_result')}</p>
            <p className="text-xs mt-1" style={{ color: '#52555c' }}>{t('food.no_result_hint')}</p>
          </div>
        )}

        {!error && restaurants.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium" style={{ color: '#72757d' }}>
                {t('food.nearby_count', { count: restaurants.length })}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {restaurants.map(r => (
                <RestaurantCard
                  key={r.placeId}
                  restaurant={r}
                  selected={selectedId === r.placeId}
                  onClick={() => handleSelectRestaurant(r)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />

      {detail && (
        <RestaurantDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => { setDetail(null); setSelectedId(null) }}
        />
      )}
    </div>
  )
}
