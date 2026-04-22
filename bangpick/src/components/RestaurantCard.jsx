import { useTranslation } from 'react-i18next'
import { formatDistance, formatPrice } from '../lib/countryConfig'

function translateTag(tag, t) {
  const raw = tag.trim()
  // Try full tag first, then stripped suffix
  const key = `food.tag_${raw}`
  const v = t(key)
  if (v !== key) return v
  const short = raw.replace(/_(restaurant|store|shop|house|bar|cafe|place)$/, '')
  if (short !== raw) {
    const key2 = `food.tag_${short}`
    const v2 = t(key2)
    if (v2 !== key2) return v2
  }
  return null // no translation found — skip this tag
}

export default function RestaurantCard({ restaurant: r, selected, onClick, countryConfig }) {
  const { t } = useTranslation()
  const rawCuisine = r.cuisine || (r.types || []).find(tp => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(tp)) || ''
  const cuisineTags = rawCuisine.split(';').map(s => s.trim()).filter(Boolean)
    .map(tag => ({ raw: tag, label: translateTag(tag, t) }))
    .filter(item => item.label)
    .slice(0, 3)
  const showDietaryBadge = r.dietaryFit?.status === 'match'

  // Show image if restaurant has real photos (Google Places or Foursquare)
  const hasRealPhoto = r.photos && r.photos.length > 0 && (r.source === 'google' || r.source === 'foursquare')

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3.5 rounded-xl flex items-center gap-3.5 transition-all active:scale-[0.98] group"
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.04))'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)'}`,
      }}
    >
      {/* Real photo from Google Places */}
      {hasRealPhoto && (
        <img
          src={r.photos[0].startsWith('http') ? r.photos[0] : `/api/food?action=photo&ref=${r.photos[0]}&maxwidth=120`}
          alt={r.name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          loading="lazy"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-bold truncate" style={{ color: '#f1f3fc' }}>{r.name}</span>
          {r.rating && (
            <span className="text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              {r.rating}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {showDietaryBadge && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.18)' }}>
              {t('dietary.match_badge')}
            </span>
          )}
          {cuisineTags.map((item, i) => (
            <span key={i} className="text-[9px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#72757d' }}>
              {item.label}
            </span>
          ))}
          {r.vicinity && cuisineTags.length < 2 && (
            <span className="text-[9px] truncate" style={{ color: '#3a3d44' }}>{r.vicinity}</span>
          )}
        </div>
      </div>

      {/* Distance + price */}
      <div className="flex-shrink-0 text-right">
        <div className="text-[12px] font-mono font-bold tabular-nums" style={{ color: '#a8abb3' }}>
          {formatDistance(r.distance, countryConfig?.distanceUnit || 'km')}
        </div>
        {r.priceLevel != null && (
          <div className="text-[10px] mt-0.5 font-mono" style={{ color: '#52555c' }}>
            {formatPrice(r.priceLevel, countryConfig?.currency || '¥')}
          </div>
        )}
      </div>
    </button>
  )
}
