import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import LanguageSwitcher from '../components/LanguageSwitcher'
import RestaurantCard from '../components/RestaurantCard'
import RestaurantDetail from '../components/RestaurantDetail'
import RecommendationCard from '../components/RecommendationCard'
import ChatInput from '../components/ChatInput'
import { searchNearbyFood, getFoodDetail, getRecommendations, parseIntent } from '../lib/foodApi'
import { detectCountry, detectCountryFromLang, getCountryConfig } from '../lib/countryConfig'

function detectOffTopicLocally(text) {
  const normalized = String(text || '').trim().toLowerCase()
  if (!normalized) return false
  const foodHints = ['吃', '餐', '饭', '店', '美食', '口味', '菜', '拉面', '火锅', '烧烤', '寿司', '咖啡', '甜品', '预算', '聚餐', '约会', 'restaurant', 'food', 'eat', 'dinner', 'lunch', 'breakfast', 'ramen', 'sushi', 'bbq', 'cafe', 'dessert']
  if (foodHints.some(term => normalized.includes(term))) return false
  const assistantMetaPatterns = [
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
  ]
  if (assistantMetaPatterns.some(pattern => pattern.test(normalized))) return true
  const offTopicHints = ['周报', '日报', '代码', '编程', 'bug', '股票', '基金', '天气', '新闻', '翻译', 'ppt', '简历', '面试', '写邮件', 'write report', 'code', 'bug', 'stock', 'weather', 'translate', 'resume', 'email']
  return offTopicHints.some(term => normalized.includes(term))
}

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
  const [intentLoading, setIntentLoading] = useState(false)
  const [recLoading, setRecLoading] = useState(false)
  const [recQuery, setRecQuery] = useState('')
  const [intentFeedback, setIntentFeedback] = useState(null)
  const [searchRadius, setSearchRadius] = useState(1500)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
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
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [])

  const searchRadiusRef = useRef(1500)
  const restaurantsRef = useRef([])
  restaurantsRef.current = restaurants
  searchRadiusRef.current = searchRadius

  const doSearch = useCallback(async (pos, keyword, loadMore = false, options = {}) => {
    if (!pos) return []
    const radius = loadMore ? searchRadiusRef.current * 2 : (options.radius || 1500)
    if (loadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
      setSearchRadius(radius)
      setHasMore(true)
    }
    try {
      const results = await searchNearbyFood({
        lat: pos.lat,
        lon: pos.lng,
        radius,
        keyword: keyword || undefined,
        type: options.cuisine || undefined,
        language: i18n.language,
      })
      if (loadMore) {
        const existingIds = new Set(restaurantsRef.current.map(r => r.placeId))
        const newResults = results.filter(r => !existingIds.has(r.placeId))
        if (newResults.length === 0) {
          setHasMore(false)
        } else {
          setRestaurants(prev => [...prev, ...newResults])
          setSearchRadius(radius)
        }
        if (radius >= 10000) setHasMore(false)
      } else {
        setRestaurants(results)
      }
      return results
    } catch (err) {
      console.error('[food] search error:', err)
      if (!loadMore) setError(t('food.search_fail'))
      return []
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [t, i18n.language])

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

  async function runFoodFlow(text) {
    setSearchKeyword(text)
    setRecQuery(text)
    setIntentFeedback(null)
    if (!userPos) return

    if (detectOffTopicLocally(text)) {
      setIntentLoading(false)
      setIntentFeedback({
        title: t('food.off_topic_title'),
        reply: t('food.off_topic_desc'),
        suggestions: [
          t('food.off_topic_suggestion_0'),
          t('food.off_topic_suggestion_1'),
          t('food.off_topic_suggestion_2'),
        ].filter(Boolean),
      })
      return
    }

    setIntentLoading(true)
    setRecommendations(null)
    let intent
    try {
      intent = await parseIntent(text, i18n.language, countryCode)
    } catch (err) {
      console.error('[food] parse intent error:', err)
      intent = { type: 'food_search', keyword: text, cuisine: null, radius: null, reply: '', suggestions: [] }
    } finally {
      setIntentLoading(false)
    }

    if (intent?.type === 'off_topic') {
      setRecQuery(text)
      setIntentFeedback({
        title: t('food.off_topic_title'),
        reply: intent.reply || t('food.off_topic_desc'),
        suggestions: Array.isArray(intent.suggestions) && intent.suggestions.length > 0
          ? intent.suggestions
          : [
              t('food.off_topic_suggestion_0'),
              t('food.off_topic_suggestion_1'),
              t('food.off_topic_suggestion_2'),
            ].filter(Boolean),
      })
      return
    }

    const resolvedQuery = intent?.keyword || text
    const resolvedCuisine = intent?.cuisine || undefined
    const resolvedRadius = intent?.radius || undefined
    setSearchKeyword(resolvedQuery)
    setRecQuery(resolvedQuery)
    setRecLoading(true)
    try {
      let nearbyList = restaurants
      if (nearbyList.length === 0 || resolvedCuisine || resolvedRadius || resolvedQuery !== text) {
        nearbyList = await searchNearbyFood({
          lat: userPos.lat,
          lon: userPos.lng,
          radius: resolvedRadius || 1500,
          keyword: resolvedQuery,
          type: resolvedCuisine,
          language: i18n.language,
        })
        setRestaurants(nearbyList)
      }
      const trimmed = nearbyList.slice(0, 10).map(r => ({
        placeId: r.placeId, name: r.name, cuisine: r.cuisine || r.types?.slice(0, 2).join(',') || '',
        distance: r.distance, rating: r.rating, location: r.location, photos: r.photos?.slice(0, 1), source: r.source,
      }))
      const recs = await getRecommendations({
        query: resolvedQuery,
        restaurants: trimmed,
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
  }

  return (
    <div className="flex flex-col bg-[#080b10]" style={{ height: appHeight }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 40%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

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

      <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)' }} />

      <div ref={listRef} className="flex-1 overflow-y-auto pt-3 pb-2 min-h-0" onScroll={(e) => {
        const el = e.currentTarget
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && !loading && !loadingMore && hasMore && restaurants.length > 0 && !recommendations && !intentFeedback) {
          doSearch(userPos, searchKeyword, true)
        }
      }}>
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

        {intentLoading && (
          <div className="px-5 py-16 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-2xl animate-ping" style={{ background: 'rgba(91,140,255,0.1)', animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(91,140,255,0.08)', border: '1px solid rgba(91,140,255,0.15)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: '#5B8CFF', fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
            </div>
            <p className="text-[13px] font-medium" style={{ color: '#a8abb3' }}>{t('food.intent_thinking')}</p>
            <p className="text-[11px] mt-2 px-6 text-center" style={{ color: '#3a3d44' }}>
              {t('food.intent_hint')}
            </p>
          </div>
        )}

        {recLoading && !intentLoading && (
          <div className="px-5 py-16 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-2xl animate-ping" style={{ background: 'rgba(245,158,11,0.1)', animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
            </div>
            <p className="text-[13px] font-medium" style={{ color: '#a8abb3' }}>{t('food.ai_thinking')}</p>
            <p className="text-[11px] mt-2 px-6 text-center" style={{ color: '#3a3d44' }}>
              "{recQuery}"
            </p>
          </div>
        )}

        {!intentLoading && !recLoading && intentFeedback && (
          <div className="px-5 py-10">
            <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(91,140,255,0.08)', border: '1px solid rgba(91,140,255,0.16)' }}>
                <span className="material-symbols-outlined text-xl" style={{ color: '#5B8CFF' }}>tips_and_updates</span>
              </div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#f1f3fc' }}>{intentFeedback.title}</p>
              <p className="text-[11px] leading-relaxed max-w-xs mx-auto" style={{ color: '#72757d' }}>{intentFeedback.reply}</p>
              {intentFeedback.suggestions?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {intentFeedback.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => runFoodFlow(suggestion)}
                      className="px-3 py-2 rounded-full text-[11px] transition-colors hover:bg-white/8"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#a8abb3', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!intentLoading && !recLoading && recommendations && (
          <div className="px-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <span className="material-symbols-outlined text-[14px]" style={{ color: '#f59e0b' }}>auto_awesome</span>
                </div>
                <span className="text-[12px] font-bold tracking-wide uppercase" style={{ color: '#72757d' }}>{t('food.ai_picks')}</span>
              </div>
              <button
                onClick={() => { setRecommendations(null); setRecQuery(''); setIntentFeedback(null) }}
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
                <p className="text-[11px] italic" style={{ color: '#a8abb3' }}>
                  "{recQuery}"
                </p>
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

        {!loading && !intentLoading && !recLoading && !recommendations && !intentFeedback && (
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
                    <div key={r.placeId} style={{ animation: i < 20 ? `foodSlideUp 0.35s ease-out ${i * 40}ms both` : undefined }}>
                      <RestaurantCard
                        restaurant={r}
                        selected={selectedId === r.placeId}
                        onClick={() => handleSelectRestaurant(r)}
                        countryConfig={config}
                      />
                    </div>
                  ))}
                </div>
                {loadingMore && (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#b6a0ff' }} />
                    <span className="text-[11px]" style={{ color: '#52555c' }}>{t('food.loading_more') || '加载更多...'}</span>
                  </div>
                )}
                {!hasMore && restaurants.length > 0 && !loadingMore && (
                  <div className="text-center py-4">
                    <span className="text-[10px]" style={{ color: '#3a3d44' }}>{t('food.no_more') || '已加载全部餐厅'}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ChatInput onSend={runFoodFlow} />

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
