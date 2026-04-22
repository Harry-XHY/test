import { useTranslation } from 'react-i18next'
import { formatDistance, getNavUrl } from '../lib/countryConfig'
import DietaryBadge from './DietaryBadge'

export default function RecommendationCard({ rec, countryConfig, onClick }) {
  const { t } = useTranslation()
  const cfg = countryConfig || {}
  const cur = cfg.currency || '¥'

  const navUrl = rec.location
    ? getNavUrl(rec.location.lat, rec.location.lng, rec.placeId, cfg.navProvider || 'google')
    : null

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Restaurant photo */}
      {rec.photos && rec.photos.length > 0 && (
        <img
          src={rec.photos[0].startsWith('http') ? rec.photos[0] : `/api/food?action=photo&ref=${rec.photos[0]}&maxwidth=400`}
          alt={rec.name}
          className="w-full h-36 object-cover"
          loading="lazy"
        />
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-[14px] font-bold truncate" style={{ color: '#f1f3fc' }}>
              {rec.name}
            </h3>
            {rec.matchScore != null && (
              <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: rec.matchScore >= 80 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
                  color: rec.matchScore >= 80 ? '#f59e0b' : '#72757d',
                }}>
                {rec.matchScore}%
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: '#72757d' }}>{rec.reason}</p>
          {rec.dietaryMatch && (
            <div className="mt-1.5">
              <DietaryBadge text={rec.dietaryMatch} />
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-3 text-right">
          {rec.rating && (
            <div className="text-[11px] font-bold" style={{ color: '#f59e0b' }}>
              {rec.rating}
            </div>
          )}
          {rec.distance != null && (
            <div className="text-[9px] font-mono mt-0.5" style={{ color: '#52555c' }}>
              {formatDistance(rec.distance, cfg.distanceUnit || 'km')}
            </div>
          )}
        </div>
      </div>

      {/* Highlights */}
      {rec.highlights && rec.highlights.length > 0 && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {rec.highlights.map((tag, i) => (
            <span key={i} className="text-[9px] font-medium px-2 py-0.5 rounded"
              style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.1)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Dishes */}
      {rec.dishes && rec.dishes.length > 0 && (
        <div className="px-4 pb-3">
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)' }}>
            {rec.dishes.map((dish, i) => {
              const dishImg = dish.image
                || (rec.photos && rec.photos[i % rec.photos.length]
                  ? (rec.photos[i % rec.photos.length].startsWith('http')
                    ? rec.photos[i % rec.photos.length]
                    : `/api/food?action=photo&ref=${rec.photos[i % rec.photos.length]}&maxwidth=120`)
                  : null)
              return (
              <div key={i}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
              >
                {dishImg && (
                  <img src={dishImg} alt={dish.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium block truncate" style={{ color: '#e4e6ef' }}>{dish.emoji} {dish.name}</span>
                  {dish.desc && <span className="text-[10px] block truncate" style={{ color: '#72757d' }}>{dish.desc}</span>}
                </div>
                {dish.price != null && (
                  <span className="flex-shrink-0 text-[13px] font-mono font-bold ml-2" style={{ color: '#f59e0b' }}>
                    {cur}{dish.price}
                  </span>
                )}
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div>
          {rec.estimatedTotal != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: '#52555c' }}>{t('food.estimated_pp')}</span>
              <span className="text-[14px] font-bold font-mono" style={{ color: '#f59e0b' }}>
                {cur}{rec.estimatedTotal}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {navUrl && (
            <a href={navUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
              onClick={e => e.stopPropagation()}>
              <span className="material-symbols-outlined text-[13px]">navigation</span>
              {t('food.navigate')}
            </a>
          )}
          {onClick && (
            <button onClick={onClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#72757d' }}>
              <span className="material-symbols-outlined text-[13px]">info</span>
              {t('food.detail')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
