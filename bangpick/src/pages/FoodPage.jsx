import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import LanguageSwitcher from '../components/LanguageSwitcher'
import RestaurantCard from '../components/RestaurantCard'
import RestaurantDetail from '../components/RestaurantDetail'
import RecommendationCard from '../components/RecommendationCard'
import ChatInput from '../components/ChatInput'
import { searchNearbyFood, getFoodDetail, getRecommendations } from '../lib/foodApi'
import { detectCountry, detectCountryFromLang, getCountryConfig } from '../lib/countryConfig'

export default function FoodPage() {
  const { t, i18n } = useTranslation()
  const [userPos, setUserPos] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [countryCode, setCountryCode] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recQuery, setRecQuery] = useState('')
  const listRef = useRef(null)
  const [appHeight, setAppHeight] = useState('100%')
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const initH = vv.height
    function updateHeight() {
      setAppHeight(`${vv.height}px`)
      setKeyboardOpen(initH - vv.height > 100)
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
    }
    updateHeight()
    vv.addEventListener('resize', updateHeight)
    return () => vv.removeEventListener('resize', updateHeight)
  }, [])

  const config = getCountryConfig(countryCode || detectCountryFromLang(i18n.language))

  function applyPosition(lat, lng) {
    const cc = detectCountry(lat, lng) || detectCountryFromLang(i18n.language)
    setCountryCode(cc)
    setUserPos({ lat, lng })
  }

  function fallbackToIP() {
    fetch('/api/ip-location')
      .then(r => r.json())
      .then(data => {
        if (data.loc) {
          const [lat, lng] = data.loc.split(',').map(Number)
          applyPosition(lat, lng)
        } else {
          const fallbackCC = detectCountryFromLang(i18n.language)
          const loc = getCountryConfig(fallbackCC).defaultLocation
          setCountryCode(fallbackCC)
          setUserPos(loc)
        }
      })
      .catch(() => {
        const fallbackCC = detectCountryFromLang(i18n.language)
        const loc = getCountryConfig(fallbackCC).defaultLocation
        setCountryCode(fallbackCC)
        setUserPos(loc)
      })
  }

  useEffect(() => {
    if (!navigator.geolocation || !window.isSecureContext) {
      fallbackToIP()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(pos.coords.latitude, pos.coords.longitude),
      () => fallbackToIP(),
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
        language: i18n.language,
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
    if (!userPos) return
    const timer = setTimeout(() => doSearch(userPos, ''), 300)
    return () => clearTimeout(timer)
  }, [userPos, doSearch])

  async function handleSelectRestaurant(r) {
    setSelectedId(r.placeId)
    if (r.source === 'osm') {
      setDetail({ ...r, address: r.vicinity || '', reviews: [], openingHours: r.openingHours ? [r.openingHours] : null })
      return
    }
    setDetailLoading(true)
    try {
      const d = await getFoodDetail(r.placeId, i18n.language)
      setDetail(d)
    } catch {
      setDetail({ ...r, reviews: [], openingHours: null })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-[#080b10]" style={{ height: appHeight }}>
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 40%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      {/* Header */}
      <header className="flex-shrink-0 relative px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(182,160,255,0.15), rgba(91,140,255,0.1))',
              border: '1px solid rgba(182,160,255,0.2)',
            }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#b6a0ff', fontVariationSettings: "'FILL' 1" }}>restaurant</span>
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: '#f1f3fc' }}>{t('food.title')}</h1>
              {userPos && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono" style={{ color: '#52555c' }}>
                    {userPos.lat.toFixed(2)}°, {userPos.lng.toFixed(2)}°
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            {userPos && (
              <button
                onClick={() => doSearch(userPos, '')}
                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/5 transition-colors"
                style={{ color: '#52555c', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Divider */}
      <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)' }} />

      {/* Main content */}
      <div ref={listRef} className="flex-1 overflow-y-auto pt-3 pb-2 min-h-0">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-full">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-2xl animate-spin" style={{
                border: '2px solid transparent',
                borderTopColor: '#b6a0ff',
                borderRightColor: 'rgba(182,160,255,0.3)',
                animationDuration: '1.2s',
              }} />
              <div className="absolute inset-1.5 rounded-xl flex items-center justify-center" style={{
                background: 'rgba(182,160,255,0.06)',
              }}>
                <span className="material-symbols-outlined text-xl" style={{ color: '#b6a0ff', fontVariationSettings: "'FILL' 1" }}>explore</span>
              </div>
            </div>
            <p className="text-[13px] font-medium" style={{ color: '#a8abb3' }}>{t('food.searching') || '正在搜索附近餐厅...'}</p>
            <p className="text-[10px] mt-1" style={{ color: '#52555c' }}>{t('food.gps_locating') || '基于 GPS 定位'}</p>
          </div>
        )}

        {/* AI Recommendation loading */}
        {recLoading && (
          <div className="px-5 py-16 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-2xl animate-ping" style={{ background: 'rgba(245,158,11,0.1)', animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
            </div>
            <p className="text-[13px] font-medium" style={{ color: '#a8abb3' }}>{t('food.ai_thinking')}</p>
            <p className="text-[11px] mt-2 px-6 text-center" style={{ color: '#3a3d44' }}>"{recQuery}"</p>
          </div>
        )}

        {/* AI Recommendations */}
        {!recLoading && recommendations && (
          <div className="px-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <span className="material-symbols-outlined text-[14px]" style={{ color: '#f59e0b' }}>auto_awesome</span>
                </div>
                <span className="text-[12px] font-bold tracking-wide uppercase" style={{ color: '#72757d' }}>{t('food.ai_picks')}</span>
              </div>
              <button
                onClick={() => { setRecommendations(null); setRecQuery('') }}
                className="text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors hover:bg-white/5"
                style={{ color: '#52555c', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {t('food.back_browse')}
              </button>
            </div>
            {recQuery && (
              <div className="mb-4 px-3 py-2.5 rounded-lg" style={{
                background: 'rgba(245,158,11,0.04)',
                borderLeft: '2px solid rgba(245,158,11,0.3)',
              }}>
                <p className="text-[11px] italic" style={{ color: '#a8abb3' }}>"{recQuery}"</p>
              </div>
            )}
            {recommendations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: '#3a3d44' }}>sentiment_neutral</span>
                </div>
                <p className="text-[13px]" style={{ color: '#52555c' }}>{t('food.no_recommendation')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recommendations.map((rec, i) => (
                  <div key={rec.placeId || i} style={{ animation: `foodSlideUp 0.4s ease-out ${i * 80}ms both` }}>
                    <RecommendationCard
                      rec={rec}
                      countryConfig={config}
                      onClick={() => {
                        const orig = restaurants.find(r => r.placeId === rec.placeId)
                        if (orig) handleSelectRestaurant(orig)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default browse mode */}
        {!loading && !recLoading && !recommendations && (
          <div className="px-5">
            {error && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: '#f87171' }}>cloud_off</span>
                </div>
                <p className="text-[13px] mb-1" style={{ color: '#f87171' }}>{error}</p>
                <p className="text-[11px] mb-4" style={{ color: '#52555c' }}>{t('food.no_result_hint')}</p>
                <button
                  onClick={() => userPos && doSearch(userPos, '')}
                  className="px-5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  {t('food.retry')}
                </button>
              </div>
            )}

            {!error && restaurants.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: '#3a3d44' }}>explore</span>
                </div>
                <p className="text-[13px]" style={{ color: '#52555c' }}>{t('food.no_result')}</p>
                <p className="text-[11px] mt-1" style={{ color: '#3a3d44' }}>{t('food.no_result_hint')}</p>
              </div>
            )}

            {!error && restaurants.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#3a3d44' }}>
                    {t('food.nearby_count', { count: restaurants.length })}
                  </span>
                  <div className="h-px flex-1 ml-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="flex flex-col gap-2">
                  {restaurants.map((r, i) => (
                    <div key={r.placeId} style={{ animation: `foodSlideUp 0.35s ease-out ${i * 40}ms both` }}>
                      <RestaurantCard
                        restaurant={r}
                        selected={selectedId === r.placeId}
                        onClick={() => handleSelectRestaurant(r)}
                        countryConfig={config}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ChatInput onSend={async (text) => {
        setSearchKeyword(text)
        setRecQuery(text)
        if (!userPos) return
        setRecLoading(true)
        setRecommendations(null)
        try {
          let nearbyList = restaurants
          if (nearbyList.length === 0) {
            nearbyList = await searchNearbyFood({ lat: userPos.lat, lon: userPos.lng, radius: 1500, language: i18n.language })
            setRestaurants(nearbyList)
          }
          const recs = await getRecommendations({
            query: text,
            restaurants: nearbyList,
            lang: i18n.language,
            country: countryCode,
            currency: config.currency,
          })
          setRecommendations(Array.isArray(recs) ? recs : [])
        } catch (err) {
          console.error('[food] recommend error:', err)
          setRecommendations([])
        } finally {
          setRecLoading(false)
        }
      }} />

      {!keyboardOpen && <div className="flex-shrink-0 h-16" />}
      {!keyboardOpen && <BottomNav />}

      {detail && (
        <RestaurantDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => { setDetail(null); setSelectedId(null) }}
          countryConfig={config}
        />
      )}

      <style>{`
        @keyframes foodSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
